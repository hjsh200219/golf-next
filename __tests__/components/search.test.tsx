/**
 * SearchBar component tests
 *
 * Verifies date tab rendering, default selection, and search button presence.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import SearchBar from '@/components/search/SearchBar';
import { getNextNDays } from '@/lib/utils/date';

// ── next/navigation mock ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the three date tabs with Korean labels', () => {
    render(<SearchBar />);

    expect(screen.getByText('오늘')).toBeInTheDocument();
    expect(screen.getByText('내일')).toBeInTheDocument();
    expect(screen.getByText('모레')).toBeInTheDocument();
  });

  it('renders exactly three date tab buttons', () => {
    render(<SearchBar />);

    // The date buttons have aria-pressed attribute
    const dateTabs = screen.getAllByRole('button', { name: /오늘|내일|모레/i });
    // Each button contains both the label and a date sub-span
    // We look for all buttons with aria-pressed
    const pressedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.hasAttribute('aria-pressed'));

    expect(pressedButtons).toHaveLength(3);
  });

  it('defaults to today (first tab) when no date param is in the URL', () => {
    render(<SearchBar />);

    // With no ?date= param, the first date (today) should be selected.
    // aria-pressed="true" marks the active tab.
    const pressedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-pressed') === 'true');

    expect(pressedButtons).toHaveLength(1);

    // The selected button should contain "오늘"
    expect(pressedButtons[0]).toHaveTextContent('오늘');
  });

  it('the non-selected tabs have aria-pressed set to false', () => {
    render(<SearchBar />);

    const unpressedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-pressed') === 'false');

    expect(unpressedButtons).toHaveLength(2);

    const labels = unpressedButtons.map((btn) => btn.textContent);
    expect(labels.join('')).toContain('내일');
    expect(labels.join('')).toContain('모레');
  });

  it('renders the search (조회) button', () => {
    render(<SearchBar />);

    expect(screen.getByText('조회')).toBeInTheDocument();
  });

  it('displays formatted date sub-text for each tab', () => {
    render(<SearchBar />);

    // The date utility getNextNDays produces YYYY-MM-DD strings.
    // formatDateKorean converts them to "M월 D일 (요일)" format.
    // We verify that at least one date sub-text is rendered by checking
    // for the Korean month character pattern.
    const allText = document.body.textContent ?? '';
    expect(allText).toMatch(/\d+월 \d+일/);
  });

  it('today tab is the first in DOM order', () => {
    render(<SearchBar />);

    const pressedButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.hasAttribute('aria-pressed'));

    expect(pressedButtons[0]).toHaveTextContent('오늘');
    expect(pressedButtons[1]).toHaveTextContent('내일');
    expect(pressedButtons[2]).toHaveTextContent('모레');
  });
});
