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

    expect(screen.getByText('42')).toBeInTheDocument();
    const container = document.body.textContent ?? '';
    expect(container).toContain('건');
  });

  it('shows a large count formatted with Korean locale separators', () => {
    render(<ResultSummary count={1234} />);

    const container = document.body.textContent ?? '';
    expect(container).toMatch(/1[,.]?234|1234/);
  });

  it('shows zero count correctly', () => {
    render(<ResultSummary count={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders a loading skeleton when isLoading is true', () => {
    const { container } = render(<ResultSummary count={0} isLoading />);

    const shimmerElements = container.querySelectorAll('.animate-shimmer');
    expect(shimmerElements.length).toBeGreaterThanOrEqual(2);

    expect(screen.queryByText('건')).not.toBeInTheDocument();
  });

  it('does NOT render a loading skeleton when isLoading is false', () => {
    const { container } = render(<ResultSummary count={10} isLoading={false} />);

    const shimmerElements = container.querySelectorAll('.animate-shimmer');
    expect(shimmerElements).toHaveLength(0);
  });

  it('shows scraped time when scrapedAt is provided', () => {
    render(<ResultSummary count={5} scrapedAt="2026-03-27T14:30:00.000Z" />);

    const container = document.body.textContent ?? '';
    expect(container).toContain('수집');
  });

  it('does not show scraped time when scrapedAt is undefined', () => {
    render(<ResultSummary count={5} />);

    expect(screen.queryByText(/수집/)).not.toBeInTheDocument();
  });

  it('does not show scraped time when scrapedAt is null', () => {
    render(<ResultSummary count={5} scrapedAt={null} />);

    expect(screen.queryByText(/수집/)).not.toBeInTheDocument();
  });

  it('hides scraped time during loading even if scrapedAt is provided', () => {
    render(<ResultSummary count={5} scrapedAt="2026-03-27T14:30:00.000Z" isLoading />);

    expect(screen.queryByText(/수집/)).not.toBeInTheDocument();
  });
});

// ── LoadingState ───────────────────────────────────────────────────────────────

describe('LoadingState', () => {
  it('renders a skeleton grid', () => {
    const { container } = render(<LoadingState />);

    const shimmerElements = container.querySelectorAll('.animate-shimmer');
    expect(shimmerElements.length).toBeGreaterThan(0);
  });

  it('renders the default 8 data rows plus 1 header row', () => {
    const { container } = render(<LoadingState />);

    const rows = container.querySelectorAll('.grid.grid-cols-6');
    expect(rows).toHaveLength(9);
  });

  it('renders a custom number of rows when rows prop is supplied', () => {
    const { container } = render(<LoadingState rows={4} />);

    const rows = container.querySelectorAll('.grid.grid-cols-6');
    expect(rows).toHaveLength(5);
  });

  it('renders the header column labels in the skeleton', () => {
    render(<LoadingState />);

    expect(screen.queryByText('골프장')).not.toBeInTheDocument();
  });

  it('renders rounded container', () => {
    const { container } = render(<LoadingState />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('rounded-2xl');
  });
});
