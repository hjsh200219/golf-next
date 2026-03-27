/**
 * useClubs hook tests
 *
 * Each renderHook is wrapped in an isolated SWRConfig with a fresh cache
 * provider so tests never share SWR cache state regardless of dedupingInterval.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { useClubs } from '@/hooks/useClubs';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wrap hook in an isolated SWR cache so tests never bleed state. */
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { provider: () => new Map() } },
    children,
  );
}

function makeFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  });
}

function makeFetchError(status = 500, statusText = 'Internal Server Error') {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({}),
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_CLUBS = [
  { id: 'ga', name: 'GA Korea', region: '경기남부', active: true },
  { id: 'ferrum', name: 'Ferrum Club', region: '경기남부', active: true },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useClubs', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', makeFetchOk(SAMPLE_CLUBS));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns isLoading=true and no data on initial render', () => {
    const { result } = renderHook(() => useClubs(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns club list after a successful fetch', async () => {
    vi.stubGlobal('fetch', makeFetchOk(SAMPLE_CLUBS));
    const { result } = renderHook(() => useClubs(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.data).toEqual(SAMPLE_CLUBS);
  });

  it('fetches from /api/clubs', async () => {
    const fetchMock = makeFetchOk(SAMPLE_CLUBS);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useClubs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe('/api/clubs');
  });

  it('sets error on a non-ok response', async () => {
    vi.stubGlobal('fetch', makeFetchError(503, 'Service Unavailable'));

    const { result } = renderHook(() => useClubs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toContain('503');
    expect(result.current.data).toBeUndefined();
  });

  it('exposes a mutate function', async () => {
    vi.stubGlobal('fetch', makeFetchOk(SAMPLE_CLUBS));

    const { result } = renderHook(() => useClubs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.mutate).toBe('function');
  });
});
