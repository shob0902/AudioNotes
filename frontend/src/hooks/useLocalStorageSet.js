// Hook holding a Set of ids in localStorage, used for per-browser state like favorites.
import { useCallback, useEffect, useState } from "react";
// Loads the saved Set, writes it back on every change, and exposes read/toggle/remove helpers.
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
