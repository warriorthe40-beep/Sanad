import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getCurrentAuthUser,
  login as loginService,
  logout as logoutService,
  register as registerService,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from '@/auth/services';

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the initial session hydration is in flight. */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider — hydrates the current user from the persisted session on
 * mount and exposes login / register / logout helpers that keep the
 * context in sync with the session.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getCurrentAuthUser()
      .then((resolved) => {
        if (!cancelled) setUser(resolved);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const authed = await loginService(input);
    setUser(authed);
    return authed;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const authed = await registerService(input);
    setUser(authed);
    return authed;
  }, []);

  const logout = useCallback(() => {
    logoutService();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}
