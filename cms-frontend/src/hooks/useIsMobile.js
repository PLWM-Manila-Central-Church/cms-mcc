import { useState, useEffect } from 'react';

/**
 * Returns true when viewport width <= breakpoint (default 768px).
 * Recalculates on resize. Safe for SSR (defaults to false).
 */
export default function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, [breakpoint]);
  return mobile;
}
