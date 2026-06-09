import { useState, useEffect, useRef } from 'react';

/**
 * Returns the current window.innerWidth, updating on resize.
 * Uses a ref to avoid stale closures. Defaults to 1280 for SSR.
 */
export default function useWindowWidth() {
  const widthRef = useRef(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [width, setWidth] = useState(widthRef.current);

  useEffect(() => {
    const fn = () => {
      widthRef.current = window.innerWidth;
      setWidth(window.innerWidth);
    };
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);

  return width;
}