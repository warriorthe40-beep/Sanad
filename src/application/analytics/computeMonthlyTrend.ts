import type { Purchase } from '@/data/models';

export interface MonthlyTrendPoint {
  /** ISO month identifier, e.g. "2026-04". Stable key for React/recharts. */
  month: string;
  /** Human label, e.g. "Apr 2026". */
  label: string;
  /** Total spending in that month. */
  total: number;
}

/**
 * Bucket purchases into the last `monthsBack` calendar months (including
 * the current month), oldest-first. Empty months are filled with zero so
 * the resulting array always has `monthsBack` entries — the charts that
 * consume this don't need to worry about gaps.
 */
export function computeMonthlyTrend(
  purchases: readonly Purchase[],
  monthsBack = 6,
  now: Date = new Date()
): MonthlyTrendPoint[] {
  const points: MonthlyTrendPoint[] = [];
  const index: Record<string, number> = {};
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
    index[month] = points.length;
    points.push({ month, label, total: 0 });
  }

  for (const purchase of purchases) {
    const d = purchase.purchaseDate;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = index[month];
    if (bucket !== undefined) {
      points[bucket].total += purchase.price;
    }
  }

  return points;
}
