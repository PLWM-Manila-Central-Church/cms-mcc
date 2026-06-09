import { useState, useCallback, useRef } from 'react';

/**
 * usePreventDoubleSubmit
 *
 * A React hook that guards against double-submits by wrapping async functions.
 * Returns { isSubmitting, withGuard }.
 *
 * @returns {{ isSubmitting: boolean, withGuard: Function }}
 */
export default function usePreventDoubleSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const guardRef = useRef(false);

  const withGuard = useCallback((asyncFn) => {
    if (guardRef.current) {
      return Promise.reject(new Error('Double-submit prevented: a request is already in progress.'));
    }

    guardRef.current = true;
    setIsSubmitting(true);

    return Promise.resolve()
      .then(() => asyncFn())
      .finally(() => {
        guardRef.current = false;
        setIsSubmitting(false);
      });
  }, []);

  return { isSubmitting, withGuard };
}