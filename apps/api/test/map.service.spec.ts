import { MapErrorCodes } from '@vdb/shared-types';
import { MapService } from '../src/modules/content/map.service';

describe('MapService', () => {
  function build() {
    const location = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'loc_1',
          name: 'تهران',
          lat: 35.7,
          lng: 51.4,
          country: 'IR',
        },
      ]),
    };
    const branch = { findMany: jest.fn().mockResolvedValue([]) };
    const project = { findMany: jest.fn().mockResolvedValue([]) };
    const prisma = { location, branch, project };
    return { service: new MapService(prisma as never), prisma };
  }

  it('lists location markers', async () => {
    const { service } = build();
    const list = await service.listMarkers({
      businessId: 'biz_1',
      source: 'locations',
    });
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.lat).toBe(35.7);
    expect(list.source).toBe('locations');
  });

  it('rejects invalid source', async () => {
    const { service } = build();
    await expect(
      service.listMarkers({ businessId: 'biz_1', source: 'bogus' }),
    ).rejects.toMatchObject({ code: MapErrorCodes.InvalidSource });
  });

  it('returns empty for source none', async () => {
    const { service } = build();
    const list = await service.listMarkers({
      businessId: 'biz_1',
      source: 'none',
    });
    expect(list.items).toEqual([]);
  });
});
