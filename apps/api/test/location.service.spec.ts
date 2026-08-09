import { LocationErrorCodes } from '@vdb/shared-types';
import { LocationService } from '../src/modules/content/location.service';

describe('LocationService', () => {
  function build() {
    const stamp = () => ({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });
    const location = {
      findFirst: jest.fn().mockResolvedValue({
        id: 'loc_1',
        businessId: 'biz_1',
        name: 'دفتر مرکزی',
        country: 'IR',
        province: 'تهران',
        city: 'تهران',
        address: 'خیابان ۱',
        lat: 35.7,
        lng: 51.4,
        ...stamp(),
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'loc_1',
          ...data,
          ...stamp(),
        }),
      ),
      update: jest.fn(),
    };
    const project = { count: jest.fn().mockResolvedValue(0) };
    const branch = { count: jest.fn().mockResolvedValue(0) };
    const prisma = { location, project, branch };
    return { service: new LocationService(prisma as never), prisma };
  }

  it('creates location with valid coordinates', async () => {
    const { service } = build();
    const loc = await service.create({
      businessId: 'biz_1',
      name: 'کارخانه',
      city: 'اصفهان',
      lat: 32.65,
      lng: 51.67,
    });
    expect(loc.name).toBe('کارخانه');
    expect(loc.lat).toBe(32.65);
  });

  it('rejects out-of-range lat', async () => {
    const { service } = build();
    await expect(
      service.create({
        businessId: 'biz_1',
        name: 'x',
        lat: 120,
        lng: 10,
      }),
    ).rejects.toMatchObject({
      code: LocationErrorCodes.InvalidCoordinates,
    });
  });

  it('blocks delete when linked to project', async () => {
    const { service, prisma } = build();
    prisma.project.count = jest.fn().mockResolvedValue(1);
    await expect(service.softDelete('biz_1', 'loc_1')).rejects.toMatchObject({
      code: LocationErrorCodes.InUse,
    });
  });
});
