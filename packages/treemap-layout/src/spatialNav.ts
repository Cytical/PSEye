export type Direction = "up" | "down" | "left" | "right";

export interface NavRect {
  ticker: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isStrictlyInDirection(current: NavRect, candidate: NavRect, direction: Direction): boolean {
  switch (direction) {
    case "right":
      return candidate.x0 >= current.x1;
    case "left":
      return candidate.x1 <= current.x0;
    case "down":
      return candidate.y0 >= current.y1;
    case "up":
      return candidate.y1 <= current.y0;
  }
}

function centerDistanceSquared(a: NavRect, b: NavRect): number {
  const dx = (a.x0 + a.x1) / 2 - (b.x0 + b.x1) / 2;
  const dy = (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2;
  return dx * dx + dy * dy;
}

function nearest(current: NavRect, candidates: NavRect[]): NavRect | null {
  let best: NavRect | null = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const dist = centerDistanceSquared(current, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

/**
 * Arrow-key navigation for the market map's tile grid — treemap boxes are
 * squarified, not a uniform grid, so "the tile to the right" isn't just
 * "next in array order" the way it would be for a CSS grid. Two-pass search,
 * mirroring how a person visually scans:
 *
 * 1. Prefer a candidate that's both strictly in `direction` (its edge is at
 *    or past the current box's opposite edge) AND shares the cross-axis
 *    range with the current box (for left/right, overlapping y; for up/down,
 *    overlapping x) — i.e. "roughly the same row/column." Closest center
 *    wins among those.
 * 2. If nothing shares that row/column (e.g. the current box is the tallest
 *    in its row and nothing to its right starts that high), fall back to the
 *    closest candidate anywhere strictly in `direction`, so a press never
 *    just does nothing.
 *
 * Pure function over plain rects (not React refs/DOM) so it's usable outside
 * TreemapChart.tsx and testable without rendering anything.
 */
export function findAdjacentBox<T extends NavRect>(current: T, direction: Direction, candidates: T[]): T | null {
  const inDirection = candidates.filter((c) => isStrictlyInDirection(current, c, direction));

  const sameRowOrColumn = inDirection.filter((c) =>
    direction === "left" || direction === "right"
      ? rangesOverlap(current.y0, current.y1, c.y0, c.y1)
      : rangesOverlap(current.x0, current.x1, c.x0, c.x1)
  );

  return (nearest(current, sameRowOrColumn) as T | null) ?? (nearest(current, inDirection) as T | null);
}
