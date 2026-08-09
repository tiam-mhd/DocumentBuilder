import { HttpStatus, Injectable } from '@nestjs/common';
import { MapErrorCodes, type PublicMapMarkerList } from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

const SOURCES = ['locations', 'branches', 'projects', 'none'] as const;
type MarkerSource = (typeof SOURCES)[number];

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  async listMarkers(input: {
    businessId: string;
    source?: string;
    country?: string;
  }): Promise<PublicMapMarkerList> {
    const source = this.parseSource(input.source ?? 'locations');
    const countryRestriction = input.country?.trim().toUpperCase() || null;

    if (source === 'none') {
      return { items: [], source, countryRestriction };
    }

    if (source === 'locations') {
      const rows = await this.prisma.location.findMany({
        where: {
          businessId: input.businessId,
          deletedAt: null,
          ...(countryRestriction
            ? { country: { equals: countryRestriction, mode: 'insensitive' } }
            : {}),
        },
        orderBy: { name: 'asc' },
        take: 500,
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          country: r.country,
          source: 'locations',
        })),
        source,
        countryRestriction,
      };
    }

    if (source === 'branches') {
      const rows = await this.prisma.branch.findMany({
        where: {
          businessId: input.businessId,
          deletedAt: null,
          locationId: { not: null },
          location: {
            deletedAt: null,
            ...(countryRestriction
              ? {
                  country: {
                    equals: countryRestriction,
                    mode: 'insensitive',
                  },
                }
              : {}),
          },
        },
        include: { location: true },
        orderBy: { name: 'asc' },
        take: 500,
      });
      return {
        items: rows
          .filter((r) => r.location)
          .map((r) => ({
            id: r.location!.id,
            name: r.name,
            lat: r.location!.lat,
            lng: r.location!.lng,
            country: r.location!.country,
            source: 'branches',
          })),
        source,
        countryRestriction,
      };
    }

    // projects
    const rows = await this.prisma.project.findMany({
      where: {
        businessId: input.businessId,
        deletedAt: null,
        locationId: { not: null },
        location: {
          deletedAt: null,
          ...(countryRestriction
            ? {
                country: {
                  equals: countryRestriction,
                  mode: 'insensitive',
                },
              }
            : {}),
        },
      },
      include: { location: true },
      orderBy: { title: 'asc' },
      take: 500,
    });
    return {
      items: rows
        .filter((r) => r.location)
        .map((r) => ({
          id: r.location!.id,
          name: r.title,
          lat: r.location!.lat,
          lng: r.location!.lng,
          country: r.location!.country,
          source: 'projects',
        })),
      source,
      countryRestriction,
    };
  }

  private parseSource(raw: string): MarkerSource {
    if ((SOURCES as readonly string[]).includes(raw)) {
      return raw as MarkerSource;
    }
    throw new DomainException(
      MapErrorCodes.InvalidSource,
      'Invalid map markers source',
      HttpStatus.BAD_REQUEST,
    );
  }
}
