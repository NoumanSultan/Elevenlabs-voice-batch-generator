'use client';

import { useEffect, useState } from 'react';

/**
 * Behaves like useState but persists the value to localStorage under `key`.
 * Safe for SSR: falls back to `initialValue` until mounted in the browser.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // Ignore malformed/blocked storage — fall back to initialValue.
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage might be full or disabled — fail silently.
    }
  }, [key, value, hydrated]);

  return [value, setValue];
}
