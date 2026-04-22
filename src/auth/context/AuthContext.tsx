import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getCurrentAuthUser,
  login as loginService,
  logout as logoutService,
  register as registerService,
  userToAuthUser,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from '@/auth/services';
import { setCurrentUserId } from '@/shared/utils/currentUser';

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the initial session hydration is in flight. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydrate from an existing Supabase session on mount (reads localStorage)
    void getCurrentAuthUser().then((resolved) => {
      setUser(resolved);
      setCurrentUserId(resolved?.id ?? null);
      setIsLoading(false);
    });

    // Stay in sync across tab focus, token refresh, and sign-out
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const authed = userToAuthUser(session.user);
        setUser(authed);
        setCurrentUserId(authed.id);
      } else {
        setUser(null);
        setCurrentUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const authed = await loginService(input);
    setUser(authed);
    setCurrentUserId(authed.id);
    return authed;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const authed = await registerService(input);
    setUser(authed);
    setCurrentUserId(authed.id);
    return authed;
  }, []);

  const logout = useCallback(() => {
    logoutService();   // async signOut fired and forgotten
    setUser(null);
    setCurrentUserId(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}
