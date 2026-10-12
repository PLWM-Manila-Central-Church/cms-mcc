import { useEffect, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';

const POLL_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRY_INTERVAL_MS = 5 * 60_000;

export default function useNotificationPolling({ onNotifications, onError, pollIntervalMs = POLL_INTERVAL_MS }) {
  const callbacksRef = useRef({ onNotifications, onError });
  callbacksRef.current = { onNotifications, onError };

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let failures = 0;
    let timerId;

    const poll = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      let nextDelay = pollIntervalMs;

      try {
        const response = await axiosInstance.get('/notifications', { timeout: REQUEST_TIMEOUT_MS });
        if (stopped) return;
        failures = 0;
        callbacksRef.current.onNotifications(response.data.data || []);
      } catch (error) {
        if (stopped) return;
        failures = Math.min(failures + 1, 4);
        nextDelay = Math.min(pollIntervalMs * (2 ** failures), MAX_RETRY_INTERVAL_MS);
        callbacksRef.current.onError?.(error);
      } finally {
        inFlight = false;
        if (!stopped) timerId = window.setTimeout(poll, nextDelay);
      }
    };

    // Defer the first request one task so React StrictMode's development-only
    // setup/cleanup replay can cancel its first effect before it reaches the API.
    timerId = window.setTimeout(poll, 0);
    return () => {
      stopped = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [pollIntervalMs]);
}
