import { HttpStatus, Injectable } from '@nestjs/common';
import {
  REPEATER_SOURCES,
  type RepeaterSource,
} from '@vdb/document-schema';
import {
  CollectionErrorCodes,
  parseContentLocale,
  pickLocalized,
  type ContentLocale,
  type PublicCollectionItem,
  type PublicCollectionList,
} from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: {
    businessId: string;
    source: string;
    limit?: number;
    locale?: string;
  }): Promise<PublicCollectionList> {
    const source = this.parseSource(input.source);
    const limit = Math.min(100, Math.max(1, input.limit ?? 50));
    const locale = parseContentLocale(input.locale);
    const [items, total] = await Promise.all([
      this.loadItems(input.businessId, source, limit, locale),
      this.countSource(input.businessId, source),
    ]);
    return { source, items, total };
  }

  async count(businessId: string, source: string): Promise<number> {
    const parsed = this.parseSource(source);
    return this.countSource(businessId, parsed);
  }

  private async countSource(
    businessId: string,
    source: RepeaterSource,
  ): Promise<number> {
    const where = { businessId, deletedAt: null };
    switch (source) {
      case 'projects':
        return this.prisma.project.count({ where });
      case 'teamMembers':
        return this.prisma.teamMember.count({ where });
      case 'branches':
        return this.prisma.branch.count({ where });
      case 'services':
        return this.prisma.businessService.count({ where });
      case 'clients':
        return this.prisma.client.count({ where });
      case 'certificates':
        return this.prisma.certificate.count({ where });
      case 'timelineEvents':
        return this.prisma.timelineEvent.count({ where });
      default: {
        const _exhaustive: never = source;
        void _exhaustive;
        return 0;
      }
    }
  }

  private parseSource(raw: string): RepeaterSource {
    if ((REPEATER_SOURCES as readonly string[]).includes(raw)) {
      return raw as RepeaterSource;
    }
    throw new DomainException(
      CollectionErrorCodes.InvalidSource,
      'Invalid collection source',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async loadItems(
    businessId: string,
    source: RepeaterSource,
    limit: number,
    locale: ContentLocale,
  ): Promise<PublicCollectionItem[]> {
    switch (source) {
      case 'projects': {
        const rows = await this.prisma.project.findMany({
          where: { businessId, deletedAt: null },
          orderBy: [{ createdAt: 'desc' }],
          take: limit,
        });
        return rows.map((r) => {
          const loc = pickLocalized(
            { title: r.title, description: r.description },
            r.translations,
            locale,
            ['title', 'description'],
          );
          return {
            id: r.id,
            values: {
              title: loc.title,
              description: loc.description,
              status: r.status,
            },
          };
        });
      }
      case 'teamMembers': {
        const rows = await this.prisma.teamMember.findMany({
          where: { businessId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: limit,
        });
        return rows.map((r) => {
          const loc = pickLocalized(
            {
              name: r.name,
              roleTitle: r.roleTitle,
              department: r.department,
            },
            r.translations,
            locale,
            ['name', 'roleTitle', 'department'],
          );
          return {
            id: r.id,
            values: {
              name: loc.name,
              roleTitle: loc.roleTitle,
              department: loc.department,
              title: loc.name,
            },
          };
        });
      }
      case 'branches': {
        const rows = await this.prisma.branch.findMany({
          where: { businessId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: limit,
        });
        return rows.map((r) => {
          const loc = pickLocalized(
            {
              name: r.name,
              addressLine1: r.addressLine1,
              city: r.city,
              country: r.country,
            },
            r.translations,
            locale,
            ['name', 'addressLine1', 'city', 'country'],
          );
          return {
            id: r.id,
            values: {
              name: loc.name,
              title: loc.name,
              city: loc.city,
              country: loc.country,
              phone: r.phone,
              addressLine1: loc.addressLine1,
            },
          };
        });
      }
      case 'services': {
        const rows = await this.prisma.businessService.findMany({
          where: { businessId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: limit,
        });
        return rows.map((r) => {
          const loc = pickLocalized(
            { name: r.name, description: r.description },
            r.translations,
            locale,
            ['name', 'description'],
          );
          return {
            id: r.id,
            values: {
              name: loc.name,
              title: loc.name,
              description: loc.description,
            },
          };
        });
      }
      case 'clients': {
        const rows = await this.prisma.client.findMany({
          where: { businessId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: limit,
        });
        return rows.map((r) => {
          const loc = pickLocalized(
            { name: r.name },
            r.translations,
            locale,
            ['name'],
          );
          return {
            id: r.id,
            values: {
              name: loc.name,
              title: loc.name,
              website: r.website ?? '',
            },
          };
        });
      }
      case 'certificates': {
        const rows = await this.prisma.certificate.findMany({
          where: { businessId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: limit,
        });
        return rows.map((r) => {
          const loc = pickLocalized(
            { name: r.name, issuer: r.issuer },
            r.translations,
            locale,
            ['name', 'issuer'],
          );
          return {
            id: r.id,
            values: {
              name: loc.name,
              title: loc.name,
              issuer: loc.issuer,
              issuedAt: r.issuedAt ? r.issuedAt.toISOString().slice(0, 10) : '',
              expiresAt: r.expiresAt
                ? r.expiresAt.toISOString().slice(0, 10)
                : '',
            },
          };
        });
      }
      case 'timelineEvents': {
        const rows = await this.prisma.timelineEvent.findMany({
          where: { businessId, deletedAt: null },
          orderBy: [{ occurredAt: 'desc' }, { sortOrder: 'asc' }],
          take: limit,
        });
        return rows.map((r) => {
          const loc = pickLocalized(
            { title: r.title, body: r.body },
            r.translations,
            locale,
            ['title', 'body'],
          );
          return {
            id: r.id,
            values: {
              title: loc.title,
              body: loc.body,
              description: loc.body,
              occurredAt: r.occurredAt.toISOString().slice(0, 10),
              date: r.occurredAt.toISOString().slice(0, 10),
            },
          };
        });
      }
      default: {
        const _exhaustive: never = source;
        void _exhaustive;
        return [];
      }
    }
  }
}
