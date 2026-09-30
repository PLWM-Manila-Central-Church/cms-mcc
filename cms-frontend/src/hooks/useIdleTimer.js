import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useIdleTimer — tracks user activity and fires idle callback.
 * @param {number} timeoutMs — inactivity threshold in ms (default 15min)
 * @returns {{ idle: boolean, resetTimer: () => void }}
 */
export default function useIdleTimer(timeoutMs = 15 * 60 * 1000) {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef(null);
  const idleRef = useRef(false); // ref to avoid stale closure

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (idleRef.current) {
      idleRef.current = false;
      setIdle(false);
    }
    timerRef.current = setTimeout(() => {
      idleRef.current = true;
      setIdle(true);
    }, timeoutMs);
  }, [timeoutMs]); // no longer depends on `idle` state

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimer();

    // Start the timer
    resetTimer();

    // Register listeners
    events.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(ev => window.removeEventListener(ev, handleActivity));
    };
  }, [resetTimer]);

  return { idle, resetTimer };
}