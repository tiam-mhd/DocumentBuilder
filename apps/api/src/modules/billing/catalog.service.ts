import { Injectable } from '@nestjs/common';
import type {
  BillingCatalog,
  PublicCatalogModule,
  PublicPlan,
} from '@vdb/shared-types';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(): Promise<BillingCatalog> {
    const [plans, modules] = await Promise.all([
      this.prisma.plan.findMany({
        where: { isActive: true },
        include: { planModules: { include: { module: true } } },
        orderBy: { code: 'asc' },
      }),
      this.prisma.catalogModule.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    return {
      plans: plans.map((plan) => this.toPlan(plan)),
      modules: modules.map((mod) => this.toModule(mod)),
    };
  }

  private toPlan(plan: {
    id: string;
    code: string;
    nameKey: string;
    descriptionKey: string;
    priceMonthly: number;
    currency: string;
    baseEntitlements: unknown;
    planModules: { module: { code: string } }[];
  }): PublicPlan {
    const base = Array.isArray(plan.baseEntitlements)
      ? (plan.baseEntitlements as string[])
      : [];
    return {
      id: plan.id,
      code: plan.code,
      nameKey: plan.nameKey,
      descriptionKey: plan.descriptionKey,
      priceMonthly: plan.priceMonthly,
      currency: plan.currency,
      baseEntitlements: base,
      moduleCodes: plan.planModules.map((pm) => pm.module.code),
    };
  }

  private toModule(mod: {
    id: string;
    code: string;
    nameKey: string;
    descriptionKey: string;
    priceMonthly: number;
    currency: string;
  }): PublicCatalogModule {
    return {
      id: mod.id,
      code: mod.code,
      nameKey: mod.nameKey,
      descriptionKey: mod.descriptionKey,
      priceMonthly: mod.priceMonthly,
      currency: mod.currency,
    };
  }
}
