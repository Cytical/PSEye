import { describe, expect, it } from "vitest";
import { kmeans, standardizeColumns } from "./clustering";

describe("standardizeColumns", () => {
  it("gives each column ~0 mean and unit std", () => {
    const { standardized, means, stds } = standardizeColumns([
      [1, 10],
      [2, 20],
      [3, 30],
    ]);
    expect(means).toEqual([2, 20]);
    // population std of [1,2,3] is sqrt(2/3)
    expect(stds[0]).toBeCloseTo(Math.sqrt(2 / 3), 10);
    // Column mean of standardized values is ~0.
    const col0 = standardized.map((r) => r[0]);
    expect(col0.reduce((s, x) => s + x, 0) / 3).toBeCloseTo(0, 10);
  });
  it("leaves a zero-variance column as zeros", () => {
    const { standardized } = standardizeColumns([
      [5, 1],
      [5, 2],
    ]);
    expect(standardized.map((r) => r[0])).toEqual([0, 0]);
  });
});

describe("kmeans", () => {
  const blobA = [
    [0, 0],
    [0.1, -0.1],
    [-0.1, 0.1],
    [0.05, 0.05],
  ];
  const blobB = [
    [10, 10],
    [10.1, 9.9],
    [9.9, 10.1],
    [10.05, 10.05],
  ];

  it("separates two well-separated blobs", () => {
    const { assignments } = kmeans([...blobA, ...blobB], 2, { seed: 1 });
    const labelsA = assignments.slice(0, 4);
    const labelsB = assignments.slice(4);
    // Every point in a blob shares a label, and the two blobs differ.
    expect(new Set(labelsA).size).toBe(1);
    expect(new Set(labelsB).size).toBe(1);
    expect(labelsA[0]).not.toBe(labelsB[0]);
  });

  it("is deterministic for a fixed seed", () => {
    const points = [...blobA, ...blobB];
    const a = kmeans(points, 2, { seed: 7 });
    const b = kmeans(points, 2, { seed: 7 });
    expect(a.assignments).toEqual(b.assignments);
  });

  it("returns k clusters even when points are few", () => {
    const { assignments, centroids } = kmeans(
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      3
    );
    expect(centroids).toHaveLength(3);
    expect(new Set(assignments).size).toBe(3);
  });

  it("handles the empty input gracefully", () => {
    expect(kmeans([], 3).assignments).toEqual([]);
  });
});
