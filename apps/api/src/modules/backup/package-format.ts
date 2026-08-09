import { randomBytes } from 'crypto';
import {
  BUSINESS_BACKUP_FORMAT_VERSION,
  BUSINESS_BACKUP_KIND,
  type BusinessBackupCounts,
  type BusinessBackupManifest,
} from '@vdb/shared-types';

export const BACKUP_MANIFEST_NAME = 'manifest.json';
export const BACKUP_PG_NAME = 'pg.json';
export const BACKUP_MONGO_NAME = 'mongo.json';

export type BackupPgPayload = {
  designThemes: Record<string, unknown>[];
  fontFaces: Record<string, unknown>[];
  mediaAssets: Record<string, unknown>[];
  templates: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  documentVersions: Record<string, unknown>[];
  documentComments: Record<string, unknown>[];
  projectCategories: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  branches: Record<string, unknown>[];
  teamMembers: Record<string, unknown>[];
  services: Record<string, unknown>[];
  clients: Record<string, unknown>[];
  certificates: Record<string, unknown>[];
  galleries: Record<string, unknown>[];
  galleryItems: Record<string, unknown>[];
  locations: Record<string, unknown>[];
  timelineEvents: Record<string, unknown>[];
};

export type BackupMongoPayload = {
  templateBodies: Record<string, unknown>[];
  documentBodies: Record<string, unknown>[];
  documentVersionBodies: Record<string, unknown>[];
};

export function emptyBackupCounts(): BusinessBackupCounts {
  return {
    designThemes: 0,
    fontFaces: 0,
    mediaAssets: 0,
    templates: 0,
    documents: 0,
    documentVersions: 0,
    documentComments: 0,
    projectCategories: 0,
    projects: 0,
    branches: 0,
    teamMembers: 0,
    services: 0,
    clients: 0,
    certificates: 0,
    galleries: 0,
    galleryItems: 0,
    locations: 0,
    timelineEvents: 0,
    templateBodies: 0,
    documentBodies: 0,
    documentVersionBodies: 0,
    mediaFiles: 0,
    fontFiles: 0,
  };
}

export function buildManifest(input: {
  businessId: string;
  name: string;
  counts: BusinessBackupCounts;
  createdAt?: string;
}): BusinessBackupManifest {
  return {
    kind: BUSINESS_BACKUP_KIND,
    formatVersion: BUSINESS_BACKUP_FORMAT_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    source: { businessId: input.businessId, name: input.name },
    counts: input.counts,
  };
}

export function parseManifest(raw: unknown): BusinessBackupManifest {
  if (!raw || typeof raw !== 'object') {
    throw new Error('manifest missing');
  }
  const m = raw as Record<string, unknown>;
  if (m.kind !== BUSINESS_BACKUP_KIND) {
    throw new Error('invalid package kind');
  }
  if (typeof m.formatVersion !== 'number') {
    throw new Error('formatVersion missing');
  }
  if (m.formatVersion > BUSINESS_BACKUP_FORMAT_VERSION) {
    throw new Error('unsupported formatVersion');
  }
  const source = m.source as { businessId?: string; name?: string } | undefined;
  if (!source?.businessId || typeof source.name !== 'string') {
    throw new Error('source missing');
  }
  const counts = (m.counts ?? emptyBackupCounts()) as BusinessBackupCounts;
  return {
    kind: BUSINESS_BACKUP_KIND,
    formatVersion: m.formatVersion,
    createdAt:
      typeof m.createdAt === 'string' ? m.createdAt : new Date().toISOString(),
    source: { businessId: source.businessId, name: source.name },
    counts,
  };
}

export function serializeRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (value === undefined) {
      continue;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function newEntityId(): string {
  return `c${Date.now().toString(36)}${randomBytes(10).toString('hex')}`;
}

export function remapId(
  map: Map<string, string>,
  oldId: string | null | undefined,
): string | null {
  if (!oldId) return null;
  const existing = map.get(oldId);
  if (existing) return existing;
  const next = newEntityId();
  map.set(oldId, next);
  return next;
}

export function extFromKey(storageKey: string): string {
  const base = storageKey.split('/').pop() ?? 'original.bin';
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot) : '';
}
