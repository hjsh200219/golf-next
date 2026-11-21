'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClubSpot } from '@/lib/utils/mapPins';
import { formatPinPrice } from '@/lib/utils/mapPins';
import { pinIcon, dotIcon } from '@/lib/maps/pinIcon';
import { declutter } from '@/lib/maps/declutter';
import { loadGoogleMaps, onMapsAuthFailure } from '@/lib/maps/loadGoogleMaps';

interface TeeTimeMapProps {
  /** Spots with coordinates only */
  spots: ClubSpot[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onError: (message: string) => void;
  /** Height of the collapsed sheet — keeps fitted pins above it */
  bottomInset: number;
  /** Height the sheet covers now — a selected pin is centered in the map area above it */
  sheetHeight: number;
}

const SEOUL = { lat: 37.45, lng: 127.2 };

/**
 * Google map with one price pill per golf course (lowest price of the day).
 * One-finger pan (gestureHandling greedy) because the page itself does not scroll.
 */
export default function TeeTimeMap({ spots, selectedKey, onSelect, onError, bottomInset, sheetHeight }: TeeTimeMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef(new Map<string, { mk: google.maps.Marker; dot: boolean }>());
  const fittedFor = useRef('');
  const [ready, setReady] = useState(false);
  // Keys whose price pill is shown; the rest render as dots (null = not computed yet)
  const [shown, setShown] = useState<Set<string> | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let alive = true;
    const off = onMapsAuthFailure(() => onError('지도 인증 실패'));
    loadGoogleMaps()
      .then((g) => {
        if (!alive || !el.current || map.current) return;
        map.current = new g.maps.Map(el.current, {
          center: SEOUL,
          zoom: 8,
          gestureHandling: 'greedy',
          disableDefaultUI: true,
          clickableIcons: false,
          keyboardShortcuts: true,
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });
        setReady(true);
      })
      .catch((e: Error) => alive && onError(e.message));
    return () => {
      alive = false;
      off();
    };
  }, [onError]);

  // Hide price pills that overlap a cheaper (or the selected) one; recompute after every pan/zoom
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const recompute = () => {
      const proj = m.getProjection();
      const zoom = m.getZoom();
      if (!proj || zoom == null) return;
      const scale = 2 ** zoom;
      const ordered = [
        ...spots.filter((s) => s.key === selectedKey),
        ...spots.filter((s) => s.key !== selectedKey),
      ];
      const boxes = [];
      for (const s of ordered) {
        if (s.lat == null || s.lon == null) continue;
        const p = proj.fromLatLngToPoint(new window.google.maps.LatLng(s.lat, s.lon));
        if (!p) continue;
        const icon = pinIcon(formatPinPrice(s.lowestPrice) ?? `${s.count}팀`, s.key === selectedKey);
        boxes.push({ key: s.key, x: p.x * scale, y: p.y * scale, w: icon.width, h: icon.height });
      }
      const next = declutter(boxes);
      setShown((prev) =>
        prev && prev.size === next.size && [...next].every((k) => prev.has(k)) ? prev : next,
      );
    };
    recompute();
    const l = m.addListener('idle', recompute);
    return () => l.remove();
  }, [ready, spots, selectedKey]);

  // Sync markers with spots/selection
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const g = window.google;
    const seen = new Set<string>();
    for (const s of spots) {
      if (s.lat == null || s.lon == null) continue;
      seen.add(s.key);
      const selected = s.key === selectedKey;
      const text = formatPinPrice(s.lowestPrice) ?? `${s.count}팀`;
      const asDot = shown != null && !shown.has(s.key);
      const icon = asDot ? dotIcon() : pinIcon(text, selected);
      const opts: google.maps.MarkerOptions = {
        position: { lat: s.lat, lng: s.lon },
        title: `${s.label} ${s.count}팀 ${text}`,
        icon: {
          url: icon.url,
          scaledSize: new g.maps.Size(icon.width, icon.height),
          anchor: new g.maps.Point(icon.anchorX, icon.anchorY),
        },
        zIndex: selected ? 1000 : asDot ? 1 : Math.max(2, 500 - Math.round((s.lowestPrice ?? 500000) / 1000)),
        optimized: false,
      };
      const existing = markers.current.get(s.key);
      // Google keeps the old click area when the icon size changes, so a pill↔dot
      // switch recreates the marker instead of setOptions
      if (existing && existing.dot === asDot) existing.mk.setOptions(opts);
      else {
        existing?.mk.setMap(null);
        const mk = new g.maps.Marker({ ...opts, map: m });
        mk.addListener('click', () => onSelectRef.current(s.key));
        markers.current.set(s.key, { mk, dot: asDot });
      }
    }
    for (const [key, { mk }] of markers.current) {
      if (!seen.has(key)) {
        mk.setMap(null);
        markers.current.delete(key);
      }
    }
  }, [ready, spots, selectedKey, shown]);

  // Fit all pins when the set of courses changes (new date / filter)
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const located = spots.filter((s) => s.lat != null && s.lon != null);
    const sig = located.map((s) => s.key).sort().join(',');
    if (!located.length || sig === fittedFor.current) return;
    fittedFor.current = sig;
    const b = new window.google.maps.LatLngBounds();
    for (const s of located) b.extend({ lat: s.lat as number, lng: s.lon as number });
    m.fitBounds(b, { top: 72, left: 40, right: 40, bottom: bottomInset + 40 });
  }, [ready, spots, bottomInset]);

  // Bring the selected pin into view above the sheet
  useEffect(() => {
    const m = map.current;
    const s = spots.find((x) => x.key === selectedKey);
    if (!ready || !m || !s || s.lat == null || s.lon == null) return;
    m.panTo({ lat: s.lat, lng: s.lon });
    m.panBy(0, Math.round(sheetHeight / 2));
    // sheetHeight is read at selection time only; resizing the sheet must not re-pan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedKey, spots]);

  return (
    <div className="absolute inset-0 bg-[#e8eee9]">
      <div ref={el} className="h-full w-full" aria-label="골프장 지도" role="application" />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-24">
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-500 shadow-card">
            지도를 불러오는 중
          </span>
        </div>
      )}
    </div>
  );
}
