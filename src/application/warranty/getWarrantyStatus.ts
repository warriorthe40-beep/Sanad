import type { Purchase } from '@/data/models';

/**
 * Plain-English status for a Purchase's warranty, computed from `warrantyEndDate`.
 *
 * `kind` drives colour/badge styling; `label` is the short string shown in
 * lists; `detail` is a longer phrase for the details page.
 */
export interface WarrantyStatusView {
  kind: 'none' | 'active' | 'expiring' | 'expired';
  label: string;
  detail: string;
  daysRemaining: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;

/** Days between `from` (start of day) and `to` (start of day). Negative if `to` is in the past. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / DAY_MS);
}

/**
 * Compute a UI-ready warranty status for a Purchase. Mirrors the UML
 * `Purchase.getWarrantyStatus()` / `getDaysRemaining()` operations.
 */
export function getWarrantyStatusView(
  purchase: Pick<Purchase, 'warrantyEndDate'>,
  now: Date = new Date()
): WarrantyStatusView {
  if (!purchase.warrantyEndDate) {
    return {
      kind: 'none',
      label: 'No warranty',
      detail: 'No warranty recorded for this purchase.',
      daysRemaining: null,
    };
  }

  const days = daysBetween(now, purchase.warrantyEndDate);

  if (days < 0) {
    const ago = Math.abs(days);
    return {
      kind: 'expired',
      label: 'Expired',
      detail: `Warranty expired ${ago} day${ago === 1 ? '' : 's'} ago.`,
      daysRemaining: days,
    };
  }

  if (days <= EXPIRING_SOON_DAYS) {
    return {
      kind: 'expiring',
      label: days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`,
      detail:
        days === 0
          ? 'Warranty expires today.'
          : `${days} day${days === 1 ? '' : 's'} left on warranty.`,
      daysRemaining: days,
    };
  }

  return {
    kind: 'active',
    label: `${days} days left`,
    detail: `${days} days left on warranty.`,
    daysRemaining: days,
  };
}

/** Same shape as `getWarrantyStatusView`, applied to the return-window end date. */
export function getReturnWindowView(
  purchase: Pick<Purchase, 'returnEndDate'>,
  now: Date = new Date()
): WarrantyStatusView {
  if (!purchase.returnEndDate) {
    return {
      kind: 'none',
      label: 'No return window',
      detail: 'No return window recorded.',
      daysRemaining: null,
    };
  }

  const days = daysBetween(now, purchase.returnEndDate);
  if (days < 0) {
    const ago = Math.abs(days);
    return {
      kind: 'expired',
      label: 'Closed',
      detail: `Return window closed ${ago} day${ago === 1 ? '' : 's'} ago.`,
      daysRemaining: days,
    };
  }

  return {
    kind: days <= 7 ? 'expiring' : 'active',
    label: days === 0 ? 'Closes today' : `${days} day${days === 1 ? '' : 's'} left`,
    detail:
      days === 0
        ? 'Return window closes today.'
        : `${days} day${days === 1 ? '' : 's'} left to return.`,
    daysRemaining: days,
  };
}
