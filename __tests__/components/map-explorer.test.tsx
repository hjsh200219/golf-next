/**
 * MapExplorer — mobile 지도 + 바텀시트(bottom sheet) 예약 조회.
 * Map is mocked (Google Maps is not loadable in jsdom); the sheet must work on its
 * own and keep 조회 usable when the map fails.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import React from 'react';
import MapExplorer from '@/components/map/MapExplorer';
import BottomSheet from '@/components/map/BottomSheet';
import type { ClubSpot } from '@/lib/utils/mapPins';
import type { TeeTime } from '@/lib/types/tee-time';

const mapProps = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
vi.mock('@/components/map/TeeTimeMap', () => ({
  default: (props: Record<string, unknown>) => {
    mapProps.current = props;
    return <div data-testid="map" />;
  },
}));

let id = 0;
const tt = (teeoff: string, price: number | null, course: string | null = null): TeeTime => ({
  id: ++id, club_id: 'x', cc_name: 'x', date: '2026-11-22', teeoff, course, price, event: null,
  scraped_at: '2026-11-21T09:00:00Z',
});

const SPOTS: ClubSpot[] = [
  {
    key: 'shinedale|샤인데일', clubId: 'shinedale', label: '샤인데일', count: 2, lowestPrice: 130000,
    lat: 37.71, lon: 127.61, region: '강원',
    teeTimes: [tt('06:15', 130000, '레이크'), tt('07:11', 140000, '샤인')],
  },
  {
    key: 'golfzoncounty|송도', clubId: 'golfzoncounty', label: '골프존카운티 송도', count: 1, lowestPrice: 109000,
    lat: null, lon: null, region: '인천', teeTimes: [tt('06:10', 109000)],
  },
];

const CLUB_URLS: Record<string, string> = { shinedale: 'https://www.shinedale.com' };

function renderExplorer(over: Partial<React.ComponentProps<typeof MapExplorer>> = {}) {
  return render(
    <MapExplorer
      spots={SPOTS}
      emptyClubs={[]}
      clubUrl={(clubId) => CLUB_URLS[clubId] ?? null}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      header={<div>날짜 탭</div>}
      summary={<span>3건</span>}
      filters={<div>필터</div>}
      {...over}
    />,
  );
}

beforeEach(() => { mapProps.current = null; });

describe('MapExplorer', () => {
  it('lists every spot with lowest price and team count; unpinned spots say so', () => {
    renderExplorer();
    const list = screen.getByRole('list', { name: '골프장 목록' });
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('샤인데일');
    expect(items[0]).toHaveTextContent('13만');
    expect(items[0]).toHaveTextContent('2팀');
    expect(items[1]).toHaveTextContent('지도 위치 없음');
    // only pinned spots go to the map
    expect((mapProps.current?.spots as ClubSpot[]).map((s) => s.key)).toEqual(['shinedale|샤인데일']);
  });

  it('tapping a list row opens its tee times, 바로가기 and highlights the pin', () => {
    renderExplorer();
    fireEvent.click(screen.getByRole('button', { name: /샤인데일/ }));
    expect(screen.getByRole('heading', { name: '샤인데일' })).toBeInTheDocument();
    expect(screen.getByText('06:15')).toBeInTheDocument();
    expect(screen.getByText('14만')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /샤인데일 홈페이지/ })).toHaveAttribute('href', 'https://www.shinedale.com');
    expect(mapProps.current?.selectedKey).toBe('shinedale|샤인데일');
  });

  it('selecting a pin on the map opens the same detail; 닫기 returns to the list', () => {
    renderExplorer();
    act(() => (mapProps.current?.onSelect as (k: string) => void)('shinedale|샤인데일'));
    expect(screen.getByRole('heading', { name: '샤인데일' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '목록으로 돌아가기' }));
    expect(screen.getByRole('list', { name: '골프장 목록' })).toBeInTheDocument();
    expect(mapProps.current?.selectedKey).toBeNull();
  });

  it('keeps the list usable when the map fails to load', () => {
    renderExplorer();
    act(() => (mapProps.current?.onError as (m: string) => void)('지도 오류'));
    expect(screen.getByRole('alert')).toHaveTextContent('지도를 불러오지 못했습니다');
    expect(screen.getByRole('list', { name: '골프장 목록' })).toBeInTheDocument();
  });

  it('shows a loading state while tee times load', () => {
    renderExplorer({ spots: [], isLoading: true });
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중');
  });

  it('shows an error card with retry', () => {
    const onRetry = vi.fn();
    renderExplorer({ spots: [], error: new Error('boom'), onRetry });
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('lists clubs with no availability at the end', () => {
    renderExplorer({ emptyClubs: [{ clubId: 'cc360', clubName: '360CC' }] });
    const items = within(screen.getByRole('list', { name: '골프장 목록' })).getAllByRole('listitem');
    expect(items[items.length - 1]).toHaveTextContent('360CC');
    expect(items[items.length - 1]).toHaveTextContent('예약 가능 시간 없음');
  });
});

describe('BottomSheet', () => {
  it('the handle cycles peek → half → full → peek and reports the size', () => {
    const onSnapChange = vi.fn();
    const { rerender } = render(
      <BottomSheet snap="peek" onSnapChange={onSnapChange} header={<div>머리</div>}>본문</BottomSheet>,
    );
    const handle = screen.getByRole('button', { name: /시트 크기/ });
    expect(handle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(handle);
    expect(onSnapChange).toHaveBeenLastCalledWith('half');
    rerender(<BottomSheet snap="full" onSnapChange={onSnapChange} header={<div>머리</div>}>본문</BottomSheet>);
    expect(screen.getByRole('button', { name: /시트 크기/ })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /시트 크기/ }));
    expect(onSnapChange).toHaveBeenLastCalledWith('peek');
  });
});
