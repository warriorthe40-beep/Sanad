import type { Purchase } from '@/data/models';

/**
 * The subset of the Analytics model rendered on the current Analytics page.
 * Monthly-trend and other series from the full `Analytics` interface are
 * computed in later tasks when the corresponding charts land.
 */
export interface AnalyticsSummary {
  totalSpending: number;
  spendingByCategory: Record<string, number>;
  /** Fraction of purchases with recorded warranty coverage, in [0, 1]. */
  warrantyCoverage: number;
  /** Total number of purchases included in the summary. */
  purchaseCount: number;
}

/**
 * Compute analytics for a set of purchases. Implements the
 * Purchase-side operations `calculateTotals`, `getByCategory`, and
 * `getCoverage` from the UML Class Diagram's Analytics actor.
 *
 * Defensive-copies the category map so callers can mutate the result
 * without corrupting shared state.
 */
export function computeAnalytics(purchases: readonly Purchase[]): AnalyticsSummary {
  let totalSpending = 0;
  let withWarranty = 0;
  const spendingByCategory: Record<string, number> = {};

  for (const purchase of purchases) {
    totalSpending += purchase.price;
    spendingByCategory[purchase.categoryName] =
      (spendingByCategory[purchase.categoryName] ?? 0) + purchase.price;
    if (purchase.warrantyEndDate) withWarranty += 1;
  }

  const purchaseCount = purchases.length;
  const warrantyCoverage = purchaseCount === 0 ? 0 : withWarranty / purchaseCount;

  return {
    totalSpending,
    spendingByCategory,
    warrantyCoverage,
    purchaseCount,
  };
}
