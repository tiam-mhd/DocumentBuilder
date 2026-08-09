import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvoiceStatus,
  PaymentProvider as PrismaPaymentProvider,
  PaymentStatus as PrismaPaymentStatus,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '@prisma/client';
import {
  AuditActions,
  BillingErrorCodes,
  SUBSCRIPTION_PERIOD_DAYS,
  type CheckoutSession,
  type PublicPayment,
  type PublicSubscription,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { EditionService } from '../../config/edition/edition.service';
import { PrismaService } from '../../config/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BILLING_ADAPTER, type BillingAdapter } from './adapters/billing-adapter.token';
import { SubscriptionService } from './subscription.service';
import { PaymentIdempotencyLock } from './payment/payment-idempotency.lock';
import { PAYMENT_PORT, type PaymentPort } from './payment/payment.port';

type LineItem = {
  type: 'plan' | 'module';
  code: string;
  amount: number;
};

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly edition: EditionService,
    private readonly subscriptions: SubscriptionService,
    private readonly config: ConfigService,
    private readonly lock: PaymentIdempotencyLock,
    private readonly audit: AuditService,
    @Inject(BILLING_ADAPTER) private readonly billingAdapter: BillingAdapter,
    @Inject(PAYMENT_PORT) private readonly paymentPort: PaymentPort,
  ) {}

  async startCheckout(input: {
    businessId: string;
    planCode: string;
    moduleCodes: string[];
    idempotencyKey?: string;
  }): Promise<CheckoutSession> {
    if (!this.edition.isSaas() || !this.billingAdapter.supportsCheckout()) {
      throw new DomainException(
        BillingErrorCodes.CheckoutUnavailable,
        'Platform checkout is only available in SAAS edition',
        HttpStatus.FORBIDDEN,
      );
    }

    if (input.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        if (existing.businessId !== input.businessId) {
          throw new DomainException(
            BillingErrorCodes.IdempotencyConflict,
            'Idempotency key already used for another business',
            HttpStatus.CONFLICT,
          );
        }
        if (existing.status === PrismaPaymentStatus.pending && existing.gatewayRef) {
          return this.toSession(existing);
        }
        if (existing.status === PrismaPaymentStatus.paid) {
          return this.toSession(existing);
        }
      }
    }

    const plan = await this.prisma.plan.findFirst({
      where: { code: input.planCode, isActive: true },
    });
    if (!plan) {
      throw new DomainException(
        BillingErrorCodes.PlanNotFound,
        `Plan not found: ${input.planCode}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const uniqueModuleCodes = [...new Set(input.moduleCodes)];
    const modules =
      uniqueModuleCodes.length === 0
        ? []
        : await this.prisma.catalogModule.findMany({
            where: { code: { in: uniqueModuleCodes }, isActive: true },
          });
    if (modules.length !== uniqueModuleCodes.length) {
      throw new DomainException(
        BillingErrorCodes.ModuleNotFound,
        'One or more modules were not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId: input.businessId },
    });
    if (!subscription) {
      throw new DomainException(
        'SUBSCRIPTION_NOT_FOUND',
        'Subscription not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const lineItems: LineItem[] = [
      { type: 'plan', code: plan.code, amount: plan.priceMonthly },
      ...modules.map((m) => ({
        type: 'module' as const,
        code: m.code,
        amount: m.priceMonthly,
      })),
    ];
    const amount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const currency = plan.currency;

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId: input.businessId,
        subscriptionId: subscription.id,
        planId: plan.id,
        status: InvoiceStatus.open,
        amount,
        currency,
        lineItems: {
          planCode: plan.code,
          moduleCodes: modules.map((m) => m.code),
          moduleIds: modules.map((m) => m.id),
          items: lineItems,
        },
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        businessId: input.businessId,
        invoiceId: invoice.id,
        provider: this.paymentPort.provider as PrismaPaymentProvider,
        status: PrismaPaymentStatus.pending,
        amount,
        currency,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    });

    const apiPublic = this.config.getOrThrow<string>('API_PUBLIC_URL');
    const callbackUrl = `${apiPublic}/billing/payments/callback`;

    const checkout = await this.paymentPort.createCheckout({
      amount,
      currency,
      description: `VDB ${plan.code} + ${modules.length} modules`,
      callbackUrl: `${callbackUrl}?paymentId=${payment.id}`,
      metadata: {
        paymentId: payment.id,
        businessId: input.businessId,
        invoiceId: invoice.id,
      },
    });

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayRef: checkout.gatewayRef },
    });

    return {
      paymentId: updated.id,
      invoiceId: invoice.id,
      amount: updated.amount,
      currency: updated.currency,
      provider: updated.provider,
      redirectUrl: checkout.redirectUrl,
      gatewayRef: updated.gatewayRef,
    };
  }

  /**
   * Gateway redirect (Zarinpal / fake) — verify + activate, then redirect to web.
   */
  async handleGatewayCallback(query: {
    paymentId?: string;
    Authority?: string;
    Status?: string;
  }): Promise<{ redirectUrl: string }> {
    const webOrigin = this.config.getOrThrow<string>('WEB_ORIGIN');
    const fail = (reason: string) => ({
      redirectUrl: `${webOrigin}/fa/app/billing/return?ok=0&reason=${encodeURIComponent(reason)}`,
    });

    if (!this.edition.isSaas()) {
      return fail('edition');
    }

    const gatewayRef = query.Authority?.trim();
    if (!gatewayRef) {
      return fail('missing_authority');
    }

    if (query.Status && query.Status.toUpperCase() !== 'OK') {
      await this.markFailedByGatewayRef(gatewayRef);
      return fail('canceled');
    }

    try {
      const result = await this.confirmByGatewayRef(gatewayRef, query.paymentId);
      return {
        redirectUrl: `${webOrigin}/fa/app/billing/return?ok=1&paymentId=${result.payment.id}&businessId=${result.payment.businessId}`,
      };
    } catch (err) {
      const code =
        err instanceof DomainException ? err.code : BillingErrorCodes.PaymentFailed;
      return fail(code);
    }
  }

  async getPaymentBusinessId(paymentId: string): Promise<string> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { businessId: true },
    });
    if (!payment) {
      throw new DomainException(
        BillingErrorCodes.PaymentNotFound,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return payment.businessId;
  }

  async confirmForMember(input: {
    paymentId: string;
    gatewayRef?: string;
  }): Promise<{ payment: PublicPayment; subscription: PublicSubscription }> {
    if (!this.edition.isSaas()) {
      throw new DomainException(
        BillingErrorCodes.CheckoutUnavailable,
        'Platform checkout is only available in SAAS edition',
        HttpStatus.FORBIDDEN,
      );
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: input.paymentId },
    });
    if (!payment) {
      throw new DomainException(
        BillingErrorCodes.PaymentNotFound,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const gatewayRef = input.gatewayRef ?? payment.gatewayRef;
    if (!gatewayRef) {
      throw new DomainException(
        BillingErrorCodes.PaymentFailed,
        'Payment has no gateway reference',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.confirmByGatewayRef(gatewayRef, payment.id);
  }

  /**
   * Server webhook-style confirm (idempotent on gatewayRef).
   */
  async confirmByGatewayRef(
    gatewayRef: string,
    paymentId?: string,
  ): Promise<{ payment: PublicPayment; subscription: PublicSubscription }> {
    const locked = await this.lock.acquire(gatewayRef);
    try {
      const payment = await this.prisma.payment.findFirst({
        where: paymentId
          ? { id: paymentId, gatewayRef }
          : { gatewayRef },
        include: { invoice: true },
      });
      if (!payment) {
        throw new DomainException(
          BillingErrorCodes.PaymentNotFound,
          'Payment not found for gateway reference',
          HttpStatus.NOT_FOUND,
        );
      }

      if (payment.status === PrismaPaymentStatus.paid) {
        const subscription = await this.subscriptions.getForBusiness(
          payment.businessId,
        );
        return { payment: this.toPublicPayment(payment), subscription };
      }

      if (payment.status !== PrismaPaymentStatus.pending) {
        throw new DomainException(
          BillingErrorCodes.PaymentFailed,
          `Payment is ${payment.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Concurrent webhook without Redis lock: wait briefly for the other txn.
      if (!locked) {
        await new Promise((r) => setTimeout(r, 200));
        const again = await this.prisma.payment.findUnique({
          where: { id: payment.id },
        });
        if (again?.status === PrismaPaymentStatus.paid) {
          const subscription = await this.subscriptions.getForBusiness(
            payment.businessId,
          );
          return { payment: this.toPublicPayment(again), subscription };
        }
      }

      const verified = await this.paymentPort.verifyPayment({
        gatewayRef,
        amount: payment.amount,
      });
      if (!verified.ok) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PrismaPaymentStatus.failed },
        });
        throw new DomainException(
          BillingErrorCodes.PaymentFailed,
          'Gateway verification failed',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const lineItems = payment.invoice.lineItems as {
        planCode?: string;
        moduleIds?: string[];
      };
      const moduleIds = Array.isArray(lineItems.moduleIds)
        ? lineItems.moduleIds
        : [];

      const now = new Date();
      const endsAt = new Date(now);
      endsAt.setUTCDate(endsAt.getUTCDate() + SUBSCRIPTION_PERIOD_DAYS);

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PrismaPaymentStatus.paid,
            providerRef: verified.providerRef ?? null,
            paidAt: now,
          },
        });
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: InvoiceStatus.paid },
        });
        await tx.subscriptionModule.deleteMany({
          where: { subscriptionId: payment.invoice.subscriptionId },
        });
        if (moduleIds.length > 0) {
          await tx.subscriptionModule.createMany({
            data: moduleIds.map((moduleId) => ({
              subscriptionId: payment.invoice.subscriptionId,
              moduleId,
            })),
          });
        }
        await tx.subscription.update({
          where: { id: payment.invoice.subscriptionId },
          data: {
            planId: payment.invoice.planId,
            status: PrismaSubscriptionStatus.active,
            startsAt: now,
            endsAt,
          },
        });
      });

      const paid = await this.prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      const subscription = await this.subscriptions.getForBusiness(
        payment.businessId,
      );

      await this.audit.log({
        action: AuditActions.BillingPaymentSucceeded,
        entityType: 'payment',
        entityId: paid.id,
        businessId: paid.businessId,
        userId: null,
        meta: {
          amount: paid.amount,
          currency: paid.currency,
          invoiceId: paid.invoiceId,
        },
      });

      return { payment: this.toPublicPayment(paid), subscription };
    } finally {
      if (locked) {
        await this.lock.release(gatewayRef);
      }
    }
  }

  private async markFailedByGatewayRef(gatewayRef: string): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { gatewayRef, status: PrismaPaymentStatus.pending },
      data: { status: PrismaPaymentStatus.canceled },
    });
  }

  private async toSession(payment: {
    id: string;
    invoiceId: string;
    amount: number;
    currency: string;
    provider: string;
    gatewayRef: string | null;
  }): Promise<CheckoutSession> {
    const webOrigin = this.config.getOrThrow<string>('WEB_ORIGIN');
    const redirectUrl =
      payment.gatewayRef != null
        ? `${webOrigin}/fa/app/billing/return?paymentId=${payment.id}&Authority=${encodeURIComponent(payment.gatewayRef)}&Status=OK`
        : `${webOrigin}/fa/app/billing/return?paymentId=${payment.id}`;

    // Prefer re-building gateway redirect when still pending with fake/zarinpal ref.
    if (payment.gatewayRef?.startsWith('fake_')) {
      return {
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        redirectUrl,
        gatewayRef: payment.gatewayRef,
      };
    }

    if (payment.gatewayRef) {
      const sandbox = this.config.getOrThrow<boolean>('ZARINPAL_SANDBOX');
      const start = sandbox
        ? 'https://sandbox.zarinpal.com/pg/StartPay'
        : 'https://www.zarinpal.com/pg/StartPay';
      return {
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        redirectUrl: `${start}/${payment.gatewayRef}`,
        gatewayRef: payment.gatewayRef,
      };
    }

    return {
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      redirectUrl,
      gatewayRef: payment.gatewayRef,
    };
  }

  private toPublicPayment(row: {
    id: string;
    businessId: string;
    invoiceId: string;
    status: string;
    amount: number;
    currency: string;
    provider: string;
    paidAt: Date | null;
  }): PublicPayment {
    return {
      id: row.id,
      businessId: row.businessId,
      invoiceId: row.invoiceId,
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      provider: row.provider,
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    };
  }
}
