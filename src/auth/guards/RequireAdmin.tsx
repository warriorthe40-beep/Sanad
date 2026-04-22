import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/context/AuthContext';

/**
 * RequireAdmin — layered on top of RequireAuth for /admin/* routes.
 * Non-admin users are redirected to their own dashboard; unauthenticated
 * visitors were already bounced by RequireAuth above it in the tree.
 */
export default function RequireAdmin() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/purchases" replace />;

  return <Outlet />;
}
