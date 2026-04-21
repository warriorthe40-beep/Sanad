import type { MonthlyTrendPoint } from '@/shared/types/common';

/**
 * Analytics — a per-user snapshot of spending statistics.
 *
 * Not persisted as its own collection; typically computed on demand from the
 * user's purchases. Modelled as an interface so repositories/services can
 * agree on the returned shape.
 *
 * UML operations (implemented in the analytics application module):
 *   calculateTotals(), getByCategory(), getMonthlyTrend(), getCoverage()
 */
export interface Analytics {
  userId: string;
  /** Total spending across all purchases. */
  totalSpending: number;
  /** Map of categoryName → total spending in that category. */
  spendingByCategory: Record<string, number>;
  monthlyTrend: MonthlyTrendPoint[];
  /** Fraction of purchases that carry warranty coverage, in [0, 1]. */
  warrantyCoverage: number;
}
