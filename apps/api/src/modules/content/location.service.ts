import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Location } from '@prisma/client';
import {
  LocationErrorCodes,
  type PublicLocation,
  type PublicLocationList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicLocationList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: Prisma.LocationWhereInput = {
      businessId: input.businessId,
      deletedAt: null,
    };
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { province: { contains: q, mode: 'insensitive' } },
        { country: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.location.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublic(r)),
      page,
      pageSize,
      total,
    };
  }

  async get(businessId: string, locationId: string): Promise<PublicLocation> {
    return this.toPublic(await this.requireLocation(businessId, locationId));
  }

  async create(input: {
    businessId: string;
    name: string;
    country?: string;
    province?: string;
    city?: string;
    address?: string;
    lat: number;
    lng: number;
  }): Promise<PublicLocation> {
    const name = this.requireName(input.name);
    const { lat, lng } = this.requireCoordinates(input.lat, input.lng);
    const row = await this.prisma.location.create({
      data: {
        businessId: input.businessId,
        name,
        country: (input.country ?? '').trim().slice(0, 120),
        province: (input.province ?? '').trim().slice(0, 120),
        city: (input.city ?? '').trim().slice(0, 120),
        address: (input.address ?? '').trim().slice(0, 400),
        lat,
        lng,
      },
    });
    return this.toPublic(row);
  }

  async update(input: {
    businessId: string;
    locationId: string;
    name?: string;
    country?: string;
    province?: string;
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
  }): Promise<PublicLocation> {
    const existing = await this.requireLocation(
      input.businessId,
      input.locationId,
    );
    const data: Prisma.LocationUpdateInput = {};
    if (input.name !== undefined) data.name = this.requireName(input.name);
    if (input.country !== undefined) {
      data.country = input.country.trim().slice(0, 120);
    }
    if (input.province !== undefined) {
      data.province = input.province.trim().slice(0, 120);
    }
    if (input.city !== undefined) data.city = input.city.trim().slice(0, 120);
    if (input.address !== undefined) {
      data.address = input.address.trim().slice(0, 400);
    }
    if (input.lat !== undefined || input.lng !== undefined) {
      const lat = input.lat !== undefined ? input.lat : existing.lat;
      const lng = input.lng !== undefined ? input.lng : existing.lng;
      const coords = this.requireCoordinates(lat, lng);
      data.lat = coords.lat;
      data.lng = coords.lng;
    }
    const row = await this.prisma.location.update({
      where: { id: input.locationId },
      data,
    });
    return this.toPublic(row);
  }

  async softDelete(businessId: string, locationId: string): Promise<void> {
    await this.requireLocation(businessId, locationId);
    const [projectCount, branchCount] = await Promise.all([
      this.prisma.project.count({
        where: { businessId, locationId, deletedAt: null },
      }),
      this.prisma.branch.count({
        where: { businessId, locationId, deletedAt: null },
      }),
    ]);
    if (projectCount + branchCount > 0) {
      throw new DomainException(
        LocationErrorCodes.InUse,
        'Location is still linked to projects or branches',
        HttpStatus.CONFLICT,
      );
    }
    await this.prisma.location.update({
      where: { id: locationId },
      data: { deletedAt: new Date() },
    });
  }

  /** Resolve optional location FK for same-business consumers. */
  async resolveOptionalId(
    businessId: string,
    locationId: string | null | undefined,
  ): Promise<string | null> {
    if (locationId === undefined || locationId === null || locationId === '') {
      return null;
    }
    await this.requireLocation(businessId, locationId);
    return locationId;
  }

  private requireName(raw: string): string {
    const name = raw.trim();
    if (name.length < 1 || name.length > 160) {
      throw new DomainException(
        LocationErrorCodes.InvalidName,
        'Location name is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return name;
  }

  private requireCoordinates(
    lat: number,
    lng: number,
  ): { lat: number; lng: number } {
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      throw new DomainException(
        LocationErrorCodes.InvalidCoordinates,
        'lat and lng must be finite numbers',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new DomainException(
        LocationErrorCodes.InvalidCoordinates,
        'lat must be in [-90,90] and lng in [-180,180]',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { lat, lng };
  }

  private async requireLocation(businessId: string, locationId: string) {
    const row = await this.prisma.location.findFirst({
      where: { id: locationId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        LocationErrorCodes.NotFound,
        'Location not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private toPublic(row: Location): PublicLocation {
    return {
      id: row.id,
      businessId: row.businessId,
      name: row.name,
      country: row.country,
      province: row.province,
      city: row.city,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
