/**
 * Hash a password using SHA-256 via Web Crypto.
 *
 * This is intentionally simple for the prototype: it satisfies the
 * "Never store plaintext" contract on User.password without pulling in a
 * dedicated crypto library. A production build would swap this for
 * bcrypt / scrypt / argon2 with a per-user salt and configurable cost.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(new Uint8Array(digest));
}

/** Timing-sensitive comparison would be ideal; for the prototype, equality is fine. */
export async function verifyPassword(
  password: string,
  hashed: string
): Promise<boolean> {
  const candidate = await hashPassword(password);
  return candidate === hashed;
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}
