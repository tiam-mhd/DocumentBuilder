'use client';

import { useEffect, useState } from 'react';
import { parseMapBlockProps, type BlockNode } from '@vdb/document-schema';
import { listMapMarkers } from '@/shared/api/map';
import { useBusinesses } from '@/shared/lib/business-context';
import { MapLeafletPreview } from '@/features/content/map-leaflet';
import { useEditorStore } from './store/editor-store';

type Props = { block: BlockNode };

export function MapBlockPreview({ block }: Props) {
  const { activeBusiness } = useBusinesses();
  const docLocale = useEditorStore((s) =>
    s.body?.locale === 'en' ? 'en' : 'fa',
  );
  const props = parseMapBlockProps(block.props);
  const [markers, setMarkers] = useState<
    { id: string; name: string; lat: number; lng: number }[]
  >([]);

  useEffect(() => {
    if (!activeBusiness || !props.showMarkers || props.markersSource === 'none') {
      setMarkers([]);
      return;
    }
    let cancelled = false;
    void listMapMarkers(activeBusiness.id, {
      source: props.markersSource,
      country: props.countryRestriction ?? undefined,
      locale: docLocale,
    })
      .then((list) => {
        if (!cancelled) {
          setMarkers(
            list.items.map((m) => ({
              id: m.id,
              name: m.name,
              lat: m.lat,
              lng: m.lng,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMarkers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeBusiness?.id,
    props.markersSource,
    props.countryRestriction,
    props.showMarkers,
    docLocale,
  ]);

  return (
    <MapLeafletPreview
      centerLat={props.centerLat}
      centerLng={props.centerLng}
      zoom={props.zoom}
      markers={markers}
      heightPx={props.heightPx}
    />
  );
}
