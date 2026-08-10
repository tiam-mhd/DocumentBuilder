import {
  DocumentErrorCodes,
  DocumentStatus,
} from '@vdb/shared-types';
import { DocumentWebPublishService } from '../src/modules/documents/document-web-publish.service';

describe('DocumentWebPublishService (P04-T04)', () => {
  function build(opts?: {
    status?: string;
    webSlug?: string | null;
    webPublished?: boolean;
  }) {
    const row = {
      id: 'doc_1',
      businessId: 'biz_1',
      status: opts?.status ?? DocumentStatus.Approved,
      webSlug: opts?.webSlug ?? null,
      webPublished: opts?.webPublished ?? false,
      webPublishedAt: null as Date | null,
      deletedAt: null,
    };
    const prisma = {
      document: {
        findFirst: jest.fn().mockImplementation(async (args: {
          where: Record<string, unknown>;
        }) => {
          if (args.where.id === 'doc_1') return { ...row };
          if (args.where.webSlug && args.where.webPublished) {
            return row.webPublished && row.webSlug === args.where.webSlug
              ? { ...row }
              : null;
          }
          if (args.where.webSlug && args.where.NOT) {
            return null;
          }
          return { ...row };
        }),
        update: jest.fn().mockImplementation(async ({ data }) => {
          Object.assign(row, data);
          return { ...row };
        }),
      },
    };
    const exportService = {
      buildDocumentHtml: jest.fn().mockResolvedValue({
        html: '<html lang="fa" dir="rtl"><body>ok</body></html>',
        title: 'Profile',
        locale: 'fa',
        dir: 'rtl',
        pageSize: 'A4',
        landscape: false,
      }),
    };
    const branding = {
      getForMember: jest.fn().mockResolvedValue({
        displayName: 'Acme',
        primaryColor: '#123456',
        hasLogo: false,
        showPoweredByEffective: true,
      }),
      resolveByHost: jest.fn(),
    };
    const audit = { log: jest.fn() };
    const service = new DocumentWebPublishService(
      prisma as never,
      exportService as never,
      branding as never,
      audit as never,
    );
    return { service, prisma, row, audit };
  }

  it('rejects go-live when workflow status is draft', async () => {
    const { service } = build({ status: DocumentStatus.Draft });
    await expect(
      service.updateSettings({
        businessId: 'biz_1',
        documentId: 'doc_1',
        userId: 'u1',
        webSlug: 'acme-profile',
        webPublished: true,
      }),
    ).rejects.toMatchObject({ code: DocumentErrorCodes.WebNotAllowed });
  });

  it('publishes when approved + valid slug', async () => {
    const { service, audit } = build({ status: DocumentStatus.Approved });
    const data = await service.updateSettings({
      businessId: 'biz_1',
      documentId: 'doc_1',
      userId: 'u1',
      webSlug: 'acme-profile',
      webPublished: true,
    });
    expect(data.webPublished).toBe(true);
    expect(data.webSlug).toBe('acme-profile');
    expect(data.publicPath).toBe('/p/biz_1/acme-profile');
    expect(audit.log).toHaveBeenCalled();
  });

  it('rejects invalid slug', async () => {
    const { service } = build();
    await expect(
      service.updateSettings({
        businessId: 'biz_1',
        documentId: 'doc_1',
        userId: 'u1',
        webSlug: 'BAD SLUG',
      }),
    ).rejects.toMatchObject({ code: DocumentErrorCodes.WebSlugInvalid });
  });

  it('public view 404 when not web_published', async () => {
    const { service } = build({
      status: DocumentStatus.Approved,
      webSlug: 'acme-profile',
      webPublished: false,
    });
    await expect(
      service.getPublicView('biz_1', 'acme-profile'),
    ).rejects.toMatchObject({ code: DocumentErrorCodes.WebNotPublished });
  });
});
