/**
 * Pure, dependency-free k-means clustering + feature standardization. Written
 * from scratch (not an ML library) so it stays unit-testable, adds no bundle
 * weight, and is deterministic for ISR: a fixed-seed PRNG + k-means++ seeding
 * means the same data always yields the same clusters across revalidations.
 *
 * Used by lib/stockClusters.ts to group PSE stocks by return behavior
 * (volatility / beta / momentum / correlation). Points are plain number[][]
 * (rows = observations, columns = features); nothing here knows about stocks.
 */

/** Deterministic PRNG (mulberry32) — reproducible clusters without a global RNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function euclideanSq(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return sum;
}

/**
 * Z-score each column (feature) independently so no single feature dominates
 * the distance metric by scale. Returns the standardized rows plus the per-
 * column means/stds (so a caller can interpret centroids back in real units if
 * it wants). A zero-variance column is left as all-zeros.
 */
export function standardizeColumns(rows: number[][]): {
  standardized: number[][];
  means: number[];
  stds: number[];
} {
  const n = rows.length;
  const d = n > 0 ? rows[0].length : 0;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(0);

  for (const row of rows) for (let j = 0; j < d; j++) means[j] += row[j];
  for (let j = 0; j < d; j++) means[j] /= n || 1;

  for (const row of rows) for (let j = 0; j < d; j++) stds[j] += (row[j] - means[j]) ** 2;
  for (let j = 0; j < d; j++) stds[j] = Math.sqrt(stds[j] / (n || 1));

  const standardized = rows.map((row) =>
    row.map((v, j) => (stds[j] > 0 ? (v - means[j]) / stds[j] : 0))
  );
  return { standardized, means, stds };
}

/** k-means++ seeding: spread initial centroids out, weighted by squared distance. */
function kmeansPlusPlus(points: number[][], k: number, rng: () => number): number[][] {
  const centroids: number[][] = [];
  centroids.push([...points[Math.floor(rng() * points.length)]]);

  while (centroids.length < k) {
    const dists = points.map((p) => Math.min(...centroids.map((c) => euclideanSq(p, c))));
    const total = dists.reduce((s, x) => s + x, 0);
    if (total === 0) {
      // All remaining points coincide with a centroid; pad with copies.
      centroids.push([...points[Math.floor(rng() * points.length)]]);
      continue;
    }
    let target = rng() * total;
    let idx = 0;
    while (idx < dists.length - 1 && (target -= dists[idx]) > 0) idx++;
    centroids.push([...points[idx]]);
  }
  return centroids;
}

export interface KMeansResult {
  /** Cluster index (0..k-1) for each input point, in input order. */
  assignments: number[];
  /** Final centroid coordinates, one per cluster. */
  centroids: number[][];
  iterations: number;
}

/**
 * Lloyd's algorithm with k-means++ init. Deterministic given `seed`. Empty
 * clusters are re-seeded to the point farthest from its own centroid, so k
 * clusters are always returned. Caller should standardize features first.
 */
export function kmeans(
  points: number[][],
  k: number,
  { maxIter = 100, seed = 42 }: { maxIter?: number; seed?: number } = {}
): KMeansResult {
  const n = points.length;
  if (n === 0 || k <= 0) return { assignments: [], centroids: [], iterations: 0 };
  if (k >= n) {
    // Each point is its own cluster (nothing to merge).
    return { assignments: points.map((_, i) => i), centroids: points.map((p) => [...p]), iterations: 0 };
  }

  const rng = mulberry32(seed);
  let centroids = kmeansPlusPlus(points, k, rng);
  const assignments = new Array(n).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;
    let changed = false;

    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const dist = euclideanSq(points[i], centroids[c]);
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }

    const d = points[0].length;
    const sums = Array.from({ length: k }, () => new Array(d).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      counts[assignments[i]]++;
      const row = sums[assignments[i]];
      for (let j = 0; j < d; j++) row[j] += points[i][j];
    }

    centroids = sums.map((sum, c) => {
      if (counts[c] > 0) return sum.map((v) => v / counts[c]);
      // Empty cluster: re-seed to the worst-fit point.
      let worst = 0;
      let worstDist = -1;
      for (let i = 0; i < n; i++) {
        const dist = euclideanSq(points[i], centroids[assignments[i]]);
        if (dist > worstDist) {
          worstDist = dist;
          worst = i;
        }
      }
      return [...points[worst]];
    });

    if (!changed && iter > 0) break;
  }

  return { assignments, centroids, iterations };
}
