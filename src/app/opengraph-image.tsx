import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = '골프 예약 조회 | GolfShin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  const logoBuffer = await readFile(join(process.cwd(), 'public/images/logo.png'));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="GolfShin logo"
          width="200"
          height="155"
          style={{ marginBottom: 24 }}
        />

        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}
        >
          GOLF SHIN
        </div>

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

        <div
          style={{
            display: 'flex',
            gap: 16,
          }}
        >
          {['34개 골프장', '매시간 업데이트', '무료 서비스'].map((text) => (
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
