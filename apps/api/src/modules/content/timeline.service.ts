import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type TimelineEvent } from '@prisma/client';
import {
  asEntityTranslations,
  pickLocalized,
  parseContentLocale,
  TimelineErrorCodes,
  type PublicTimelineEvent,
  type PublicTimelineEventList,
} from '@vdb/shared-types';
import {
  parseTranslationsInput,
  translationsToJson,
} from '../../common/content-locale';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../config/prisma/prisma.service';

const MAX_BODY = 8000;
const MAX_FIELDS_KEYS = 40;
const MAX_FIELD_STRING = 4000;
const EVENT_TRANSLATION_FIELDS = ['title', 'body'] as const;

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: {
    businessId: string;
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<PublicTimelineEventList> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(100, Math.max(1, input.pageSize));
    const where: Prisma.TimelineEventWhereInput = {
      businessId: input.businessId,
      deletedAt: null,
    };
    const q = input.q?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.timelineEvent.findMany({
        where,
        orderBy: [
          { occurredAt: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.timelineEvent.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.toPublic(r)),
      page,
      pageSize,
      total,
    };
  }

  /** Newest-first slice for document/PDF blocks. */
  async listForBlock(input: {
    businessId: string;
    limit: number;
    locale?: string;
  }): Promise<PublicTimelineEvent[]> {
    const limit = Math.min(100, Math.max(1, input.limit));
    const locale = parseContentLocale(input.locale);
    const rows = await this.prisma.timelineEvent.findMany({
      where: { businessId: input.businessId, deletedAt: null },
      orderBy: [
        { occurredAt: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    });
    return rows.map((r) => {
      const pub = this.toPublic(r);
      const loc = pickLocalized(
        { title: pub.title, body: pub.body },
        r.translations,
        locale,
        EVENT_TRANSLATION_FIELDS,
      );
      return { ...pub, title: loc.title, body: loc.body };
    });
  }

  async get(businessId: string, eventId: string): Promise<PublicTimelineEvent> {
    return this.toPublic(await this.requireEvent(businessId, eventId));
  }

  async create(input: {
    businessId: string;
    occurredAt: string;
    title: string;
    body?: string;
    mediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: Record<string, unknown>;
  }): Promise<PublicTimelineEvent> {
    const title = this.requireTitle(input.title);
    const occurredAt = this.parseDate(input.occurredAt);
    const mediaId = await this.resolveOptionalMedia(
      input.businessId,
      input.mediaId,
    );
    const row = await this.prisma.timelineEvent.create({
      data: {
        businessId: input.businessId,
        occurredAt,
        title,
        body: (input.body ?? '').trim().slice(0, MAX_BODY),
        mediaId,
        sortOrder: input.sortOrder ?? 0,
        fields: this.normalizeFields(input.fields ?? {}) as Prisma.InputJsonValue,
        translations: translationsToJson(
          parseTranslationsInput(input.translations, EVENT_TRANSLATION_FIELDS),
        ),
      },
    });
    return this.toPublic(row);
  }

  async update(input: {
    businessId: string;
    eventId: string;
    occurredAt?: string;
    title?: string;
    body?: string;
    mediaId?: string | null;
    sortOrder?: number;
    fields?: Record<string, unknown>;
    translations?: Record<string, unknown>;
  }): Promise<PublicTimelineEvent> {
    await this.requireEvent(input.businessId, input.eventId);
    const data: Prisma.TimelineEventUpdateInput = {};
    if (input.title !== undefined) data.title = this.requireTitle(input.title);
    if (input.occurredAt !== undefined) {
      data.occurredAt = this.parseDate(input.occurredAt);
    }
    if (input.body !== undefined) {
      data.body = input.body.trim().slice(0, MAX_BODY);
    }
    if (input.mediaId !== undefined) {
      data.mediaId = await this.resolveOptionalMedia(
        input.businessId,
        input.mediaId,
      );
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.fields !== undefined) {
      data.fields = this.normalizeFields(
        input.fields,
      ) as Prisma.InputJsonValue;
    }
    if (input.translations !== undefined) {
      data.translations = translationsToJson(
        parseTranslationsInput(input.translations, EVENT_TRANSLATION_FIELDS),
      );
    }
    const row = await this.prisma.timelineEvent.update({
      where: { id: input.eventId },
      data,
    });
    return this.toPublic(row);
  }

  async softDelete(businessId: string, eventId: string): Promise<void> {
    await this.requireEvent(businessId, eventId);
    await this.prisma.timelineEvent.update({
      where: { id: eventId },
      data: { deletedAt: new Date() },
    });
  }

  private async requireEvent(businessId: string, eventId: string) {
    const row = await this.prisma.timelineEvent.findFirst({
      where: { id: eventId, businessId, deletedAt: null },
    });
    if (!row) {
      throw new DomainException(
        TimelineErrorCodes.NotFound,
        'Timeline event not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return row;
  }

  private requireTitle(raw: string): string {
    const title = raw.trim();
    if (title.length < 1 || title.length > 200) {
      throw new DomainException(
        TimelineErrorCodes.InvalidTitle,
        'Timeline event title is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return title;
  }

  private parseDate(raw: string): Date {
    const trimmed = raw.trim();
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
      throw new DomainException(
        TimelineErrorCodes.InvalidDate,
        'Timeline event date is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
    return d;
  }

  private async resolveOptionalMedia(
    businessId: string,
    mediaId: string | null | undefined,
  ): Promise<string | null> {
    if (mediaId === undefined || mediaId === null || mediaId === '') {
      return null;
    }
    const row = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!row) {
      throw new DomainException(
        TimelineErrorCodes.MediaNotFound,
        'Media asset not found for this business',
        HttpStatus.BAD_REQUEST,
      );
    }
    return mediaId;
  }

  private normalizeFields(
    fields: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      throw new DomainException(
        TimelineErrorCodes.InvalidFields,
        'fields must be an object',
        HttpStatus.BAD_REQUEST,
      );
    }
    const keys = Object.keys(fields);
    if (keys.length > MAX_FIELDS_KEYS) {
      throw new DomainException(
        TimelineErrorCodes.InvalidFields,
        'Too many field keys',
        HttpStatus.BAD_REQUEST,
      );
    }
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(key)) {
        throw new DomainException(
          TimelineErrorCodes.InvalidFields,
          `Invalid field key: ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const value = fields[key];
      if (
        value === null ||
        typeof value === 'boolean' ||
        typeof value === 'number'
      ) {
        out[key] = value;
      } else if (typeof value === 'string') {
        out[key] = value.slice(0, MAX_FIELD_STRING);
      } else {
        throw new DomainException(
          TimelineErrorCodes.InvalidFields,
          `Unsupported field type for ${key}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return out;
  }

  private toPublic(row: TimelineEvent): PublicTimelineEvent {
    return {
      id: row.id,
      businessId: row.businessId,
      occurredAt: row.occurredAt.toISOString(),
      title: row.title,
      body: row.body,
      translations: asEntityTranslations(row.translations),
      mediaId: row.mediaId,
      sortOrder: row.sortOrder,
      fields:
        row.fields &&
        typeof row.fields === 'object' &&
        !Array.isArray(row.fields)
          ? (row.fields as Record<string, unknown>)
          : {},
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
