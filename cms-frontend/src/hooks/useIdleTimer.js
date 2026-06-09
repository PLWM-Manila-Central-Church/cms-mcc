import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useIdleTimer — tracks user activity and fires idle callback.
 * @param {number} timeoutMs — inactivity threshold in ms (default 15min)
 * @returns {{ idle: boolean, resetTimer: () => void }}
 */
export default function useIdleTimer(timeoutMs = 15 * 60 * 1000) {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (idle) setIdle(false); // user came back
    timerRef.current = setTimeout(() => {
      setIdle(true);
    }, timeoutMs);
  }, [timeoutMs, idle]);

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