'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: string; // any CSS color, rendered as a colored pin
  title?: string;
  radiusMeters?: number; // draws a geofence circle around the marker
}

interface GoogleMapProps {
  markers: MapMarker[];
  height?: number | string;
  zoom?: number;
  className?: string;
}

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India, used when there are no markers yet

let loaderPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

export function GoogleMap({ markers, height = 400, zoom = 11, className }: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'no-key' | 'error'>('idle');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setStatus('no-key');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;
    const google = (window as any).google;
    const map = mapRef.current;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => {
      const position = { lat: m.lat, lng: m.lng };
      const marker = new google.maps.Marker({
        position,
        map,
        label: m.label ? { text: m.label, color: '#fff', fontSize: '11px', fontWeight: '600' } : undefined,
        title: m.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: m.color || '#4f46e5',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
      overlaysRef.current.push(marker);
      bounds.extend(position);

      if (m.radiusMeters) {
        const circle = new google.maps.Circle({
          center: position,
          radius: m.radiusMeters,
          map,
          fillColor: m.color || '#4f46e5',
          fillOpacity: 0.08,
          strokeColor: m.color || '#4f46e5',
          strokeOpacity: 0.4,
          strokeWeight: 1,
        });
        overlaysRef.current.push(circle);
      }
    });

    if (markers.length > 0) map.fitBounds(bounds, 60);
  }, [markers, status]);

  if (status === 'no-key' || status === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center"
        style={{ height }}
      >
        <MapPin className="h-8 w-8 text-gray-300" />
        <p className="max-w-xs text-sm text-gray-500">
          {status === 'no-key'
            ? 'Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the live map.'
            : 'Could not load Google Maps.'}
        </p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ height }} className={className ?? 'rounded-xl'} />;
}
