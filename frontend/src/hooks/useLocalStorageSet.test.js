import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useLocalStorageSet } from "./useLocalStorageSet.js";

describe("useLocalStorageSet", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorageSet("test-key"));
    expect(result.current.has("a")).toBe(false);
  });

  it("toggling adds then removes an id, persisting to localStorage", () => {
    const { result } = renderHook(() => useLocalStorageSet("test-key"));

    act(() => result.current.toggle("note-1"));
    expect(result.current.has("note-1")).toBe(true);
    expect(JSON.parse(localStorage.getItem("test-key"))).toEqual(["note-1"]);

    act(() => result.current.toggle("note-1"));
    expect(result.current.has("note-1")).toBe(false);
  });

  it("loads previously persisted ids on mount", () => {
    localStorage.setItem("test-key", JSON.stringify(["note-1", "note-2"]));
    const { result } = renderHook(() => useLocalStorageSet("test-key"));
    expect(result.current.has("note-1")).toBe(true);
    expect(result.current.has("note-2")).toBe(true);
    expect(result.current.has("note-3")).toBe(false);
  });

  it("tolerates corrupt JSON already in storage instead of throwing", () => {
    localStorage.setItem("test-key", "{not valid json");
    const { result } = renderHook(() => useLocalStorageSet("test-key"));
    expect(result.current.has("anything")).toBe(false);
  });

  it("remove deletes an id and never re-adds it, unlike toggle", () => {
    const { result } = renderHook(() => useLocalStorageSet("test-key"));

    act(() => result.current.toggle("note-1"));
    expect(result.current.has("note-1")).toBe(true);

    act(() => result.current.remove("note-1"));
    expect(result.current.has("note-1")).toBe(false);

    // Calling remove again (already absent) is a no-op, not a re-add.
    act(() => result.current.remove("note-1"));
    expect(result.current.has("note-1")).toBe(false);
  });
});
