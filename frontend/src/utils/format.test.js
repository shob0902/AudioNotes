import { describe, expect, it } from "vitest";

import { formatDuration, formatFileSize } from "./format.js";

describe("formatDuration", () => {
  it("renders seconds only under a minute", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("renders minutes for a typical recording", () => {
    expect(formatDuration(150)).toBe("2 min");
  });

  it("renders hours and minutes for long recordings", () => {
    expect(formatDuration(3900)).toBe("1h 5m");
  });

  it("handles missing duration gracefully", () => {
    expect(formatDuration(null)).toBe("Unknown duration");
    expect(formatDuration(undefined)).toBe("Unknown duration");
  });
});

describe("formatFileSize", () => {
  it("renders bytes for tiny sizes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("renders megabytes for typical audio files", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
