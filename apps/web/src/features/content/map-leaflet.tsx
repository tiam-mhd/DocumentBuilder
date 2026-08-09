'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './map-leaflet.module.css';

export type MapLeafletMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  centerLat: number;
  centerLng: number;
  zoom: number;
  markers: MapLeafletMarker[];
  heightPx?: number;
  className?: string;
};

/** Interactive OSM map for editor / settings preview (not used in PDF). */
export function MapLeafletPreview({
  centerLat,
  centerLng,
  zoom,
  markers,
  heightPx = 280,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([centerLat, centerLng], zoom);
  }, [centerLat, centerLng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    for (const m of markers) {
      L.circleMarker([m.lat, m.lng], {
        radius: 8,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.85,
      })
        .bindPopup(m.name)
        .addTo(layer);
    }
    return () => {
      map.removeLayer(layer);
    };
  }, [markers]);

  return (
    <div
      className={`${styles.wrap} ${className ?? ''}`}
      style={{ height: heightPx }}
    >
      <div ref={containerRef} className={styles.map} />
    </div>
  );
}
