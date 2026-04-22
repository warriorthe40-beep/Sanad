let _currentUserId: string | null = null;

/** Called by AuthProvider on every auth state change. */
export function setCurrentUserId(id: string | null): void {
  _currentUserId = id;
}

/**
 * Returns the Supabase Auth UID for the signed-in user.
 * Safe to call without null-checking on pages behind RequireAuth.
 */
export function getCurrentUserId(): string {
  return _currentUserId ?? '';
}
