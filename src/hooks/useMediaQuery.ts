'use client';

import { useEffect, useState } from 'react';

/** Client media query; false during SSR and the first paint. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);
  return matches;
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
