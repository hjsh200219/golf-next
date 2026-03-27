/**
 * FavoriteToggle component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// useFavorites relies on SWR + useDeviceId. Mock the whole hook so that the
// component can be tested in isolation without a live API or localStorage.
//
// We use a mutable state object so individual tests can control isFavorite
// by mutating `mockState.favorited` before rendering.
const mockToggle = vi.fn();

interface MockState {
  favorited: boolean;
  loading: boolean;
}

const mockState: MockState = { favorited: false, loading: false };

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favoriteIds: mockState.favorited ? ['club-001'] : [],
    isLoading: mockState.loading,
    error: undefined,
    toggle: mockToggle,
    isFavorite: (id: string) => mockState.favorited && id === 'club-001',
    mutate: vi.fn(),
  }),
}));

// Import AFTER the mock is registered so the module resolves the mock.
const { default: FavoriteToggle } = await import(
  '@/components/favorites/FavoriteToggle'
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Read className safely from both HTML and SVG elements. */
function getClassName(el: Element): string {
  const cn = el.getAttribute('class') ?? '';
  return cn;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FavoriteToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.favorited = false;
    mockState.loading = false;
  });

  it('renders a button with a star icon', () => {
    const { container } = render(<FavoriteToggle clubId="club-001" />);

    const btn = container.querySelector('button');
    expect(btn).not.toBeNull();

    // The button contains an SVG (the star icon).
    const svg = btn!.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('has aria-label containing the add-favourite text when not favourited', () => {
    mockState.favorited = false;
    render(<FavoriteToggle clubId="club-001" clubName="테스트 골프장" />);

    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', '테스트 골프장 즐겨찾기 추가');
  });

  it('falls back to generic label when clubName is omitted', () => {
    mockState.favorited = false;
    render(<FavoriteToggle clubId="club-001" />);

    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toContain('즐겨찾기 추가');
  });

  it('shows an outlined (unfilled) star when the club is NOT a favourite', () => {
    mockState.favorited = false;
    const { container } = render(<FavoriteToggle clubId="club-001" />);

    const svg = container.querySelector('svg');
    // The outlined star has fill="none"
    expect(svg?.getAttribute('fill')).toBe('none');
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
  });

  it('shows a filled star when the club IS a favourite', () => {
    mockState.favorited = true;
    const { container } = render(<FavoriteToggle clubId="club-001" />);

    const svg = container.querySelector('svg');
    // The filled star has fill="currentColor" and no stroke attribute
    expect(svg?.getAttribute('fill')).toBe('currentColor');
    expect(svg?.hasAttribute('stroke')).toBe(false);
  });

  it('has aria-label containing the remove-favourite text when favourited', () => {
    mockState.favorited = true;
    render(<FavoriteToggle clubId="club-001" clubName="테스트 골프장" />);

    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', '테스트 골프장 즐겨찾기 해제');
  });

  it('calls toggle with the clubId when clicked', () => {
    mockState.favorited = false;
    render(<FavoriteToggle clubId="club-abc" />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockToggle).toHaveBeenCalledOnce();
    expect(mockToggle).toHaveBeenCalledWith('club-abc');
  });

  it('applies correct size class for sm variant', () => {
    mockState.favorited = false;
    const { container } = render(<FavoriteToggle clubId="c1" size="sm" />);
    const svg = container.querySelector('svg');
    // Use getAttribute('class') to read SVGAnimatedString safely
    const cls = svg?.getAttribute('class') ?? '';
    expect(cls).toContain('h-4');
    expect(cls).toContain('w-4');
  });

  it('applies correct size class for md variant (default)', () => {
    mockState.favorited = false;
    const { container } = render(<FavoriteToggle clubId="c1" />);
    const svg = container.querySelector('svg');
    const cls = svg?.getAttribute('class') ?? '';
    expect(cls).toContain('h-5');
    expect(cls).toContain('w-5');
  });

  it('applies correct size class for lg variant', () => {
    mockState.favorited = false;
    const { container } = render(<FavoriteToggle clubId="c1" size="lg" />);
    const svg = container.querySelector('svg');
    const cls = svg?.getAttribute('class') ?? '';
    expect(cls).toContain('h-6');
    expect(cls).toContain('w-6');
  });

  it('button has the yellow colour class when favourited', () => {
    mockState.favorited = true;
    render(<FavoriteToggle clubId="club-001" />);

    const btn = screen.getByRole('button');
    expect(getClassName(btn)).toContain('text-yellow-500');
  });

  it('button has the gray colour class when not favourited', () => {
    mockState.favorited = false;
    render(<FavoriteToggle clubId="club-001" />);

    const btn = screen.getByRole('button');
    expect(getClassName(btn)).toContain('text-gray-300');
  });

  it('button is disabled while isLoading is true', () => {
    mockState.loading = true;
    render(<FavoriteToggle clubId="club-001" />);

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });
});
