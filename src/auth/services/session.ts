/**
 * Session — tiny localStorage wrapper holding the currently logged-in
 * user's id. Passwords and other sensitive data never pass through here;
 * hydration from id → full user happens via UserRepository.
 */

const SESSION_KEY = 'sanad:currentUserId';

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getSessionUserId(): string | null {
  return safeStorage()?.getItem(SESSION_KEY) ?? null;
}

export function setSessionUserId(id: string): void {
  safeStorage()?.setItem(SESSION_KEY, id);
}

export function clearSession(): void {
  safeStorage()?.removeItem(SESSION_KEY);
}
