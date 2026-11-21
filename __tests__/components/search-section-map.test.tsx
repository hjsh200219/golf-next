/**
 * SearchSection — 지도 보기 연결.
 * Mobile defaults to 지도 + 바텀시트; 골프장별·시간순 lists stay one tap away.
 * Wide screens (md+, unfolded foldables, tablets, desktop) also default to 지도, in a split layout.
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
  default: (p: { viewSwitch?: React.ReactNode; layout?: string; mapEnabled?: boolean }) => (
    <div data-testid="map-explorer" data-layout={p.layout} data-map-enabled={String(p.mapEnabled)}>{p.viewSwitch}</div>
  ),
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

  it('mobile uses the bottom-sheet layout', async () => {
    setDesktop(false);
    await renderSection();
    expect(screen.getByTestId('map-explorer')).toHaveAttribute('data-layout', 'sheet');
    expect(screen.getByTestId('map-explorer')).toHaveAttribute('data-map-enabled', 'true');
  });

  it('wide screens default to the map in the split layout and keep the 지도 option', async () => {
    setDesktop(true);
    await renderSection();
    expect(screen.getByTestId('map-explorer')).toHaveAttribute('data-layout', 'split');
    expect(screen.getByTestId('map-explorer')).toHaveAttribute('data-map-enabled', 'true');
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '지도' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('wide screens can switch to 골프장별 and back to 지도', async () => {
    setDesktop(true);
    await renderSection();
    fireEvent.click(screen.getByRole('button', { name: '골프장별' }));
    expect(screen.getByTestId('table')).toHaveTextContent('club');
    expect(screen.getByRole('button', { name: '지도' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '지도' }));
    expect(screen.getByTestId('map-explorer')).toBeInTheDocument();
  });

  it('locks body scroll only while the map view is shown', async () => {
    setDesktop(true);
    await renderSection();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: '골프장별' }));
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
