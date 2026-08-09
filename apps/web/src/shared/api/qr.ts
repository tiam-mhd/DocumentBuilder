import { apiFetch } from './client';
import type { PublicQrEncode } from '@vdb/shared-types';
import type { QrTargetType } from '@vdb/document-schema';

export function encodeQr(
  businessId: string,
  body: {
    targetType: QrTargetType;
    value: string;
    sizePx?: number;
    caption?: string;
  },
) {
  return apiFetch<PublicQrEncode>(`/businesses/${businessId}/qr/encode`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
