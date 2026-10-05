import { AffiliatePage } from './AffiliatePage';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { setSession, useSession } from '../auth/session';
import { useFetch } from '../auth/useApi';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import { AppShell, ShellIconSvg } from '../ui/AppShell';
import { Button, Dialog } from '../ui/ui';
import { AccountPage, type ParentAccount } from './AccountPage';
import { ChildForm } from './ChildForm';
import { Dashboard } from './Dashboard';
import { OrderPage, OrdersPage } from './Orders';
import { PackagesPage } from './PackagesPage';
import { ParentForgot, ParentLogin, ParentRegister, ParentVerify } from './ParentAuth';
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

/** Pesanan yang perlu tindakan orang tua (belum dibayar / bukti ditolak) — badge di menu. */
function usePendingOrders(path: string) {
  const { data, reload } = useFetch<{ status: string }[]>('parent', '/parent/orders');
  // Muat ulang saat berpindah halaman (mis. setelah membuat pesanan / mengunggah bukti).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return Array.isArray(data)
    ? data.filter((o) => o.status === 'awaiting_payment' || o.status === 'rejected').length
    : 0;
}

/**
 * Password sementara (dari admin, D-064) → pop-up "segera ganti password" di setiap halaman kecuali
 * "Akun saya". Bisa ditutup, tetapi muncul lagi saat berpindah halaman sampai password diganti.
 */
function MustChangePassword({ path }: { path: string }) {
  const navigate = useNavigate();
  const { data, reload } = useFetch<ParentAccount>('parent', '/parent/account');
  const [closedOn, setClosedOn] = useState<string>();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  const open = !!data?.mustChangePassword && path !== '/orang-tua/akun' && closedOn !== path;
  return (
    <Dialog
      open={open}
      tone="warning"
      title={t('parent.account.mustChangeTitle')}
      onClose={() => setClosedOn(path)}
      actions={
        <>
          <Button variant="ghost" onClick={() => setClosedOn(path)}>
            {t('parent.account.later')}
          </Button>
          <Button onClick={() => navigate('/orang-tua/akun')}>
            {t('parent.account.changeNow')}
          </Button>
        </>
      }
    >
      <p>{t('parent.account.mustChange')}</p>
    </Dialog>
  );
}

/** Tata letak area orang tua (sidebar bisa disembunyikan; laci di tablet/HP). */
function ParentLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const session = useSession('parent');
  const pending = usePendingOrders(pathname);
  return (
    <AppShell
      id="parent"
      brand={
        <Link to="/orang-tua" className="pa-brand">
          <Momo mood="happy" size={36} />
          <span>{t('parent.brand')}</span>
        </Link>
      }
      navLabel={t('parent.nav.label')}
      nav={[
        { to: '/orang-tua', label: t('parent.nav.home'), icon: 'home', end: true },
        { to: '/orang-tua/anak/baru', label: t('parent.dash.addChild'), icon: 'plus' },
        { to: '/orang-tua/paket', label: t('parent.nav.packages'), icon: 'tag' },
        { to: '/orang-tua/afiliasi', label: t('parent.nav.affiliate'), icon: 'wallet' },
        {
          to: '/orang-tua/transaksi',
          label: t('parent.nav.orders'),
          icon: 'receipt',
          badge: pending,
          badgeLabel: `${t('parent.nav.orders')}, ${t('parent.nav.pending', { n: pending })}`,
        },
        { to: '/orang-tua/akun', label: t('parent.nav.account'), icon: 'badge' },
      ]}
      extra={
        <Link to="/play" className="pa-side-play" title={t('parent.dash.play')}>
          <ShellIconSvg name="play" />
          <span className="shell-label">
            <strong>{t('parent.dash.play')}</strong>
            <small>{t('parent.nav.playHint')}</small>
          </span>
        </Link>
      }
      user={{ name: session?.user.name ?? '', caption: t('parent.nav.signedIn') }}
      onLogout={() => {
        // Hanya sesi orang tua; sesi anak dan kode keluarga di perangkat ini tetap.
        setSession('parent', null);
        navigate('/orang-tua/masuk', { replace: true });
      }}
    >
      <div className="pa-main">{children}</div>
      <MustChangePassword path={pathname} />
    </AppShell>
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
      <Route
        path="verifikasi"
        element={
          <GuestOnly>
            <ParentVerify />
          </GuestOnly>
        }
      />
      <Route
        path="lupa-password"
        element={
          <GuestOnly>
            <ParentForgot />
          </GuestOnly>
        }
      />
      <Route index element={guarded(<Dashboard />)} />
      <Route path="akun" element={guarded(<AccountPage />)} />
      <Route path="anak/baru" element={guarded(<ChildForm mode="new" />)} />
      <Route path="anak/:id" element={guarded(<ReportPage />)} />
      <Route path="anak/:id/ubah" element={guarded(<ChildForm mode="edit" />)} />
      <Route path="anak/:id/sandi" element={guarded(<ChildForm mode="pin" />)} />
      <Route path="paket" element={guarded(<PackagesPage />)} />
      <Route path="afiliasi" element={guarded(<AffiliatePage />)} />
      <Route path="transaksi" element={guarded(<OrdersPage />)} />
      <Route path="transaksi/:id" element={guarded(<OrderPage />)} />
      <Route path="*" element={<Navigate to="/orang-tua" replace />} />
    </Routes>
  );
}
