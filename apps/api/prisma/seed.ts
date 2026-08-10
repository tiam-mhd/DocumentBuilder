import { PrismaClient } from '@prisma/client';
import { createEmptyTemplateBody } from '@vdb/document-schema';
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
      baseEntitlements: [
        EntitlementCodes.ExportPdf,
        EntitlementCodes.MarketplaceTemplates,
      ],
      isActive: true,
    },
    create: {
      code: PlanCodes.Core,
      nameKey: 'plans.core.name',
      descriptionKey: 'plans.core.description',
      priceMonthly: 990_000,
      currency: 'IRR',
      baseEntitlements: [
        EntitlementCodes.ExportPdf,
        EntitlementCodes.MarketplaceTemplates,
      ],
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
    {
      code: EntitlementCodes.ModuleGallery,
      nameKey: 'modules.gallery.name',
      descriptionKey: 'modules.gallery.description',
      priceMonthly: 150_000,
    },
    {
      code: EntitlementCodes.BrandingWhiteLabel,
      nameKey: 'modules.whiteLabel.name',
      descriptionKey: 'modules.whiteLabel.description',
      priceMonthly: 390_000,
    },
    {
      code: EntitlementCodes.MarketplaceTemplates,
      nameKey: 'modules.marketplace.name',
      descriptionKey: 'modules.marketplace.description',
      priceMonthly: 0,
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

  const companyProfileBodyFa = createEmptyTemplateBody(
    '_marketplace',
    'seed-company-profile-fa',
  );
  const companyProfileBodyEn = createEmptyTemplateBody(
    '_marketplace',
    'seed-company-profile-en',
  );

  await prisma.marketplaceTemplate.upsert({
    where: { slug: 'company-profile-fa' },
    update: {
      name: 'پروفایل شرکت',
      description: 'قالب ساده معرفی کسب‌وکار (اسکلت مارکت‌پلیس)',
      locale: 'fa',
      body: companyProfileBodyFa,
      isActive: true,
      sortOrder: 10,
    },
    create: {
      slug: 'company-profile-fa',
      name: 'پروفایل شرکت',
      description: 'قالب ساده معرفی کسب‌وکار (اسکلت مارکت‌پلیس)',
      locale: 'fa',
      body: companyProfileBodyFa,
      isActive: true,
      sortOrder: 10,
    },
  });

  await prisma.marketplaceTemplate.upsert({
    where: { slug: 'company-profile-en' },
    update: {
      name: 'Company profile',
      description: 'Simple company intro template (marketplace skeleton)',
      locale: 'en',
      body: companyProfileBodyEn,
      isActive: true,
      sortOrder: 20,
    },
    create: {
      slug: 'company-profile-en',
      name: 'Company profile',
      description: 'Simple company intro template (marketplace skeleton)',
      locale: 'en',
      body: companyProfileBodyEn,
      isActive: true,
      sortOrder: 20,
    },
  });

  console.log(
    `Seeded plan ${core.code} + ${seeded.length} modules + marketplace samples (export.pdf in base entitlements)`,
  );

  const adminMobiles = String(process.env.PLATFORM_ADMIN_MOBILES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  let adminCount = 0;
  for (const mobile of adminMobiles) {
    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user) continue;
    await prisma.platformAdmin.upsert({
      where: { userId: user.id },
      create: { userId: user.id, note: 'seed PLATFORM_ADMIN_MOBILES' },
      update: {},
    });
    adminCount += 1;
  }
  if (adminMobiles.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `Platform admins upserted for ${adminCount}/${adminMobiles.length} mobiles`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
