import { describe, expect, it } from "vitest";
import { findAdjacentBox, type NavRect } from "./spatialNav";

// A simple 2x2 grid, so directional expectations are unambiguous.
const A: NavRect = { ticker: "A", x0: 0, y0: 0, x1: 100, y1: 100 }; // top-left
const B: NavRect = { ticker: "B", x0: 100, y0: 0, x1: 200, y1: 100 }; // top-right
const C: NavRect = { ticker: "C", x0: 0, y0: 100, x1: 100, y1: 200 }; // bottom-left
const D: NavRect = { ticker: "D", x0: 100, y0: 100, x1: 200, y1: 200 }; // bottom-right
const GRID = [A, B, C, D];

describe("findAdjacentBox", () => {
  it("moves right/left/down/up across a simple grid", () => {
    expect(findAdjacentBox(A, "right", GRID)?.ticker).toBe("B");
    expect(findAdjacentBox(B, "left", GRID)?.ticker).toBe("A");
    expect(findAdjacentBox(A, "down", GRID)?.ticker).toBe("C");
    expect(findAdjacentBox(C, "up", GRID)?.ticker).toBe("A");
  });

  it("returns null when nothing exists in that direction", () => {
    expect(findAdjacentBox(A, "up", GRID)).toBeNull();
    expect(findAdjacentBox(A, "left", GRID)).toBeNull();
    expect(findAdjacentBox(B, "right", GRID)).toBeNull();
  });

  it("falls back to the nearest box in-direction when nothing shares the row/column", () => {
    // A tall box on the left, a short box far to the right that doesn't
    // vertically overlap the tall box at all — same-row search finds
    // nothing, so this only passes if the fallback pass runs.
    const tall: NavRect = { ticker: "TALL", x0: 0, y0: 0, x1: 50, y1: 300 };
    const shortFar: NavRect = { ticker: "SHORT", x0: 200, y0: 250, x1: 250, y1: 280 };
    expect(findAdjacentBox(tall, "right", [tall, shortFar])?.ticker).toBe("SHORT");
  });

  it("prefers the row/column match over a closer off-axis box", () => {
    const current: NavRect = { ticker: "CUR", x0: 0, y0: 0, x1: 50, y1: 50 };
    // Closer by raw center distance, but doesn't overlap current's y-range (0-50).
    const closerButOffRow: NavRect = { ticker: "OFF", x0: 60, y0: 60, x1: 110, y1: 110 };
    // Farther, but shares current's y-range (0-50).
    const sameRow: NavRect = { ticker: "ROW", x0: 200, y0: 0, x1: 250, y1: 50 };
    expect(findAdjacentBox(current, "right", [closerButOffRow, sameRow])?.ticker).toBe("ROW");
  });

  it("excludes the current box itself when it appears in candidates", () => {
    expect(findAdjacentBox(A, "right", [A, B])?.ticker).toBe("B");
  });
});
