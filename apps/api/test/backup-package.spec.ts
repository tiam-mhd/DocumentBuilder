import JSZip from 'jszip';
import {
  BUSINESS_BACKUP_FORMAT_VERSION,
  BUSINESS_BACKUP_KIND,
} from '@vdb/shared-types';
import {
  BACKUP_MANIFEST_NAME,
  BACKUP_MONGO_NAME,
  BACKUP_PG_NAME,
  buildManifest,
  emptyBackupCounts,
  parseManifest,
} from '../src/modules/backup/package-format';

describe('business backup package format (ADR 024)', () => {
  it('builds and parses manifest v1', () => {
    const counts = emptyBackupCounts();
    counts.documents = 2;
    counts.mediaAssets = 1;
    const manifest = buildManifest({
      businessId: 'biz_1',
      name: 'Acme',
      counts,
    });
    expect(manifest.kind).toBe(BUSINESS_BACKUP_KIND);
    expect(manifest.formatVersion).toBe(BUSINESS_BACKUP_FORMAT_VERSION);
    expect(parseManifest(manifest).source.name).toBe('Acme');
  });

  it('round-trips a minimal ZIP (manifest + pg + mongo)', async () => {
    const counts = emptyBackupCounts();
    counts.documents = 1;
    counts.documentBodies = 1;
    const manifest = buildManifest({
      businessId: 'biz_src',
      name: 'Source Co',
      counts,
    });
    const pg = {
      designThemes: [],
      fontFaces: [],
      mediaAssets: [],
      templates: [],
      documents: [
        {
          id: 'doc_1',
          businessId: 'biz_src',
          title: 'Hello',
          status: 'draft',
          locale: 'fa',
          templateId: null,
        },
      ],
      documentVersions: [],
      documentComments: [],
      projectCategories: [],
      projects: [],
      branches: [],
      teamMembers: [],
      services: [],
      clients: [],
      certificates: [],
      galleries: [],
      galleryItems: [],
      locations: [],
      timelineEvents: [],
    };
    const mongo = {
      templateBodies: [],
      documentBodies: [
        {
          schemaVersion: 3,
          businessId: 'biz_src',
          documentId: 'doc_1',
          title: 'Hello',
          pages: [],
          masters: [],
        },
      ],
      documentVersionBodies: [],
    };

    const zip = new JSZip();
    zip.file(BACKUP_MANIFEST_NAME, JSON.stringify(manifest));
    zip.file(BACKUP_PG_NAME, JSON.stringify(pg));
    zip.file(BACKUP_MONGO_NAME, JSON.stringify(mongo));
    const buf = await zip.generateAsync({ type: 'nodebuffer' });

    const loaded = await JSZip.loadAsync(buf);
    const parsed = parseManifest(
      JSON.parse(await loaded.file(BACKUP_MANIFEST_NAME)!.async('string')),
    );
    const pgOut = JSON.parse(await loaded.file(BACKUP_PG_NAME)!.async('string'));
    const mongoOut = JSON.parse(
      await loaded.file(BACKUP_MONGO_NAME)!.async('string'),
    );

    expect(parsed.source.businessId).toBe('biz_src');
    expect(pgOut.documents).toHaveLength(1);
    expect(mongoOut.documentBodies[0].documentId).toBe('doc_1');
  });

  it('rejects wrong kind', () => {
    expect(() =>
      parseManifest({ kind: 'other', formatVersion: 1, source: {} }),
    ).toThrow(/kind/i);
  });
});
