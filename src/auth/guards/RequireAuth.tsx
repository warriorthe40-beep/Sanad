import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/context/AuthContext';

/**
 * RequireAuth — route wrapper that bounces unauthenticated visitors to
 * `/login`, preserving the intended path in location state so we can
 * send them back after they sign in.
 */
export default function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthSpinner />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function AuthSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand" />
    </div>
  );
}
