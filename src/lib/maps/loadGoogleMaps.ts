/**
 * Loads the Google Maps JS API once per page (loading=async + callback).
 * The key (NEXT_PUBLIC_GOOGLE_MAP_API_KEY) is referrer-restricted: it works on
 * golfshin.vercel.app and localhost:3000, not on Vercel preview URLs — callers
 * must treat failure as normal and fall back to the list.
 */
let loading: Promise<typeof google> | null = null;
const authFailureListeners = new Set<() => void>();

declare global {
  interface Window {
    __golfshinMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

export function onMapsAuthFailure(cb: () => void): () => void {
  authFailureListeners.add(cb);
  return () => authFailureListeners.delete(cb);
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (loading) return loading;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY;
  if (!key) return Promise.reject(new Error('지도 키가 설정되지 않았습니다'));

  loading = new Promise<typeof google>((resolve, reject) => {
    window.gm_authFailure = () => authFailureListeners.forEach((cb) => cb());
    window.__golfshinMapsReady = () => resolve(window.google);
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.async = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      '&language=ko&region=KR&loading=async&callback=__golfshinMapsReady';
    script.addEventListener('error', () => {
      loading = null;
      reject(new Error('지도 스크립트를 불러오지 못했습니다'));
    });
    document.head.appendChild(script);
  });
  return loading;
}
