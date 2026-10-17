/**
 * ClubGroupView — 골프장별 행의 열 정렬.
 * 모든 골프장 섹션의 티(코스)·금액 열이 같은 위치에 놓여야 세로로 줄이 맞는다.
 * 티 정보가 없는 행도 티 자리를 placeholder("-")로 비워 두어 금액 열이 밀리지 않게 한다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ClubGroupView from '@/components/results/ClubGroupView';
import type { TeeTime } from '@/lib/types/tee-time';
import type { Database } from '@/lib/types/database';

type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

const useClubsMock = vi.hoisted(() =>
  vi.fn(() => ({ data: [] as GolfClub[], isLoading: false, error: undefined, mutate: vi.fn() })),
);

vi.mock('@/hooks/useClubs', () => ({
  useClubs: () => useClubsMock(),
}));

function makeTeeTime(overrides: Partial<TeeTime> = {}): TeeTime {
  return {
    id: 1,
    club_id: 'a',
    cc_name: 'A골프장',
    date: '2026-06-01',
    teeoff: '08:00',
    course: null,
    price: 250000,
    event: null,
    scraped_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ClubGroupView 열 정렬', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useClubsMock.mockReturnValue({ data: [], isLoading: false, error: undefined, mutate: vi.fn() });
  });

  it('데스크톱 표는 고정 레이아웃과 열 너비(colgroup)를 가져 골프장마다 열 위치가 같다', () => {
    const { container } = render(
      <ClubGroupView
        data={[
          makeTeeTime({ id: 1, club_id: 'a', cc_name: 'A골프장', event: '할인 10%' }),
          makeTeeTime({ id: 2, club_id: 'b', cc_name: 'B골프장', teeoff: '09:00', event: null }),
        ]}
        emptyClubs={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /A골프장 1건 펼치기/ }));
    fireEvent.click(screen.getByRole('button', { name: /B골프장 1건 펼치기/ }));

    const tables = container.querySelectorAll('table');
    expect(tables).toHaveLength(2);
    for (const table of tables) {
      expect(table).toHaveClass('table-fixed');
      expect(table.querySelectorAll('colgroup > col')).toHaveLength(4);
    }
  });

  it('티 정보가 없는 행은 모바일·데스크톱 모두 티 자리에 "-"를 둔다', () => {
    const { container } = render(
      <ClubGroupView
        data={[makeTeeTime({ course: null })]}
        emptyClubs={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /A골프장 1건 펼치기/ }));

    const mobile = container.querySelector('.md\\:hidden') as HTMLElement;
    expect(mobile).not.toBeNull();
    expect(mobile.textContent).toContain('-');
  });
});
