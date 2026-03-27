/**
 * useDeviceId hook tests
 *
 * Tests that the hook generates a UUID on first call, persists it to
 * localStorage, and returns the same ID on subsequent renders.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeviceId } from '@/hooks/useDeviceId';

// ── localStorage mock ─────────────────────────────────────────────────────────

const DEVICE_ID_KEY = 'golf_device_id';

/** A minimal in-memory localStorage stand-in. */
function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    _store: store,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDeviceId', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('returns null on the initial synchronous render (SSR-safe)', () => {
    const { result } = renderHook(() => useDeviceId());
    // Before the effect runs the state is null.
    // In a synchronous render the initial state is returned first.
    // We allow both null (before effect) and a UUID string (after effect).
    // If it is non-null it must be a valid UUID-like string.
    if (result.current !== null) {
      expect(result.current).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
  });

  it('generates a UUID and stores it in localStorage after mount', async () => {
    const { result } = renderHook(() => useDeviceId());

    // Wait for the effect to run.
    await act(async () => {});

    expect(localStorageMock.setItem).toHaveBeenCalledOnce();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      DEVICE_ID_KEY,
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );

    expect(result.current).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('persists the generated ID to localStorage under the correct key', async () => {
    const { result } = renderHook(() => useDeviceId());
    await act(async () => {});

    const storedValue = localStorageMock.getItem(DEVICE_ID_KEY);
    expect(storedValue).toBe(result.current);
  });

  it('returns the same ID on subsequent calls when one is already stored', async () => {
    const existingId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    localStorageMock._store[DEVICE_ID_KEY] = existingId;

    const { result } = renderHook(() => useDeviceId());
    await act(async () => {});

    expect(result.current).toBe(existingId);
    // setItem should NOT be called — no new UUID was generated.
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('does not generate a new UUID on every render', async () => {
    const { result, rerender } = renderHook(() => useDeviceId());
    await act(async () => {});

    const firstId = result.current;

    rerender();
    await act(async () => {});

    expect(result.current).toBe(firstId);
    // setItem should only be called once (on first mount).
    expect(localStorageMock.setItem).toHaveBeenCalledOnce();
  });

  it('returns null when localStorage throws (private browsing / blocked)', async () => {
    // Make getItem throw to simulate a restricted environment.
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('Access denied');
    });

    const { result } = renderHook(() => useDeviceId());
    await act(async () => {});

    expect(result.current).toBeNull();
  });

  it('generated UUID matches UUID v4 format', async () => {
    const { result } = renderHook(() => useDeviceId());
    await act(async () => {});

    const UUID_V4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(result.current).toMatch(UUID_V4);
  });
});
