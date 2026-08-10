import {
  DocumentErrorCodes,
  DocumentStatus,
  ShareLinkScope,
} from '@vdb/shared-types';
import { DocumentShareLinksService } from '../src/modules/documents/document-share-links.service';
import {
  generateShareToken,
  hashShareSecret,
  shareHashesEqual,
} from '../src/modules/documents/share-link.crypto';

describe('share-link.crypto', () => {
  it('hashes deterministically and compares safely', () => {
    const token = generateShareToken();
    expect(token.length).toBeGreaterThan(20);
    const a = hashShareSecret(token, 'pepper-pepper-pepper');
    const b = hashShareSecret(token, 'pepper-pepper-pepper');
    expect(shareHashesEqual(a, b)).toBe(true);
    expect(shareHashesEqual(a, hashShareSecret('other', 'pepper-pepper-pepper'))).toBe(
      false,
    );
  });
});

describe('DocumentShareLinksService (P04-T05)', () => {
  function build(opts?: { status?: string }) {
    const doc = {
      id: 'doc_1',
      businessId: 'biz_1',
      status: opts?.status ?? DocumentStatus.Approved,
      title: 'Profile',
      locale: 'fa',
      deletedAt: null,
    };
    const links: Array<Record<string, unknown>> = [];
    const prisma = {
      document: {
        findFirst: jest.fn().mockResolvedValue(doc),
      },
      documentShareLink: {
        findMany: jest.fn().mockImplementation(async () => links),
        create: jest.fn().mockImplementation(async ({ data }) => {
          const row = {
            id: `share_${links.length + 1}`,
            ...data,
            revokedAt: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          };
          links.push(row);
          return row;
        }),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'SHARE_LINK_PEPPER') return 'share-pepper-min-16';
        return 10;
      }),
    };
    const exportService = {
      buildDocumentHtml: jest.fn().mockResolvedValue({
        html: '<html></html>',
        title: 'Profile',
        locale: 'fa',
        dir: 'rtl',
      }),
      renderPdfBuffer: jest.fn().mockResolvedValue(Buffer.from('%PDF')),
    };
    const branding = {
      getForMember: jest.fn().mockResolvedValue({
        displayName: null,
        primaryColor: null,
        hasLogo: false,
        showPoweredByEffective: false,
      }),
    };
    const rate = {
      assertCanAttempt: jest.fn(),
      recordFailedAttempt: jest.fn(),
      clearAttempts: jest.fn(),
      grantSession: jest.fn(),
      hasSession: jest.fn().mockResolvedValue(false),
    };
    const audit = { log: jest.fn() };
    const service = new DocumentShareLinksService(
      prisma as never,
      config as never,
      exportService as never,
      branding as never,
      rate as never,
      audit as never,
    );
    return { service, prisma, links, audit, rate, doc };
  }

  it('rejects create when draft', async () => {
    const { service } = build({ status: DocumentStatus.Draft });
    await expect(
      service.create({
        businessId: 'biz_1',
        documentId: 'doc_1',
        userId: 'u1',
        scope: ShareLinkScope.Web,
      }),
    ).rejects.toMatchObject({ code: DocumentErrorCodes.ShareNotAllowed });
  });

  it('creates hashed token and returns raw once', async () => {
    const { service, audit } = build();
    const data = await service.create({
      businessId: 'biz_1',
      documentId: 'doc_1',
      userId: 'u1',
      scope: ShareLinkScope.Web,
      password: 'secret',
    });
    expect(data.token).toBeTruthy();
    expect(data.tokenHint).toBe(data.token!.slice(-4));
    expect(data.hasPassword).toBe(true);
    expect(data.publicPath).toBe(`/s/${data.token}`);
    expect(audit.log).toHaveBeenCalled();
  });

  it('unlock fails with wrong password and records attempt', async () => {
    const { service, prisma, rate, links } = build();
    const created = await service.create({
      businessId: 'biz_1',
      documentId: 'doc_1',
      userId: 'u1',
      scope: ShareLinkScope.Web,
      password: 'secret',
    });
    const row = {
      ...links[0],
      document: {
        title: 'Profile',
        locale: 'fa',
        status: DocumentStatus.Approved,
        deletedAt: null,
      },
    };
    prisma.documentShareLink.findUnique.mockResolvedValue(row);
    await expect(
      service.unlock(created.token!, 'wrong'),
    ).rejects.toMatchObject({
      code: DocumentErrorCodes.SharePasswordInvalid,
    });
    expect(rate.recordFailedAttempt).toHaveBeenCalled();
  });
});
