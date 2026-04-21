import type { Alert } from '@/data/models';

/**
 * Mock push-notification service.
 *
 * A real implementation would register a service-worker subscription with a
 * Web Push server and fire `showNotification` from the worker so alerts can
 * fire while the tab is closed. For the prototype we just:
 *   - request the browser's Notification permission when asked,
 *   - log a scheduled-for message to the console at alert-creation time, and
 *   - surface a toast-style `Notification` immediately for alerts whose
 *     window has already arrived, so the demo is observable.
 *
 * Keeping this behind a thin interface means switching to real Web Push
 * later only touches this file.
 */

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Read the current browser permission without prompting. */
export function getPermission(): PermissionState {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Prompt the user for notification permission if it hasn't been decided yet.
 * Returns the resulting state without throwing on unsupported browsers.
 */
export async function requestPermission(): Promise<PermissionState> {
  if (!isSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * "Schedule" a push notification for an Alert. In the prototype this is a
 * synchronous log, plus an immediate `Notification` when the alert's fire
 * time is already in the past (so the demo shows a real notification).
 */
export function schedulePush(alert: Alert): void {
  const fireAt = alert.alertDate.toISOString();
  // eslint-disable-next-line no-console
  console.info(
    `[sanad:push] scheduled "${alert.message}" for ${fireAt} (alert=${alert.id})`
  );

  if (!isSupported() || getPermission() !== 'granted') return;

  const now = Date.now();
  if (alert.alertDate.getTime() <= now) {
    showMockNotification(alert);
  }
}

function showMockNotification(alert: Alert): void {
  try {
    new Notification('Sanad reminder', {
      body: alert.message,
      tag: alert.id,
    });
  } catch {
    /* swallow — browser can refuse to construct Notification outside a user gesture */
  }
}
