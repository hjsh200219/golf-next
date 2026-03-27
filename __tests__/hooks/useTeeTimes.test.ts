/**
 * useTeeTimes hook tests
 *
 * Each renderHook is wrapped in an isolated SWRConfig with a fresh cache
 * provider so tests never share SWR cache state regardless of dedupingInterval.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { SWRConfig } from 'swr';
import { useTeeTimes } from '@/hooks/useTeeTimes';

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

const SAMPLE_TEE_TIMES = [
  { id: '1', cc_name: 'TestCC', date: '2026-03-28', teeoff: '09:00', course: 'A', price: 150000 },
  { id: '2', cc_name: 'TestCC', date: '2026-03-28', teeoff: '09:30', course: 'B', price: 160000 },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTeeTimes', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', makeFetchOk(SAMPLE_TEE_TIMES));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns isLoading=true and no data on initial render when date is provided', () => {
    const { result } = renderHook(() => useTeeTimes('2026-03-28'), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns data after a successful fetch', async () => {
    vi.stubGlobal('fetch', makeFetchOk(SAMPLE_TEE_TIMES));
    const { result } = renderHook(() => useTeeTimes('2026-03-28'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.data).toEqual(SAMPLE_TEE_TIMES);
  });

  it('does not fetch when date is null (key is null)', () => {
    const fetchMock = makeFetchOk([]);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTeeTimes(null), { wrapper });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('includes date in the request URL', async () => {
    const fetchMock = makeFetchOk(SAMPLE_TEE_TIMES);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTeeTimes('2026-03-28'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('date=2026-03-28');
  });

  it('includes clubs query param when clubIds are provided', async () => {
    const fetchMock = makeFetchOk(SAMPLE_TEE_TIMES);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTeeTimes('2026-03-28', ['ga', 'ferrum']), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('clubs=ga%2Cferrum');
  });

  it('omits clubs query param when clubIds is empty', async () => {
    const fetchMock = makeFetchOk([]);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTeeTimes('2026-03-28', []), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('clubs=');
  });

  it('sets error and clears data on a non-ok response', async () => {
    vi.stubGlobal('fetch', makeFetchError(500, 'Internal Server Error'));

    const { result } = renderHook(() => useTeeTimes('2026-03-28'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toContain('500');
    expect(result.current.data).toBeUndefined();
  });

  it('exposes a refresh function that can be called without throwing', async () => {
    vi.stubGlobal('fetch', makeFetchOk(SAMPLE_TEE_TIMES));

    const { result } = renderHook(() => useTeeTimes('2026-03-28'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.refresh()).resolves.not.toThrow();
  });
});
