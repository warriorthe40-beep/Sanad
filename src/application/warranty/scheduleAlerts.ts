import type { Alert } from '@/data/models';
import type { AlertType } from '@/shared/types/common';
import { alertRepository } from '@/data/repositories';

const ALERT_THRESHOLDS_DAYS = [90, 60, 30, 7] as const;

/**
 * Schedule expiry alerts for a purchase. Steps 17–20 of the sequence
 * diagram:
 *   17. scheduleAlerts(purchaseId, warrantyEnd)
 *   18. generate(90, 60, 30, 7 days)
 *   19. save(alerts)
 *   20. Alerts scheduled
 *
 * One Alert record is created per threshold, with `alertDate` computed as
 * `expiryDate - thresholdDays`. Thresholds that have already passed are
 * skipped so the user never sees a "fires in the past" alert.
 */
export async function scheduleAlerts(
  purchaseId: string,
  expiryDate: Date,
  type: AlertType
): Promise<Alert[]> {
  const now = new Date();
  const created: Alert[] = [];

  for (const threshold of ALERT_THRESHOLDS_DAYS) {
    const days: number = threshold;
    const alertDate = new Date(expiryDate);
    alertDate.setDate(alertDate.getDate() - days);
    if (alertDate.getTime() <= now.getTime()) continue;

    const alert = await alertRepository.create({
      purchaseId,
      type,
      message:
        type === 'warranty'
          ? `Warranty expires in ${days} day${days === 1 ? '' : 's'}`
          : `Return window closes in ${days} day${days === 1 ? '' : 's'}`,
      alertDate,
      daysBeforeExpiry: days,
      isRead: false,
    });
    created.push(alert);
  }

  return created;
}
