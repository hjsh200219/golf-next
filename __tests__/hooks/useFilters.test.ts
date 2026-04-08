/**
 * useFilterStore (Zustand) tests
 *
 * The Zustand store (useFilterStore) is tested directly without the
 * next/navigation-dependent useFilters wrapper, keeping tests fast and
 * free of React rendering overhead.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/hooks/useFilters';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reset the store to its initial state before each test. */
function resetStore() {
  useFilterStore.getState().resetFilters();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useFilterStore — initial state', () => {
  beforeEach(resetStore);

  it('starts with an empty selectedClubs array', () => {
    expect(useFilterStore.getState().selectedClubs).toEqual([]);
  });

  it('starts with empty ccRestrictions', () => {
    expect(useFilterStore.getState().ccRestrictions).toEqual({});
  });

  it('starts with a null timeRange', () => {
    expect(useFilterStore.getState().timeRange).toBeNull();
  });

  it('starts with a null priceMin', () => {
    expect(useFilterStore.getState().priceMin).toBeNull();
  });

  it('starts with a null priceMax', () => {
    expect(useFilterStore.getState().priceMax).toBeNull();
  });
});

describe('useFilterStore — setSelectedClubs', () => {
  beforeEach(resetStore);

  it('updates selectedClubs to the provided array', () => {
    useFilterStore.getState().setSelectedClubs(['club-1', 'club-2']);
    expect(useFilterStore.getState().selectedClubs).toEqual(['club-1', 'club-2']);
  });

  it('replaces a previous selection entirely', () => {
    useFilterStore.getState().setSelectedClubs(['club-1']);
    useFilterStore.getState().setSelectedClubs(['club-2', 'club-3']);
    expect(useFilterStore.getState().selectedClubs).toEqual(['club-2', 'club-3']);
  });

  it('can clear the selection by setting an empty array', () => {
    useFilterStore.getState().setSelectedClubs(['club-1']);
    useFilterStore.getState().setSelectedClubs([]);
    expect(useFilterStore.getState().selectedClubs).toEqual([]);
  });
});

describe('useFilterStore — toggleClub', () => {
  beforeEach(resetStore);

  it('adds a club that is not yet selected', () => {
    useFilterStore.getState().toggleClub('club-a');
    expect(useFilterStore.getState().selectedClubs).toContain('club-a');
  });

  it('removes a club that is already selected', () => {
    useFilterStore.getState().setSelectedClubs(['club-a', 'club-b']);
    useFilterStore.getState().toggleClub('club-a');
    expect(useFilterStore.getState().selectedClubs).not.toContain('club-a');
    expect(useFilterStore.getState().selectedClubs).toContain('club-b');
  });

  it('is idempotent: toggling twice restores the original state', () => {
    useFilterStore.getState().toggleClub('club-x');
    useFilterStore.getState().toggleClub('club-x');
    expect(useFilterStore.getState().selectedClubs).toEqual([]);
  });

  it('clears existing ccRestrictions for the toggled club (전체 cc 매칭으로 복귀)', () => {
    useFilterStore.getState().setSelectedClubs(['onetheclub']);
    useFilterStore.getState().setCcRestrictions({ onetheclub: ['파주CC'] });
    // 직접 토글로 cc 제한 해제
    useFilterStore.getState().toggleClub('onetheclub');
    // 토글로 클럽이 빠졌고, cc 제한도 제거
    expect(useFilterStore.getState().selectedClubs).not.toContain('onetheclub');
    expect(useFilterStore.getState().ccRestrictions['onetheclub']).toBeUndefined();
  });

  it('preserves ccRestrictions for other clubs when toggling', () => {
    useFilterStore.getState().setCcRestrictions({
      onetheclub: ['파주CC'],
      pinestone: ['레인보우힐스CC'],
    });
    useFilterStore.getState().toggleClub('onetheclub');
    expect(useFilterStore.getState().ccRestrictions['pinestone']).toEqual(['레인보우힐스CC']);
  });
});

describe('useFilterStore — ccRestrictions', () => {
  beforeEach(resetStore);

  it('setCcRestrictions replaces the entire map', () => {
    useFilterStore.getState().setCcRestrictions({ a: ['x'] });
    useFilterStore.getState().setCcRestrictions({ b: ['y'] });
    expect(useFilterStore.getState().ccRestrictions).toEqual({ b: ['y'] });
  });

  it('resetFilters clears ccRestrictions', () => {
    useFilterStore.getState().setCcRestrictions({ a: ['x', 'y'] });
    useFilterStore.getState().resetFilters();
    expect(useFilterStore.getState().ccRestrictions).toEqual({});
  });
});

describe('useFilterStore — setTimeRange', () => {
  beforeEach(resetStore);

  it("updates timeRange to 'early'", () => {
    useFilterStore.getState().setTimeRange('early');
    expect(useFilterStore.getState().timeRange).toBe('early');
  });

  it("updates timeRange to 'morning'", () => {
    useFilterStore.getState().setTimeRange('morning');
    expect(useFilterStore.getState().timeRange).toBe('morning');
  });

  it("updates timeRange to 'afternoon'", () => {
    useFilterStore.getState().setTimeRange('afternoon');
    expect(useFilterStore.getState().timeRange).toBe('afternoon');
  });

  it("updates timeRange to 'evening'", () => {
    useFilterStore.getState().setTimeRange('evening');
    expect(useFilterStore.getState().timeRange).toBe('evening');
  });

  it('clears timeRange when set to null', () => {
    useFilterStore.getState().setTimeRange('morning');
    useFilterStore.getState().setTimeRange(null);
    expect(useFilterStore.getState().timeRange).toBeNull();
  });
});

describe('useFilterStore — setPriceRange (min / max)', () => {
  beforeEach(resetStore);

  it('updates priceMin', () => {
    useFilterStore.getState().setPriceMin(50000);
    expect(useFilterStore.getState().priceMin).toBe(50000);
  });

  it('updates priceMax', () => {
    useFilterStore.getState().setPriceMax(200000);
    expect(useFilterStore.getState().priceMax).toBe(200000);
  });

  it('can set both priceMin and priceMax independently', () => {
    useFilterStore.getState().setPriceMin(30000);
    useFilterStore.getState().setPriceMax(150000);
    expect(useFilterStore.getState().priceMin).toBe(30000);
    expect(useFilterStore.getState().priceMax).toBe(150000);
  });

  it('clears priceMin when set to null', () => {
    useFilterStore.getState().setPriceMin(50000);
    useFilterStore.getState().setPriceMin(null);
    expect(useFilterStore.getState().priceMin).toBeNull();
  });

  it('clears priceMax when set to null', () => {
    useFilterStore.getState().setPriceMax(200000);
    useFilterStore.getState().setPriceMax(null);
    expect(useFilterStore.getState().priceMax).toBeNull();
  });
});

describe('useFilterStore — resetFilters', () => {
  beforeEach(resetStore);

  it('clears all filter fields back to their initial values', () => {
    // Populate every field.
    useFilterStore.getState().setSelectedClubs(['club-1', 'club-2']);
    useFilterStore.getState().setTimeRange('morning');
    useFilterStore.getState().setPriceMin(10000);
    useFilterStore.getState().setPriceMax(99000);

    useFilterStore.getState().resetFilters();

    const state = useFilterStore.getState();
    expect(state.selectedClubs).toEqual([]);
    expect(state.timeRange).toBeNull();
    expect(state.priceMin).toBeNull();
    expect(state.priceMax).toBeNull();
  });

  it('is safe to call on an already-reset store', () => {
    useFilterStore.getState().resetFilters();

    const state = useFilterStore.getState();
    expect(state.selectedClubs).toEqual([]);
    expect(state.timeRange).toBeNull();
  });
});
