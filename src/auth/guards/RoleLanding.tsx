import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/context/AuthContext';

/**
 * RoleLanding — used as the index element at `/`. Sends admins straight
 * to `/admin` and regular users to `/purchases`. Unauthenticated
 * visitors fall through to `/login` via the outer RequireAuth guard.
 */
export default function RoleLanding() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/purchases" replace />;
}
