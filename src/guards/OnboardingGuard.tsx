import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePath } from '../hooks/usePath';

/**
 * A guard that ensures users complete the onboarding process.
 * Redirects to /onboarding if not completed, and prevents re-entry if already done.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading, user } = useAuth();
  const location = useLocation();
  const { prefix } = usePath();

  if (loading) return null;

  // Only apply to logged-in users
  if (!user) return <>{children}</>;

  const isOnOnboardingPage = location.pathname.includes('/onboarding');

  // Admins and staff always skip onboarding
  if (profile?.role === 'admin' || profile?.role === 'staff') {
    if (isOnOnboardingPage) return <Navigate to={prefix('/admin')} replace />;
    return <>{children}</>;
  }

  // Treat as completed if explicitly true OR if the user already has profile data
  const isCompleted =
    profile?.hasCompletedOnboarding === true ||
    (profile?.interests && profile.interests.length > 0);

  // Case 1: Not completed -> redirect to onboarding
  if (profile && !isCompleted && !isOnOnboardingPage) {
    return <Navigate to={prefix('/onboarding')} state={{ from: location }} replace />;
  }

  // Case 2: Already completed but trying to visit /onboarding -> redirect to dashboard
  if (profile && isCompleted && isOnOnboardingPage) {
    return <Navigate to={prefix('/dashboard')} replace />;
  }

  return <>{children}</>;
}
