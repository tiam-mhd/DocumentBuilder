import { HttpStatus, Injectable } from '@nestjs/common';
import QRCode from 'qrcode';
import {
  buildQrPayload,
  parseQrBlockProps,
  type QrBlockProps,
} from '@vdb/document-schema';
import { QrErrorCodes, type PublicQrEncode } from '@vdb/shared-types';
import { DomainException } from '../../common/errors/domain.exception';

@Injectable()
export class QrService {
  async encodeFromProps(
    props: QrBlockProps | Record<string, unknown>,
  ): Promise<PublicQrEncode> {
    const parsed = parseQrBlockProps(props);
    const payload = buildQrPayload(parsed);
    if (!payload) {
      throw new DomainException(
        QrErrorCodes.EmptyPayload,
        'QR value is empty',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.encodePayload(payload, parsed.sizePx);
  }

  async encodePayload(payload: string, sizePx: number): Promise<PublicQrEncode> {
    const size = Math.min(512, Math.max(64, Math.round(sizePx)));
    try {
      const dataUrl = await QRCode.toDataURL(payload, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
        type: 'image/png',
      });
      return { payload, dataUrl, sizePx: size };
    } catch {
      throw new DomainException(
        QrErrorCodes.EncodeFailed,
        'Failed to encode QR code',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Best-effort for PDF — empty payload returns null (placeholder). */
  async tryEncodeForBlock(
    props: Record<string, unknown>,
  ): Promise<PublicQrEncode | null> {
    const parsed = parseQrBlockProps(props);
    const payload = buildQrPayload(parsed);
    if (!payload) return null;
    try {
      return await this.encodePayload(payload, parsed.sizePx);
    } catch {
      return null;
    }
  }
}
