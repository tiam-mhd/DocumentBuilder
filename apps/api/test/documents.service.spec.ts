import {
  DOCUMENT_SCHEMA_VERSION,
  createEmptyTemplateBody,
  parseDocumentBody,
} from '@vdb/document-schema';
import { DocumentErrorCodes } from '@vdb/shared-types';
import { DocumentsService } from '../src/modules/documents/documents.service';

describe('DocumentsService', () => {
  function build() {
    const templateBody = createEmptyTemplateBody('biz_1', 'tpl_1');
    const bodies = {
      ensureIndexes: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const templateBodies = {
      find: jest.fn().mockResolvedValue(templateBody),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      document: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'doc_1',
          businessId: data.businessId,
          templateId: data.templateId,
          title: data.title,
          status: data.status,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          deletedAt: null,
        })),
        update: jest.fn(),
        delete: jest.fn(),
      },
      documentTemplate: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tpl_1',
          businessId: 'biz_1',
          deletedAt: null,
        }),
      },
    };
    const entitlements = {
      assertModule: jest.fn().mockResolvedValue(undefined),
    };
    const versions = {
      deleteBodiesForDocument: jest.fn().mockResolvedValue(undefined),
      latestVersionNumber: jest.fn().mockResolvedValue(0),
    };
    const audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    const service = new DocumentsService(
      prisma as never,
      bodies as never,
      entitlements as never,
      templateBodies as never,
      versions as never,
      audit as never,
    );
    return {
      service,
      prisma,
      bodies,
      templateBodies,
      templateBody,
      entitlements,
      versions,
      audit,
    };
  }

  it('creates document from template snapshot with dataRefs empty', async () => {
    const { service, bodies, prisma } = build();
    const detail = await service.create({
      businessId: 'biz_1',
      title: 'Profile',
      templateId: 'tpl_1',
    });
    expect(prisma.document.create).toHaveBeenCalled();
    expect(bodies.upsert).toHaveBeenCalled();
    const body = parseDocumentBody(detail.body);
    expect(body.documentId).toBe('doc_1');
    expect(body.templateId).toBe('tpl_1');
    expect(body.schemaVersion).toBe(DOCUMENT_SCHEMA_VERSION);
    expect(body.dataRefs).toEqual({});
    expect(body.pages[0]?.blocks.length).toBeGreaterThan(0);
    expect(body.masters.length).toBeGreaterThan(0);
  });

  it('requires templateId', async () => {
    const { service } = build();
    await expect(
      service.create({ businessId: 'biz_1', title: 'X', templateId: '' }),
    ).rejects.toMatchObject({ code: DocumentErrorCodes.TemplateRequired });
  });

  it('rejects missing template', async () => {
    const { service, prisma } = build();
    prisma.documentTemplate.findFirst.mockResolvedValue(null);
    await expect(
      service.create({
        businessId: 'biz_1',
        title: 'X',
        templateId: 'missing',
      }),
    ).rejects.toMatchObject({ code: DocumentErrorCodes.TemplateNotFound });
  });

  it('rejects invalid body on update', async () => {
    const { service, prisma } = build();
    prisma.document.findFirst.mockResolvedValue({
      id: 'doc_1',
      businessId: 'biz_1',
      templateId: 'tpl_1',
      title: 'T',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    await expect(
      service.update({
        businessId: 'biz_1',
        documentId: 'doc_1',
        body: {
          schemaVersion: DOCUMENT_SCHEMA_VERSION,
          businessId: 'biz_1',
          documentId: 'doc_1',
          blocks: [{ id: 'x', type: 'notARealBlock', props: {} }],
        },
      }),
    ).rejects.toMatchObject({ code: DocumentErrorCodes.InvalidBody });
  });
});
