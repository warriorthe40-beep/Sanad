/**
 * Placeholder user id used until the Authentication layer is wired in.
 * Keeping this in one place means the later auth task only has to replace
 * this helper's implementation, not every call site.
 */
const DEMO_USER_ID = 'demo-user';

export function getCurrentUserId(): string {
  return DEMO_USER_ID;
}
