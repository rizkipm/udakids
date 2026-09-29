import type { ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { setSession, useSession } from '../auth/session';
import { t } from '../i18n';
import { Button } from '../ui/ui';
import { ChildForm } from './ChildForm';
import { Dashboard } from './Dashboard';
import { ParentLogin, ParentRegister } from './ParentAuth';
import { ReportPage } from './ReportPage';
import './parent.css';

/** Hanya untuk orang tua yang sudah masuk; selain itu ke /orang-tua/masuk. */
function RequireParent({ children }: { children: ReactNode }) {
  const session = useSession('parent');
  const location = useLocation();
  if (!session || session.user.role !== 'parent') {
    return <Navigate to="/orang-tua/masuk" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Halaman masuk/daftar: bila sudah masuk, langsung ke dashboard. */
function GuestOnly({ children }: { children: ReactNode }) {
  const session = useSession('parent');
  if (session?.user.role === 'parent') return <Navigate to="/orang-tua" replace />;
  return <>{children}</>;
}

function ParentLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="ui-shell">
      <header className="ui-topbar pa-topbar">
        <Link to="/orang-tua" className="pa-brand">
          {t('parent.brand')}
        </Link>
        <Button
          variant="ghost"
          onClick={() => {
            // Hanya sesi orang tua; sesi anak dan kode keluarga di perangkat ini tetap.
            setSession('parent', null);
            navigate('/orang-tua/masuk', { replace: true });
          }}
        >
          {t('parent.logout')}
        </Button>
      </header>
      <main className="ui-main pa-main">{children}</main>
    </div>
  );
}

const guarded = (node: ReactNode) => (
  <RequireParent>
    <ParentLayout>{node}</ParentLayout>
  </RequireParent>
);

export function ParentApp() {
  return (
    <Routes>
      <Route
        path="masuk"
        element={
          <GuestOnly>
            <ParentLogin />
          </GuestOnly>
        }
      />
      <Route
        path="daftar"
        element={
          <GuestOnly>
            <ParentRegister />
          </GuestOnly>
        }
      />
      <Route index element={guarded(<Dashboard />)} />
      <Route path="anak/baru" element={guarded(<ChildForm mode="new" />)} />
      <Route path="anak/:id" element={guarded(<ReportPage />)} />
      <Route path="anak/:id/ubah" element={guarded(<ChildForm mode="edit" />)} />
      <Route path="anak/:id/sandi" element={guarded(<ChildForm mode="pin" />)} />
      <Route path="*" element={<Navigate to="/orang-tua" replace />} />
    </Routes>
  );
}
