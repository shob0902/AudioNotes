import { useCallback, useEffect, useState } from "react";

/**
 * A Set of string ids persisted to localStorage under `key`. Used for
 * purely client-side, per-browser state that has no backend model —
 * favorites and checked-off action items (see /architecture's "Future
 * Improvements" for why these aren't server-persisted: there's no auth to
 * scope them to a user).
 */
export function useLocalStorageSet(key) {
  const [set, setSet] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch {
      // Storage can be unavailable (private browsing, quota) — the feature
      // just silently stops persisting rather than breaking the page.
    }
  }, [key, set]);

  const has = useCallback((id) => set.has(id), [set]);

  const toggle = useCallback((id) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Used when the underlying thing an id refers to is gone for good (e.g. a
  // deleted note) — unlike toggle, never re-adds it.
  const remove = useCallback((id) => {
    setSet((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return { set, has, toggle, remove };
}
