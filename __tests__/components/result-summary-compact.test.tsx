/**
 * ResultSummary compact — 지도 시트 머리에서는 수집 시각을 「17:05 수집」처럼 짧게(KST) 보여 잘리지 않게 한다.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ResultSummary from '@/components/results/ResultSummary';

describe('ResultSummary compact', () => {
  it('shows only the KST time of the last scrape', () => {
    render(<ResultSummary compact count={975} scrapedAt="2026-11-21T08:05:00Z" />);
    expect(screen.getByText('17:05 수집')).toBeInTheDocument();
    expect(screen.getByText('975')).toBeInTheDocument();
  });
});
