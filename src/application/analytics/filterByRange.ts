import type { Purchase } from '@/data/models';

export type TimeRange = 'today' | 'month' | 'year' | 'all';

/**
 * Filter purchases to those whose `purchaseDate` falls within the given
 * named range, measured from `now`:
 *   - "today"  — same calendar day as `now`
 *   - "month"  — same calendar month + year
 *   - "year"   — same calendar year
 *   - "all"    — every purchase
 *
 * Used by the Analytics page's "Total Spending" toggle so users can see
 * spend for different horizons without re-querying the repository.
 */
export function filterPurchasesByRange(
  purchases: readonly Purchase[],
  range: TimeRange,
  now: Date = new Date()
): Purchase[] {
  if (range === 'all') return [...purchases];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'month') {
    start.setDate(1);
  } else if (range === 'year') {
    start.setMonth(0, 1);
  }
  return purchases.filter(
    (purchase) => purchase.purchaseDate.getTime() >= start.getTime()
  );
}
