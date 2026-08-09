import {
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { BillingErrorCodes, PlanCodes } from '@vdb/shared-types';
import { DomainException } from '../src/common/errors/domain.exception';
import { CheckoutService } from '../src/modules/billing/checkout.service';

describe('CheckoutService', () => {
  const editionSaas = {
    isSaas: () => true,
  };
  const editionSelfHosted = {
    isSaas: () => false,
  };
  const platformAdapter = {
    supportsCheckout: () => true,
    kind: 'platform',
    describe: () => 'platform',
  };
  const licenseAdapter = {
    supportsCheckout: () => false,
    kind: 'license',
    describe: () => 'license',
  };

  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  function buildPrisma(overrides: Record<string, unknown> = {}) {
    const payment = {
      id: 'pay_1',
      businessId: 'biz_1',
      invoiceId: 'inv_1',
      amount: 990000,
      currency: 'IRR',
      provider: PaymentProvider.fake,
      status: PaymentStatus.pending,
      gatewayRef: 'fake_abc',
      paidAt: null,
    };
    const invoice = {
      id: 'inv_1',
      subscriptionId: 'sub_1',
      planId: 'plan_1',
      lineItems: { moduleIds: ['mod_1'], planCode: PlanCodes.Core },
    };
    return {
      plan: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'plan_1',
          code: PlanCodes.Core,
          priceMonthly: 990000,
          currency: 'IRR',
        }),
      },
      catalogModule: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'mod_1', code: 'module.map', priceMonthly: 290000 },
        ]),
      },
      subscription: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub_1' }),
        update: jest.fn(),
      },
      invoice: {
        create: jest.fn().mockResolvedValue(invoice),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ ...payment, gatewayRef: null }),
        update: jest.fn().mockResolvedValue(payment),
        findUnique: jest.fn().mockResolvedValue(payment),
        findFirst: jest.fn().mockResolvedValue({ ...payment, invoice }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...payment,
          status: PaymentStatus.paid,
          paidAt: new Date(),
        }),
        updateMany: jest.fn(),
      },
      subscriptionModule: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          payment: { update: jest.fn() },
          invoice: { update: jest.fn() },
          subscriptionModule: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
          subscription: { update: jest.fn() },
        };
        return fn(tx);
      }),
      ...overrides,
    };
  }

  it('rejects checkout when not SAAS', async () => {
    const service = new CheckoutService(
      buildPrisma() as never,
      editionSelfHosted as never,
      {} as never,
      { getOrThrow: jest.fn() } as never,
      { acquire: jest.fn(), release: jest.fn() } as never,
      audit as never,
      licenseAdapter as never,
      { provider: 'fake', createCheckout: jest.fn(), verifyPayment: jest.fn() } as never,
    );

    await expect(
      service.startCheckout({
        businessId: 'biz_1',
        planCode: PlanCodes.Core,
        moduleCodes: [],
      }),
    ).rejects.toMatchObject({
      code: BillingErrorCodes.CheckoutUnavailable,
    });
  });

  it('starts checkout and returns redirectUrl', async () => {
    const paymentPort = {
      provider: 'fake' as const,
      createCheckout: jest.fn().mockResolvedValue({
        gatewayRef: 'fake_abc',
        redirectUrl: 'http://callback?Authority=fake_abc&Status=OK',
      }),
      verifyPayment: jest.fn(),
    };
    const prisma = buildPrisma();
    const service = new CheckoutService(
      prisma as never,
      editionSaas as never,
      {} as never,
      {
        getOrThrow: (key: string) => {
          if (key === 'API_PUBLIC_URL') return 'http://localhost:3001/api';
          if (key === 'WEB_ORIGIN') return 'http://localhost:3000';
          return '';
        },
      } as never,
      { acquire: jest.fn(), release: jest.fn() } as never,
      audit as never,
      platformAdapter as never,
      paymentPort as never,
    );

    const session = await service.startCheckout({
      businessId: 'biz_1',
      planCode: PlanCodes.Core,
      moduleCodes: ['module.map'],
    });

    expect(session.paymentId).toBe('pay_1');
    expect(session.redirectUrl).toContain('Authority=fake_abc');
    expect(paymentPort.createCheckout).toHaveBeenCalled();
    expect(prisma.invoice.create).toHaveBeenCalled();
  });

  it('activates subscription on verified confirm (idempotent when already paid)', async () => {
    const subscriptions = {
      getForBusiness: jest.fn().mockResolvedValue({
        id: 'sub_1',
        businessId: 'biz_1',
        status: 'active',
        effectiveStatus: 'active',
        writable: true,
      }),
    };
    const paymentPort = {
      provider: 'fake' as const,
      createCheckout: jest.fn(),
      verifyPayment: jest.fn().mockResolvedValue({
        ok: true,
        providerRef: 'ref_1',
      }),
    };
    const prisma = buildPrisma();
    const service = new CheckoutService(
      prisma as never,
      editionSaas as never,
      subscriptions as never,
      { getOrThrow: () => 'http://localhost:3000' } as never,
      {
        acquire: jest.fn().mockResolvedValue(true),
        release: jest.fn(),
      } as never,
      audit as never,
      platformAdapter as never,
      paymentPort as never,
    );

    const first = await service.confirmByGatewayRef('fake_abc', 'pay_1');
    expect(first.subscription.status).toBe('active');
    expect(prisma.$transaction).toHaveBeenCalled();

    // Second call: already paid short-circuit
    prisma.payment.findFirst = jest.fn().mockResolvedValue({
      id: 'pay_1',
      businessId: 'biz_1',
      invoiceId: 'inv_1',
      amount: 990000,
      currency: 'IRR',
      provider: PaymentProvider.fake,
      status: PaymentStatus.paid,
      gatewayRef: 'fake_abc',
      paidAt: new Date(),
      invoice: {
        id: 'inv_1',
        subscriptionId: 'sub_1',
        planId: 'plan_1',
        lineItems: { moduleIds: [] },
      },
    });
    const second = await service.confirmByGatewayRef('fake_abc', 'pay_1');
    expect(second.payment.status).toBe(PaymentStatus.paid);
    expect(paymentPort.verifyPayment).toHaveBeenCalledTimes(1);
  });

  it('throws DomainException when verification fails', async () => {
    const paymentPort = {
      provider: 'fake' as const,
      createCheckout: jest.fn(),
      verifyPayment: jest.fn().mockResolvedValue({ ok: false }),
    };
    const prisma = buildPrisma();
    const service = new CheckoutService(
      prisma as never,
      editionSaas as never,
      {} as never,
      { getOrThrow: () => 'x' } as never,
      {
        acquire: jest.fn().mockResolvedValue(true),
        release: jest.fn(),
      } as never,
      audit as never,
      platformAdapter as never,
      paymentPort as never,
    );

    await expect(
      service.confirmByGatewayRef('fake_abc', 'pay_1'),
    ).rejects.toBeInstanceOf(DomainException);
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: { status: PaymentStatus.failed },
    });
  });
});
