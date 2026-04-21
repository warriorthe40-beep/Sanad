import type { AlertType } from '@/shared/types/common';

/**
 * Alert — a warranty or return-window expiry notification.
 *
 * Per system_blueprint.md §3, alerts are generated at 90, 60, 30, and 7 days
 * before expiry for any purchase that recorded a warranty or return window.
 *
 * Relationships:
 *   Purchase  1 ──0..*  Alert  (via purchaseId)
 *
 * UML operations (implemented in the notifications application module):
 *   generate(), markAsRead(), sendPushNotification()
 */
export interface Alert {
  id: string;
  purchaseId: string;
  type: AlertType;
  /** Display message shown to the user. */
  message: string;
  /** When the alert should fire. */
  alertDate: Date;
  /** Days before expiry this alert represents (90, 60, 30, or 7). */
  daysBeforeExpiry: number;
  isRead: boolean;
}
