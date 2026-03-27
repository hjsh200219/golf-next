/**
 * Results component tests — ResultSummary and LoadingState
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ResultSummary from '@/components/results/ResultSummary';
import LoadingState from '@/components/results/LoadingState';

// ── ResultSummary ──────────────────────────────────────────────────────────────

describe('ResultSummary', () => {
  it('shows the result count', () => {
    render(<ResultSummary count={42} />);

    // The component renders "총 <count>건"
    expect(screen.getByText('42')).toBeInTheDocument();
    // "건" is part of the surrounding text
    const container = document.body.textContent ?? '';
    expect(container).toContain('총');
    expect(container).toContain('건');
  });

  it('shows a large count formatted with Korean locale separators', () => {
    render(<ResultSummary count={1234} />);

    // toLocaleString('ko-KR') on 1234 → "1,234" in most environments
    const container = document.body.textContent ?? '';
    // At minimum the digits are present
    expect(container).toMatch(/1[,.]?234|1234/);
  });

  it('shows zero count correctly', () => {
    render(<ResultSummary count={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders a loading skeleton when isLoading is true', () => {
    const { container } = render(<ResultSummary count={0} isLoading />);

    // The loading state renders two animated placeholder divs.
    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThanOrEqual(2);

    // The count text must NOT be visible during loading.
    expect(screen.queryByText('건')).not.toBeInTheDocument();
  });

  it('does NOT render a loading skeleton when isLoading is false', () => {
    const { container } = render(<ResultSummary count={10} isLoading={false} />);

    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements).toHaveLength(0);
  });

  it('shows scraped time when scrapedAt is provided', () => {
    // Use a fixed ISO string for deterministic output.
    render(<ResultSummary count={5} scrapedAt="2026-03-27T14:30:00.000Z" />);

    const container = document.body.textContent ?? '';
    expect(container).toContain('마지막 수집');
  });

  it('does not show scraped time when scrapedAt is undefined', () => {
    render(<ResultSummary count={5} />);

    expect(screen.queryByText(/마지막 수집/)).not.toBeInTheDocument();
  });

  it('does not show scraped time when scrapedAt is null', () => {
    render(<ResultSummary count={5} scrapedAt={null} />);

    expect(screen.queryByText(/마지막 수집/)).not.toBeInTheDocument();
  });

  it('hides scraped time during loading even if scrapedAt is provided', () => {
    render(<ResultSummary count={5} scrapedAt="2026-03-27T14:30:00.000Z" isLoading />);

    expect(screen.queryByText(/마지막 수집/)).not.toBeInTheDocument();
  });
});

// ── LoadingState ───────────────────────────────────────────────────────────────

describe('LoadingState', () => {
  it('renders a skeleton grid', () => {
    const { container } = render(<LoadingState />);

    // Should have animated skeleton elements
    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it('renders the default 8 data rows plus 1 header row', () => {
    const { container } = render(<LoadingState />);

    // The component renders a header row + 8 body rows by default.
    // Each row is a div with grid-cols-6.
    const rows = container.querySelectorAll('.grid.grid-cols-6');
    expect(rows).toHaveLength(9); // 1 header + 8 body
  });

  it('renders a custom number of rows when rows prop is supplied', () => {
    const { container } = render(<LoadingState rows={4} />);

    const rows = container.querySelectorAll('.grid.grid-cols-6');
    expect(rows).toHaveLength(5); // 1 header + 4 body
  });

  it('renders the header column labels in the skeleton', () => {
    render(<LoadingState />);

    // The header row is a skeleton — the column *labels* used as keys are
    // NOT rendered as text, only as invisible key props. The header row
    // just has 6 gray placeholder divs, so we confirm absence of label text.
    // (Labels only appear in TeeTimeTable's real table header, not here.)
    expect(screen.queryByText('골프장')).not.toBeInTheDocument();
  });

  it('renders rounded container with border', () => {
    const { container } = render(<LoadingState />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('rounded-xl');
    expect(wrapper.className).toContain('border');
  });
});
