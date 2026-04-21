/**
 * Shared string-literal unions used across data models.
 *
 * Centralising these keeps every layer in agreement about the small set of
 * allowed values without repeating them per-model.
 */

/** Role assigned to a user account. */
export type Role = 'user' | 'admin';

/** Kind of document attached to a purchase. */
export type DocumentType = 'receipt' | 'warranty_card' | 'invoice' | 'other';

/**
 * Derived warranty state for a purchase.
 * - `none`     — no warranty was recorded.
 * - `active`   — within the warranty window.
 * - `expiring` — within the alert threshold (<= 90 days to expiry).
 * - `expired`  — past the warranty end date.
 */
export type WarrantyStatus = 'none' | 'active' | 'expiring' | 'expired';

/** Kind of expiry an Alert refers to. */
export type AlertType = 'warranty' | 'return';

/** Lifecycle state of a Claim filed against a purchase. */
export type ClaimStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';

/** One data point in a monthly spending trend series. */
export interface MonthlyTrendPoint {
  /** ISO month identifier, e.g. `"2026-04"`. */
  month: string;
  /** Total spending for that month. */
  total: number;
}
