import type { Alert } from '@/data/models';
import type { AlertType } from '@/shared/types/common';
import { alertRepository } from '@/data/repositories';
import { schedulePush } from '@/application/notifications';
import { daysBetween } from './getWarrantyStatus';

interface Threshold {
  days: number;
  label: string;
}

// Warranty: > 1 year total — include the 1-year lead-time alert
const WARRANTY_THRESHOLDS_LONG: readonly Threshold[] = [
  { days: 365, label: '1 year' },
  { days: 180, label: '6 months' },
  { days: 90, label: '3 months' },
  { days: 30, label: '1 month' },
  { days: 7, label: '7 days' },
];

// Warranty: ≤ 1 year total — 1-year alert is meaningless, start from 6 months
const WARRANTY_THRESHOLDS_SHORT: readonly Threshold[] = [
  { days: 180, label: '6 months' },
  { days: 90, label: '3 months' },
  { days: 30, label: '1 month' },
  { days: 7, label: '7 days' },
];

// Returns: only relevant when window is long enough to act on
const RETURN_THRESHOLDS: readonly Threshold[] = [
  { days: 7, label: '7 days' },
  { days: 1, label: '1 day' },
];

function selectThresholds(type: AlertType, totalDays: number): readonly Threshold[] {
  if (type === 'return') {
    return totalDays > 7 ? RETURN_THRESHOLDS : [];
  }
  return totalDays > 365 ? WARRANTY_THRESHOLDS_LONG : WARRANTY_THRESHOLDS_SHORT;
}

/**
 * Schedule expiry alerts for a purchase.
 *
 * Warranty thresholds:
 *   - Total > 1 year: 1 year, 6 months, 3 months, 1 month, 7 days before expiry.
 *   - Total ≤ 1 year: 6 months (if applicable), 3 months, 1 month, 7 days.
 *
 * Return thresholds:
 *   - Total > 7 days: 7 days and 1 day before the window closes.
 *   - Total ≤ 7 days: no alerts scheduled.
 *
 * Alert dates already in the past (relative to now) are always skipped, so
 * rescheduling after an edit only creates alerts that are still actionable.
 */
export async function scheduleAlerts(
  purchaseId: string,
  purchaseDate: Date,
  expiryDate: Date,
  type: AlertType
): Promise<Alert[]> {
  const now = new Date();
  const totalDays = daysBetween(purchaseDate, expiryDate);
  const thresholds = selectThresholds(type, totalDays);
  const created: Alert[] = [];

  for (const { days, label } of thresholds) {
    const alertDate = new Date(expiryDate);
    alertDate.setDate(alertDate.getDate() - days);
    if (alertDate.getTime() <= now.getTime()) continue;

    const message =
      type === 'warranty'
        ? `Warranty expires in ${label}`
        : `Return window closes in ${label}`;

    const alert = await alertRepository.create({
      purchaseId,
      type,
      message,
      alertDate,
      daysBeforeExpiry: days,
      isRead: false,
    });
    schedulePush(alert);
    created.push(alert);
  }

  return created;
}
