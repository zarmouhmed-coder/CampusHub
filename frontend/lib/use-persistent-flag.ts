"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

/** A per-browser boolean preference (e.g. collapsed sidebar). Falls back to `false`. */
export function usePersistentFlag(key: string): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => {
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const set = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Storage unavailable: the preference is simply not remembered.
      }
      listeners.forEach((notify) => notify());
    },
    [key],
  );
  return [value, set];
}
