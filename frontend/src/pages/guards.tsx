import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { components } from '../api/schema';
import { useAuth } from '../auth';
import { homeFor } from '../lib/home';

type Role = components['schemas']['Role'];

function Splash() {
  return (
    <div className="page-center" role="status" aria-live="polite">
      <span className="ui-muted">Loading…</span>
    </div>
  );
}

/** Logged-out → /login. Logged in with the wrong role → that role's home. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

/** For /login and /register: a logged-in user goes to their home. */
export function RequireLoggedOut({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Splash />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
