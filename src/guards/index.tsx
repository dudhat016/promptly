import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Wraps protected routes — redirects to /login if unauthenticated.
 * Shows nothing while auth state is loading to prevent flash.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // Auth state loading
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}

/**
 * Wraps guest-only routes (login, register) — redirects to /dashboard if already authenticated.
 */
export function GuestOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

/**
 * Wraps admin routes — checks profile.role === 'admin'.
 * Must be used inside AuthGuard (user is guaranteed to exist).
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return null;
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

/**
 * Wraps premium features — redirects free users to /pricing.
 */
export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { isPro, loading } = useAuth();

  if (loading) return null;
  if (!isPro) return <Navigate to="/pricing" replace />;

  return <>{children}</>;
}
