import { createHmac } from 'crypto';
import { LicenseErrorCodes } from '@vdb/shared-types';
import { LicenseService } from '../src/modules/billing/license/license.service';
import {
  hashLicenseKey,
  verifyLicenseKeyFormat,
} from '../src/modules/billing/license/license.crypto';

describe('license.crypto', () => {
  it('accepts opaque VDB- keys when issuer secret empty', () => {
    expect(
      verifyLicenseKeyFormat('VDB-DEV-LICENSE-KEY-0001', '').ok,
    ).toBe(true);
    expect(verifyLicenseKeyFormat('bad', '').ok).toBe(false);
  });

  it('verifies HMAC VDB1 keys', () => {
    const secret = 'issuer-secret-for-tests';
    const payload = Buffer.from(JSON.stringify({ org: 'Acme' }), 'utf8');
    const sig = createHmac('sha256', secret).update(payload).digest('base64url');
    const key = `VDB1.${payload.toString('base64url')}.${sig}`;
    const result = verifyLicenseKeyFormat(key, secret);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.organizationName).toBe('Acme');
    }
  });

  it('hashes with pepper', () => {
    const a = hashLicenseKey('VDB-DEV-LICENSE-KEY-0001', 'pepper-aaaaaaaa');
    const b = hashLicenseKey('VDB-DEV-LICENSE-KEY-0001', 'pepper-aaaaaaaa');
    const c = hashLicenseKey('VDB-DEV-LICENSE-KEY-0001', 'pepper-bbbbbbbb');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('LicenseService', () => {
  function build(editionSelfHosted: boolean) {
    const edition = {
      isSelfHosted: () => editionSelfHosted,
    };
    const config = {
      get: (key: string) =>
        key === 'LICENSE_ISSUER_SECRET' ? '' : undefined,
      getOrThrow: (key: string) => {
        if (key === 'LICENSE_PEPPER') return 'dev-only-license-pepper';
        throw new Error(key);
      },
    };
    const prisma = {
      installationLicense: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new LicenseService(
      prisma as never,
      edition as never,
      config as never,
    );
    return { service, prisma, edition };
  }

  it('SAAS: status not required and always active', async () => {
    const { service } = build(false);
    await expect(service.getPublicStatus()).resolves.toMatchObject({
      required: false,
      active: true,
    });
    await expect(service.assertActive()).resolves.toBeUndefined();
  });

  it('SAAS: activate throws LICENSE_NOT_APPLICABLE', async () => {
    const { service } = build(false);
    await expect(
      service.activate({ licenseKey: 'VDB-DEV-LICENSE-KEY-0001' }),
    ).rejects.toMatchObject({ code: LicenseErrorCodes.NotApplicable });
  });

  it('SELF_HOSTED: assertActive denies without license', async () => {
    const { service } = build(true);
    await expect(service.assertActive()).rejects.toMatchObject({
      code: LicenseErrorCodes.Required,
    });
  });

  it('SELF_HOSTED: activate stores hash and becomes active', async () => {
    const { service, prisma } = build(true);
    prisma.installationLicense.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        organizationName: 'Org',
        keyHint: '0001',
        activatedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: null,
      });

    const status = await service.activate({
      licenseKey: 'VDB-DEV-LICENSE-KEY-0001',
      organizationName: 'Org',
    });

    expect(prisma.installationLicense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        keyHint: '0001',
        organizationName: 'Org',
        keyHash: expect.any(String),
      }),
    });
    expect(status.active).toBe(true);
  });
});
