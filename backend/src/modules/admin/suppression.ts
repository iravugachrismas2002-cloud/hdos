// Copyright (c) 2026 HDOS Rwanda. All rights reserved.

export interface Cell {
  key: string;
  count: number | null;
  suppressed: boolean;
}

/**
 * Small-cell suppression for aggregate statistics: counts below `min` are hidden so individuals in
 * small cohorts cannot be singled out. Because totals are published, hiding exactly ONE cell would
 * let a reader recompute it by subtraction, so the next-smallest cell is hidden too
 * (complementary suppression).
 */
export const suppressSmallCells = (rows: { key: string; count: number }[], min: number): Cell[] => {
  const cells: Cell[] = rows.map((r) => ({ key: r.key, count: r.count, suppressed: r.count < min }));
  const hidden = cells.filter((c) => c.suppressed);

  if (hidden.length === 1 && cells.length > 1) {
    const next = cells
      .filter((c) => !c.suppressed)
      .sort((a, b) => (a.count as number) - (b.count as number))[0];
    if (next) next.suppressed = true;
  }

  return cells.map((c) => (c.suppressed ? { key: c.key, count: null, suppressed: true } : c));
};
