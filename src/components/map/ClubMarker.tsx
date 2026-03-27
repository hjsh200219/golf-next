'use client';

import { useState } from 'react';

interface ClubMarkerProps {
  name: string;
  lat: number;
  lon: number;
  address?: string | null;
  isActive?: boolean;
  onClick?: () => void;
}

/**
 * 골프장 마커 컴포넌트.
 * Google Maps 통합 전 독립형 마커-유사 UI로 동작하며,
 * 향후 Google Maps OverlayView / AdvancedMarkerElement의 콘텐츠로도 사용 가능하다.
 */
export default function ClubMarker({
  name,
  lat,
  lon,
  address,
  isActive = false,
  onClick,
}: ClubMarkerProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block" style={{ zIndex: isActive ? 20 : 10 }}>
      {/* Marker pin button */}
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={name}
        className={[
          'flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-md transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400',
          isActive
            ? 'scale-125 border-white bg-green-600 text-white'
            : 'border-white bg-green-500 text-white hover:scale-110',
        ].join(' ')}
      >
        {/* Golf flag icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6 2v20M6 2l10 4-10 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-52 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
        >
          <p className="truncate text-xs font-semibold text-gray-900">{name}</p>
          {address && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{address}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {lat.toFixed(4)}, {lon.toFixed(4)}
          </p>
          {/* Tooltip arrow */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white"
            style={{ marginTop: -1 }}
          />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-200"
            style={{ marginTop: 0 }}
          />
        </div>
      )}
    </div>
  );
}
