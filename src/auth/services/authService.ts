import type { Admin, User } from '@/data/models';
import { userRepository } from '@/data/repositories';
import { hashPassword, verifyPassword } from './passwordHash';
import { clearSession, getSessionUserId, setSessionUserId } from './session';

/**
 * AuthUser — the user object safe to carry around in memory and React
 * state. Always lacks the password hash.
 */
export type AuthUser = Omit<User, 'password'> & Partial<Pick<Admin, 'adminLevel'>>;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  asAdmin?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Strip the password hash so UI state never holds secrets. */
function toAuthUser(user: User): AuthUser {
  const { password: _password, ...rest } = user;
  return rest as AuthUser;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) throw new AuthError('Name is required.');
  if (!email) throw new AuthError('Email is required.');
  if (input.password.length < 8) {
    throw new AuthError('Password must be at least 8 characters.');
  }

  const existing = await userRepository.getByEmail(email);
  if (existing) throw new AuthError('An account with that email already exists.');

  const password = await hashPassword(input.password);
  const draft: Omit<User, 'id'> = input.asAdmin
    ? ({
        name,
        email,
        password,
        role: 'admin',
        adminLevel: 'super',
      } as Omit<Admin, 'id'>)
    : { name, email, password, role: 'user' };

  const created = await userRepository.create(draft);
  setSessionUserId(created.id);
  return toAuthUser(created);
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new AuthError('Email is required.');
  if (!input.password) throw new AuthError('Password is required.');

  const user = await userRepository.getByEmail(email);
  if (!user) throw new AuthError('No account found for that email.');

  const ok = await verifyPassword(input.password, user.password);
  if (!ok) throw new AuthError('Incorrect password.');

  setSessionUserId(user.id);
  return toAuthUser(user);
}

export function logout(): void {
  clearSession();
}

/**
 * Resolve the currently logged-in user by reading the session id and
 * rehydrating from the user repository. Returns null when there's no
 * session or the stored id is stale (e.g. user was deleted).
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const id = getSessionUserId();
  if (!id) return null;
  const user = await userRepository.getById(id);
  return user ? toAuthUser(user) : null;
}
