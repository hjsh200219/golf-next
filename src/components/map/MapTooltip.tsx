'use client';

interface MapTooltipProps {
  clubName: string;
  address?: string | null;
  teeTimeCount?: number;
  visible?: boolean;
}

/**
 * 지도 마커용 툴팁 컴포넌트.
 * 골프장 이름, 주소, 현재 티타임 수를 표시한다.
 */
export default function MapTooltip({
  clubName,
  address,
  teeTimeCount,
  visible = true,
}: MapTooltipProps) {
  if (!visible) return null;

  return (
    <div
      role="tooltip"
      className="w-56 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl"
    >
      {/* Club name */}
      <p className="text-sm font-semibold text-gray-900 leading-snug">{clubName}</p>

      {/* Address */}
      {address ? (
        <p className="mt-1 text-xs text-gray-500 leading-snug line-clamp-2">{address}</p>
      ) : (
        <p className="mt-1 text-xs text-gray-400 italic">주소 정보 없음</p>
      )}

      {/* Tee time count */}
      <div className="mt-2 flex items-center gap-1.5 border-t border-gray-100 pt-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700">
          {/* Golf ball icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        </span>
        {teeTimeCount !== undefined ? (
          <span className="text-xs font-medium text-gray-700">
            티타임 {teeTimeCount.toLocaleString('ko-KR')}개
          </span>
        ) : (
          <span className="text-xs text-gray-400">티타임 정보 없음</span>
        )}
      </div>
    </div>
  );
}
