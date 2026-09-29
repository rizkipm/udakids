import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '@little-coder/engine';
import { useSession, type SessionKind } from './session';

/** Lindungi rute: belum masuk / peran tidak cocok → ke halaman masuk yang sesuai. */
export function RequireRole(props: {
  kind: SessionKind;
  roles: Role[];
  login: string;
  children: ReactNode;
}) {
  const session = useSession(props.kind);
  const location = useLocation();
  if (!session || !props.roles.includes(session.user.role)) {
    return <Navigate to={props.login} replace state={{ from: location.pathname }} />;
  }
  return <>{props.children}</>;
}
