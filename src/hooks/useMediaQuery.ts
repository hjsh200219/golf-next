'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Client media query. null while server rendering and hydrating (screen size
 * unknown), so markup never differs between server and the first client paint.
 */
export function useMediaQuery(query: string): boolean | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener?.('change', cb);
      return () => mql.removeEventListener?.('change', cb);
    },
    [query],
  );
  return useSyncExternalStore<boolean | null>(
    subscribe,
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    () => null,
  );
}

/** Height of the fixed mobile bottom nav ([data-mobile-nav]), 0 when absent. */
export function useMobileNavHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('[data-mobile-nav]');
    if (!nav || typeof ResizeObserver === 'undefined') return;
    const measure = () => setH(nav.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);
  return h;
}
