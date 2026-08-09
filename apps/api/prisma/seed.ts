import { PrismaClient } from '@prisma/client';
import {
  EntitlementCodes,
  PlanCodes,
  MODULE_ENTITLEMENT_CODES,
} from '@vdb/shared-types';

const prisma = new PrismaClient();

async function main() {
  const core = await prisma.plan.upsert({
    where: { code: PlanCodes.Core },
    update: {
      nameKey: 'plans.core.name',
      descriptionKey: 'plans.core.description',
      priceMonthly: 990_000,
      currency: 'IRR',
      baseEntitlements: [EntitlementCodes.ExportPdf],
      isActive: true,
    },
    create: {
      code: PlanCodes.Core,
      nameKey: 'plans.core.name',
      descriptionKey: 'plans.core.description',
      priceMonthly: 990_000,
      currency: 'IRR',
      baseEntitlements: [EntitlementCodes.ExportPdf],
      isActive: true,
    },
  });

  const moduleDefs = [
    {
      code: EntitlementCodes.ModuleMap,
      nameKey: 'modules.map.name',
      descriptionKey: 'modules.map.description',
      priceMonthly: 290_000,
    },
    {
      code: EntitlementCodes.ModuleOrgChart,
      nameKey: 'modules.orgChart.name',
      descriptionKey: 'modules.orgChart.description',
      priceMonthly: 290_000,
    },
    {
      code: EntitlementCodes.ModuleTimeline,
      nameKey: 'modules.timeline.name',
      descriptionKey: 'modules.timeline.description',
      priceMonthly: 190_000,
    },
    {
      code: EntitlementCodes.ModuleProjects,
      nameKey: 'modules.projects.name',
      descriptionKey: 'modules.projects.description',
      priceMonthly: 190_000,
    },
  ] as const;

  for (const def of moduleDefs) {
    await prisma.catalogModule.upsert({
      where: { code: def.code },
      update: {
        nameKey: def.nameKey,
        descriptionKey: def.descriptionKey,
        priceMonthly: def.priceMonthly,
        currency: 'IRR',
        isActive: true,
      },
      create: {
        code: def.code,
        nameKey: def.nameKey,
        descriptionKey: def.descriptionKey,
        priceMonthly: def.priceMonthly,
        currency: 'IRR',
        isActive: true,
      },
    });
  }

  // Core plan does not bundle paid modules by default (add-ons).
  await prisma.planModule.deleteMany({ where: { planId: core.id } });

  // Sanity: seeded module codes match shared-types list.
  const seeded = await prisma.catalogModule.findMany({
    where: { code: { in: [...MODULE_ENTITLEMENT_CODES] } },
  });
  if (seeded.length !== MODULE_ENTITLEMENT_CODES.length) {
    throw new Error('Catalog module seed mismatch with shared-types');
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded plan ${core.code} + ${seeded.length} modules (export.pdf in base entitlements)`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
