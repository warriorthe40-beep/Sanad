import { supabase } from '@/lib/supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

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

export function userToAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.name as string | undefined) ?? '',
    role: (user.user_metadata?.role as 'user' | 'admin' | undefined) ?? 'user',
  };
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const name = input.name.trim();
  if (!name) throw new AuthError('Name is required.');
  if (input.password.length < 8) {
    throw new AuthError('Password must be at least 8 characters.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        name,
        role: input.asAdmin ? 'admin' : 'user',
      },
    },
  });

  if (error) throw new AuthError(error.message);
  if (!data.user) throw new AuthError('Registration failed. Please try again.');
  if (!data.session) {
    throw new AuthError(
      'Account created — check your email to confirm it, then sign in.'
    );
  }

  return userToAuthUser(data.user);
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  if (error) throw new AuthError(error.message);
  if (!data.user) throw new AuthError('Sign in failed. Please try again.');

  return userToAuthUser(data.user);
}

/** Fire-and-forget — context clears state synchronously before this resolves. */
export function logout(): void {
  void supabase.auth.signOut();
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;
  return userToAuthUser(session.user);
}
