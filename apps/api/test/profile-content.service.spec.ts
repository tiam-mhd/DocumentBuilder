import { ProfileContentErrorCodes } from '@vdb/shared-types';
import { ProfileContentService } from '../src/modules/content/profile-content.service';

describe('ProfileContentService', () => {
  function build(overrides?: { mediaFindFirst?: jest.Mock }) {
    const stamp = () => ({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });
    const businessService = {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'svc_1',
          ...data,
          ...stamp(),
        }),
      ),
      update: jest.fn(),
    };
    const client = {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'cli_1',
          ...data,
          ...stamp(),
        }),
      ),
      update: jest.fn(),
    };
    const certificate = {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'cert_1',
          ...data,
          ...stamp(),
        }),
      ),
      update: jest.fn(),
    };
    const mediaAsset = {
      findFirst:
        overrides?.mediaFindFirst ??
        jest.fn().mockResolvedValue({ id: 'media_1' }),
    };
    const prisma = { businessService, client, certificate, mediaAsset };
    return {
      service: new ProfileContentService(prisma as never),
      prisma,
    };
  }

  it('creates service, client, and certificate with media', async () => {
    const { service, prisma } = build();
    const svc = await service.createService({
      businessId: 'biz_1',
      name: 'مشاوره',
      description: 'طراحی',
      iconMediaId: 'media_1',
    });
    expect(svc.name).toBe('مشاوره');
    expect(prisma.businessService.create).toHaveBeenCalled();

    const cli = await service.createClient({
      businessId: 'biz_1',
      name: 'شرکت الف',
      website: 'https://a.example',
      logoMediaId: 'media_1',
    });
    expect(cli.logoMediaId).toBe('media_1');

    const cert = await service.createCertificate({
      businessId: 'biz_1',
      name: 'ISO 9001',
      issuer: 'IMQ',
      issuedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2027-01-01T00:00:00.000Z',
      documentMediaId: 'media_1',
    });
    expect(cert.issuer).toBe('IMQ');
    expect(cert.issuedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('rejects unknown media for logo', async () => {
    const { service } = build({
      mediaFindFirst: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.createClient({
        businessId: 'biz_1',
        name: 'x',
        logoMediaId: 'missing',
      }),
    ).rejects.toMatchObject({ code: ProfileContentErrorCodes.MediaNotFound });
  });

  it('rejects expiresAt before issuedAt', async () => {
    const { service } = build();
    await expect(
      service.createCertificate({
        businessId: 'biz_1',
        name: 'ISO',
        issuedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2025-01-01T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: ProfileContentErrorCodes.InvalidDate });
  });
});
