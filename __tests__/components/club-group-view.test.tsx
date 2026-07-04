/**
 * ClubGroupView — empty-club placeholder rendering.
 * A club expected by the active filter but with zero tee-times must still
 * appear, labelled "예약 가능 시간 없음", instead of silently disappearing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import ClubGroupView from '@/components/results/ClubGroupView';
import type { TeeTime } from '@/lib/types/tee-time';

// useClubs is a SWR-backed hook hitting /api/clubs; stub it.
vi.mock('@/hooks/useClubs', () => ({
  useClubs: () => ({ data: [], isLoading: false, error: undefined, mutate: vi.fn() }),
}));

function makeTeeTime(overrides: Partial<TeeTime> = {}): TeeTime {
  return {
    id: 1,
    club_id: 'a',
    cc_name: 'A골프장',
    date: '2026-06-01',
    teeoff: '08:00',
    course: null,
    price: 100000,
    event: null,
    scraped_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ClubGroupView empty clubs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an empty club with "예약 가능 시간 없음"', () => {
    render(
      <ClubGroupView
        data={[]}
        emptyClubs={[{ clubId: 'yangju', clubName: '양주CC' }]}
      />,
    );
    expect(screen.getByText('양주CC')).toBeInTheDocument();
    expect(screen.getByText('예약 가능 시간 없음')).toBeInTheDocument();
  });

  it('renders clubs with times AND empty clubs together', () => {
    render(
      <ClubGroupView
        data={[makeTeeTime({ club_id: 'a', cc_name: 'A골프장' })]}
        emptyClubs={[{ clubId: 'yangju', clubName: '양주CC' }]}
      />,
    );
    expect(screen.getByText('A골프장')).toBeInTheDocument();
    expect(screen.getByText('양주CC')).toBeInTheDocument();
    expect(screen.getByText('예약 가능 시간 없음')).toBeInTheDocument();
  });

  it('returns null when there are no times and no empty clubs', () => {
    const { container } = render(<ClubGroupView data={[]} emptyClubs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not show an empty placeholder for a club that has times', () => {
    render(
      <ClubGroupView
        data={[makeTeeTime({ club_id: 'a', cc_name: 'A골프장' })]}
        emptyClubs={[]}
      />,
    );
    expect(screen.queryByText('예약 가능 시간 없음')).not.toBeInTheDocument();
  });

  it('empty club toggle button is disabled (no times to expand)', () => {
    render(
      <ClubGroupView data={[]} emptyClubs={[{ clubId: 'yangju', clubName: '양주CC' }]} />,
    );
    const btn = screen.getByRole('button', { name: /양주CC 예약 가능 시간 없음/ });
    expect(btn).toBeDisabled();
  });
});

describe('ClubGroupView lazy section rendering', () => {
  let ioCallback: IntersectionObserverCallback | null = null;
  const observeSpy = vi.fn();
  const disconnectSpy = vi.fn();

  beforeEach(() => {
    ioCallback = null;
    observeSpy.mockClear();
    disconnectSpy.mockClear();
    class MockIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) {
        ioCallback = cb;
      }
      observe = observeSpy;
      unobserve = vi.fn();
      disconnect = disconnectSpy;
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '';
      thresholds = [];
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Zero-padded names so groupByClub's lexical sort matches numeric order,
  // making "first N" deterministic.
  function manyClubs(n: number): TeeTime[] {
    return Array.from({ length: n }, (_, i) => {
      const label = String(i).padStart(2, '0');
      return makeTeeTime({ id: i + 1, club_id: `c${label}`, cc_name: `클럽${label}` });
    });
  }

  it('renders only the first screenful of clubs and lazily reveals more on scroll', () => {
    render(<ClubGroupView data={manyClubs(25)} emptyClubs={[]} />);

    // First page (10) rendered
    expect(screen.getByText('클럽00')).toBeInTheDocument();
    expect(screen.getByText('클럽09')).toBeInTheDocument();
    // Beyond the first page is not in the DOM yet
    expect(screen.queryByText('클럽10')).not.toBeInTheDocument();

    // Observer is watching the sentinel
    expect(observeSpy).toHaveBeenCalledTimes(1);

    // Scroll the sentinel into view → next page appears
    act(() => {
      ioCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(screen.getByText('클럽10')).toBeInTheDocument();
    expect(screen.getByText('클럽19')).toBeInTheDocument();
    expect(screen.queryByText('클럽20')).not.toBeInTheDocument();
  });

  it('does not attach an observer when everything fits in the first page', () => {
    render(<ClubGroupView data={manyClubs(3)} emptyClubs={[]} />);
    expect(screen.getByText('클럽02')).toBeInTheDocument();
    expect(observeSpy).not.toHaveBeenCalled();
  });
});
