import "@testing-library/jest-dom/vitest";

/**
 * This jsdom/Node combination doesn't provide a working `window.localStorage`
 * out of the box: Node 22+'s own experimental `localStorage` global is a
 * getter-only accessor (see the "--localstorage-file" warning) that blocks
 * simple assignment, and this jsdom version's `window.localStorage` is
 * itself `undefined` rather than a real Storage instance. Real browsers
 * always have a working localStorage — this only backfills the test
 * environment with a minimal, spec-compliant in-memory implementation so
 * hooks/components that use it (useLocalStorageSet, favorites, checked
 * action items) can be tested.
 */
if (typeof window !== "undefined" && !window.localStorage) {
  class MemoryStorage {
    #store = new Map();

    get length() {
      return this.#store.size;
    }
    getItem(key) {
      return this.#store.has(key) ? this.#store.get(key) : null;
    }
    setItem(key, value) {
      this.#store.set(key, String(value));
    }
    removeItem(key) {
      this.#store.delete(key);
    }
    clear() {
      this.#store.clear();
    }
    key(index) {
      return [...this.#store.keys()][index] ?? null;
    }
  }

  const memoryStorage = new MemoryStorage();
  for (const target of [globalThis, window]) {
    Object.defineProperty(target, "localStorage", {
      value: memoryStorage,
      writable: true,
      configurable: true,
    });
  }
}
