import { getSessionUserId } from '@/auth/services/session';

/**
 * Resolve the currently signed-in user's id. Pages that use this helper
 * live behind RequireAuth, so a session is always populated by the time
 * they render. The 'demo-user' fallback is a last-resort placeholder for
 * non-interactive contexts (tests, early bootstrapping).
 */
export function getCurrentUserId(): string {
  return getSessionUserId() ?? 'demo-user';
}
