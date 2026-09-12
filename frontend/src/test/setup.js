// Vitest setup that backfills a working localStorage, which this jsdom/Node combination lacks.
import "@testing-library/jest-dom/vitest";
if (typeof window !== "undefined" && !window.localStorage) {
  // Minimal in-memory stand-in for the browser Storage interface.
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
