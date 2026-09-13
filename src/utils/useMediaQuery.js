import { useEffect, useState } from 'react';

/** Breakpoint below which the admin switches to its phone layout (bottom bar, stacked panes). */
export const ADMIN_MOBILE_BREAKPOINT = 900;

/** Reactive matchMedia hook. Safe during SSR/tests (returns false when matchMedia is unavailable). */
export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, [query]);

  return matches;
}

/** True on phones / small tablets where admin tabs should use their stacked layouts. */
export function useIsMobile() {
  return useMediaQuery(`(max-width: ${ADMIN_MOBILE_BREAKPOINT}px)`);
}
