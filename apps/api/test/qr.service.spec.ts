import { buildQrPayload, parseQrBlockProps } from '@vdb/document-schema';
import { QrErrorCodes } from '@vdb/shared-types';
import { QrService } from '../src/modules/content/qr.service';

describe('QrService + payload', () => {
  const service = new QrService();

  it('buildQrPayload encodes target types', () => {
    expect(
      buildQrPayload({ targetType: 'url', value: 'https://example.com' }),
    ).toBe('https://example.com');
    expect(buildQrPayload({ targetType: 'phone', value: '+98 912 000' })).toBe(
      'tel:+98912000',
    );
    expect(buildQrPayload({ targetType: 'email', value: 'a@b.com' })).toBe(
      'mailto:a@b.com',
    );
    expect(buildQrPayload({ targetType: 'map', value: '35.7,51.4' })).toBe(
      'geo:35.7,51.4',
    );
    expect(buildQrPayload({ targetType: 'custom', value: 'HELLO' })).toBe(
      'HELLO',
    );
    expect(buildQrPayload({ targetType: 'url', value: '  ' })).toBe('');
  });

  it('encodes a PNG data URL', async () => {
    const out = await service.encodeFromProps({
      targetType: 'url',
      value: 'https://vdb.example',
      sizePx: 96,
    });
    expect(out.payload).toBe('https://vdb.example');
    expect(out.sizePx).toBe(96);
    expect(out.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('rejects empty payload', async () => {
    await expect(
      service.encodeFromProps({ targetType: 'url', value: '' }),
    ).rejects.toMatchObject({ code: QrErrorCodes.EmptyPayload });
  });

  it('tryEncodeForBlock returns null for empty', async () => {
    const out = await service.tryEncodeForBlock(
      parseQrBlockProps({ targetType: 'custom', value: '' }),
    );
    expect(out).toBeNull();
  });
});
