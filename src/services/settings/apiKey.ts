const STORAGE_KEY = 'sanad.anthropicApiKey';

/**
 * Lightweight localStorage-backed store for the user's Anthropic API key.
 *
 * The key is used by the browser-side Anthropic SDK client in
 * `src/services/anthropic/` to call the Vision API directly. Storing it
 * in localStorage means anyone with devtools access on this machine can
 * read it — that is the explicit tradeoff we accept for a university
 * prototype that ships without a backend proxy. The Settings page
 * discloses this to the user.
 */
export function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value && value.trim() ? value : null;
}

export function setApiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) {
    clearApiKey();
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, trimmed);
}

export function clearApiKey(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

/**
 * Mask an Anthropic API key for display — keeps the `sk-ant-` prefix and
 * last 4 characters so users can tell which key is saved without exposing
 * the full secret.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 10) return '••••';
  const tail = key.slice(-4);
  return `sk-ant-••••${tail}`;
}
