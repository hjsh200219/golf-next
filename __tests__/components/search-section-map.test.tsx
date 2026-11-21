/**
 * SearchSection — 지도 보기 연결.
 * Mobile defaults to 지도 + 바텀시트; 골프장별·시간순 lists stay one tap away.
 * Desktop (md+) keeps the existing list layout with no 지도 option.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useTeeTimes', () => ({
  useTeeTimes: () => ({ data: [], isLoading: false, isValidating: false, error: undefined, refresh: vi.fn() }),
}));
vi.mock('@/hooks/useClubs', () => ({
  useClubs: () => ({ data: [], isLoading: false, error: undefined, mutate: vi.fn() }),
}));
vi.mock('@/hooks/useFavorites', () => ({ useFavorites: () => ({ favoriteIds: [] }) }));
vi.mock('@/components/map/MapExplorer', () => ({
  default: (p: { viewSwitch?: React.ReactNode }) => <div data-testid="map-explorer">{p.viewSwitch}</div>,
}));
vi.mock('@/components/results/TeeTimeTable', () => ({
  default: (p: { viewMode: string }) => <div data-testid="table">{p.viewMode}</div>,
}));

function setDesktop(desktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: desktop && q.includes('min-width: 768px'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

async function renderSection() {
  const { default: SearchSection } = await import('@/components/search/SearchSection');
  const { useUIPreferences } = await import('@/hooks/useFilters');
  useUIPreferences.setState({ viewMode: 'map' });
  return render(<SearchSection />);
}

beforeEach(() => vi.resetModules());

describe('SearchSection map view', () => {
  it('mobile opens on the map with a 지도/골프장별/시간순 switch', async () => {
    setDesktop(false);
    await renderSection();
    expect(screen.getByTestId('map-explorer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '지도' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '골프장별' }));
    expect(screen.getByTestId('table')).toHaveTextContent('club');
    expect(screen.queryByTestId('map-explorer')).not.toBeInTheDocument();
  });

  it('desktop keeps the list and offers no 지도 option', async () => {
    setDesktop(true);
    await renderSection();
    expect(screen.queryByTestId('map-explorer')).not.toBeInTheDocument();
    expect(screen.getByTestId('table')).toHaveTextContent('club');
    expect(screen.queryByRole('button', { name: '지도' })).not.toBeInTheDocument();
  });
});
