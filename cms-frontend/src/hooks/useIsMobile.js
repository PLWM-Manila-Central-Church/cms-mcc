import { useState, useEffect } from 'react';
import useWindowWidth from './useWindowWidth';

/**
 * Returns true when viewport width <= breakpoint (default 768px).
 * Recalculates on resize. Safe for SSR (defaults to false).
 */
export default function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  const width = useWindowWidth();

  useEffect(() => {
    setMobile(width <= breakpoint);
  }, [width, breakpoint]);

  return mobile;
}
