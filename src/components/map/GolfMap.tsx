'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Database } from '@/lib/types/database';
import MapTooltip from '@/components/map/MapTooltip';

type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

interface GolfMapProps {
  clubs?: GolfClub[];
  selectedClubId?: string | null;
  onClubSelect?: (clubId: string) => void;
  className?: string;
  /** 티타임 수 맵 (clubId → count) — 선택적 */
  teeTimeCounts?: Record<string, number>;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    _golfMapInitialized?: boolean;
  }
}

const KOREA_CENTER = { lat: 36.5, lng: 127.5 };
const DEFAULT_ZOOM = 7;

/**
 * Google Maps JS API를 동적으로 로드하고 골프장 마커를 표시하는 지도 컴포넌트.
 * NEXT_PUBLIC_GOOGLE_MAP_API_KEY 환경변수에서 API 키를 읽는다.
 */
export default function GolfMap({
  clubs = [],
  selectedClubId,
  onClubSelect,
  className = '',
  teeTimeCounts = {},
}: GolfMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  /** 클럽 중심 좌표 계산 */
  const computeCenter = useCallback(() => {
    const withCoords = clubs.filter((c) => c.lat !== null && c.lon !== null);
    if (withCoords.length === 0) return KOREA_CENTER;
    const avgLat = withCoords.reduce((s, c) => s + (c.lat as number), 0) / withCoords.length;
    const avgLng = withCoords.reduce((s, c) => s + (c.lon as number), 0) / withCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [clubs]);

  /** Google Maps API 스크립트 동적 로드 */
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY;
    if (!apiKey) {
      setMapError('Google Maps API 키가 설정되지 않았습니다. (NEXT_PUBLIC_GOOGLE_MAP_API_KEY)');
      return;
    }

    // 이미 로드된 경우
    if (typeof window !== 'undefined' && window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    // 스크립트가 이미 DOM에 있는 경우
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapLoaded(true));
      existingScript.addEventListener('error', () =>
        setMapError('Google Maps 스크립트를 불러올 수 없습니다.'),
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=ko&region=KR`;
    script.async = true;
    script.defer = true;

    script.addEventListener('load', () => setMapLoaded(true));
    script.addEventListener('error', () =>
      setMapError('Google Maps 스크립트를 불러올 수 없습니다.'),
    );

    document.head.appendChild(script);
  }, []);

  /** 지도 인스턴스 초기화 */
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const center = computeCenter();

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      mapTypeId: 'roadmap',
      gestureHandling: 'cooperative',
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi.business',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });
  }, [mapLoaded, computeCenter]);

  /** 마커 렌더링 및 업데이트 */
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const google = window.google;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const clubsWithCoords = clubs.filter((c) => c.lat !== null && c.lon !== null);

    clubsWithCoords.forEach((club) => {
      const lat = club.lat as number;
      const lng = club.lon as number;
      const isSelected = club.id === selectedClubId;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: club.display_name ?? club.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 8,
          fillColor: isSelected ? '#059669' : '#16a34a',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: isSelected ? 100 : 1,
      });

      const teeTimeCount = teeTimeCounts[club.id];
      const address = club.address ?? undefined;

      const infoContent = `
        <div style="min-width:180px;padding:4px 0;font-family:sans-serif;">
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:4px;">
            ${club.display_name ?? club.name}
          </div>
          ${address ? `<div style="font-size:12px;color:#6b7280;margin-bottom:4px;">${address}</div>` : ''}
          ${
            teeTimeCount !== undefined
              ? `<div style="font-size:12px;color:#059669;font-weight:500;">티타임 ${teeTimeCount.toLocaleString('ko-KR')}개</div>`
              : ''
          }
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({ content: infoContent });

      marker.addListener('click', () => {
        // 다른 InfoWindow 닫기 - 간단한 전역 참조 방식
        markersRef.current.forEach((m) => {
          if (m._infoWindow) m._infoWindow.close();
        });
        infoWindow.open({ anchor: marker, map });
        onClubSelect?.(club.id);
      });

      marker._infoWindow = infoWindow;
      markersRef.current.push(marker);
    });
  }, [mapLoaded, clubs, selectedClubId, teeTimeCounts, onClubSelect]);

  /** 선택된 클럽이 변경되면 지도 중심 이동 */
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !selectedClubId) return;
    const club = clubs.find((c) => c.id === selectedClubId);
    if (!club?.lat || !club?.lon) return;
    mapInstanceRef.current.panTo({ lat: club.lat, lng: club.lon });
    mapInstanceRef.current.setZoom(12);
  }, [mapLoaded, selectedClubId, clubs]);

  const clubsWithCoords = clubs.filter((c) => c.lat !== null && c.lon !== null);

  // API 키 없음 or 로드 에러
  if (mapError) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 ${className}`}
        style={{ minHeight: 320 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-3 h-12 w-12 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="text-sm font-medium text-red-500">{mapError}</p>
        {clubsWithCoords.length > 0 && (
          <p className="mt-1 text-xs text-gray-400">
            위치 정보 보유 골프장: {clubsWithCoords.length}개
          </p>
        )}
        {/* Club list fallback */}
        {clubs.length > 0 && (
          <ul className="mt-4 max-h-40 w-full max-w-xs overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            {clubs.map((club) => (
              <li key={club.id}>
                <button
                  type="button"
                  onClick={() => onClubSelect?.(club.id)}
                  className={[
                    'w-full px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-green-500',
                    selectedClubId === club.id
                      ? 'bg-green-50 font-semibold text-green-700'
                      : 'text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {club.display_name ?? club.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ minHeight: 320 }}>
      {/* Google Maps 컨테이너 */}
      <div ref={mapRef} className="h-full w-full" style={{ minHeight: 320 }} />

      {/* 로딩 오버레이 */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">지도를 불러오는 중...</p>
          {clubsWithCoords.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              위치 정보 보유 골프장: {clubsWithCoords.length}개
            </p>
          )}
        </div>
      )}

      {/* 선택된 클럽 정보 오버레이 (하단 좌측) */}
      {mapLoaded && selectedClubId && (() => {
        const club = clubs.find((c) => c.id === selectedClubId);
        if (!club) return null;
        return (
          <div className="absolute bottom-4 left-4 z-10">
            <MapTooltip
              clubName={club.display_name ?? club.name}
              address={club.address}
              teeTimeCount={teeTimeCounts[club.id]}
            />
          </div>
        );
      })()}
    </div>
  );
}
