'use client';

import { useEffect, useState } from 'react';
import { parseQrBlockProps, type BlockNode } from '@vdb/document-schema';
import { encodeQr } from '@/shared/api/qr';
import { useBusinesses } from '@/shared/lib/business-context';
import { useTranslations } from 'next-intl';
import styles from './html-preview.module.css';

type Props = { block: BlockNode };

export function QrBlockPreview({ block }: Props) {
  const t = useTranslations('editor');
  const { activeBusiness } = useBusinesses();
  const props = parseQrBlockProps(block.props);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusiness || !props.value.trim()) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void encodeQr(activeBusiness.id, {
        targetType: props.targetType,
        value: props.value,
        sizePx: props.sizePx,
        caption: props.caption,
      })
        .then((res) => {
          if (!cancelled) setDataUrl(res.dataUrl);
        })
        .catch(() => {
          if (!cancelled) setDataUrl(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    activeBusiness?.id,
    props.targetType,
    props.value,
    props.sizePx,
    props.caption,
  ]);

  if (!dataUrl) {
    return (
      <div
        className={styles.imagePh}
        style={{ width: props.sizePx, height: props.sizePx }}
      >
        {t('qrPlaceholder')}
      </div>
    );
  }

  return (
    <figure
      style={{
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        width={props.sizePx}
        height={props.sizePx}
        alt="QR"
        style={{ imageRendering: 'pixelated' }}
      />
      {props.caption ? (
        <figcaption className={styles.unknown}>{props.caption}</figcaption>
      ) : null}
    </figure>
  );
}
