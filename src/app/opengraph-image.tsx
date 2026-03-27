import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '골프 예약 조회 | GolfShin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #166534 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Golf ball icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="256" cy="240" r="80" fill="white" />
            <rect x="248" y="160" width="16" height="200" rx="8" fill="#16a34a" />
            <rect x="224" y="340" width="64" height="16" rx="8" fill="white" />
          </svg>
        </div>

        {/* Site name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}
        >
          GolfShin
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: 40,
          }}
        >
          실시간 골프장 티타임 예약 조회
        </div>

        {/* Feature badges */}
        <div
          style={{
            display: 'flex',
            gap: 16,
          }}
        >
          {['30개+ 골프장', '5분 간격 업데이트', '무료 서비스'].map((text) => (
            <div
              key={text}
              style={{
                padding: '10px 24px',
                borderRadius: 999,
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
