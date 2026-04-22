import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '@/services/settings/apiKey';

/**
 * Thin wrapper over the Anthropic SDK.
 *
 * The SDK is instantiated per-call rather than as a singleton because the
 * user can rotate their key at runtime from the Settings page — a stale
 * singleton would happily keep sending the old key. `dangerouslyAllowBrowser`
 * is required for browser-side usage; see the Settings page for the security
 * note we surface to the user.
 */
export class MissingApiKeyError extends Error {
  constructor() {
    super('No Anthropic API key configured. Add one in Settings to enable receipt scanning.');
    this.name = 'MissingApiKeyError';
  }
}

export function createAnthropicClient(): Anthropic {
  const key = getApiKey();
  if (!key) throw new MissingApiKeyError();
  return new Anthropic({
    apiKey: key,
    dangerouslyAllowBrowser: true,
  });
}
