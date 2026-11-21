/**
 * useMediaQuery — 서버 렌더·하이드레이션 중에는 null(미정)을 돌려 데스크톱에서
 * 모바일용 지도가 먼저 그려지는 하이드레이션 불일치를 막는다. 클라이언트 렌더에서는 실제 값.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

function Probe() {
  const m = useMediaQuery('(min-width: 768px)');
  return <span data-testid="v">{String(m)}</span>;
}

describe('useMediaQuery', () => {
  it('is null (undecided) when rendered on the server', () => {
    expect(renderToString(<Probe />)).toContain('null');
  });

  it('reports the real match on the client', () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: true, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }));
    render(<Probe />);
    expect(screen.getByTestId('v')).toHaveTextContent('true');
  });
});
