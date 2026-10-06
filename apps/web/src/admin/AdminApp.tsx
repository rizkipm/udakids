import { useEffect, useRef } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { setSession, useSession } from '../auth/session';
import { useFetch } from '../auth/useApi';
import { VisualGallery } from '../components/visuals';
import { t, type MessageKey } from '../i18n';
import { AppShell, type ShellIcon } from '../ui/AppShell';
import { Seo } from '../components/Seo';
import { PageHeader } from '../ui/ui';
import { AffiliateAdminPage } from './affiliate/AffiliateAdminPage';
import { BillingSettingsPage } from './billing/BillingSettingsPage';
import { CashPage } from './billing/CashPage';
import { CommissionPage } from './billing/CommissionPage';
import { OrdersPage } from './billing/OrdersPage';
import { PackagesPage } from './billing/PackagesPage';
import { PaymentMethodsPage } from './billing/PaymentMethodsPage';
import { ORDERS_CHANGED } from './billing/util';
import { CatalogPage } from './catalog/CatalogPage';
import { ClassesPage } from './classes/ClassesPage';
import { ClassStudentsPage } from './classes/ClassStudentsPage';
import { LevelEditorRoute } from './levels/LevelEditor';
import { LevelList } from './levels/LevelList';
import { OverviewPage } from './OverviewPage';
import { ContestsPage } from './contests/ContestsPage';
import { BannersPage } from './media/BannersPage';
import { GalleryAdminPage } from './media/GalleryAdminPage';
import { ChildReportPage } from './reports/ChildReportPage';
import { ReportsPage } from './reports/ReportsPage';
import { SkillEditorRoute } from './skills/SkillEditorRoute';
import { SkillList } from './skills/SkillList';
import { FamiliesPage } from './users/FamiliesPage';
import { StaffPage } from './users/StaffPage';
import { VoicePage } from './voice/VoicePage';
import { MailPage } from './mail/MailPage';
import { NotificationBell } from './notifications/NotificationBell';
import './admin.css';

type NavItem = { to: string; label: MessageKey; icon: ShellIcon; end?: boolean; badge?: 'orders' };
const NAV: (NavItem | { group: MessageKey })[] = [
  { to: '/admin', label: 'admin.nav.overview', icon: 'chart', end: true },
  { group: 'admin.nav.groupContent' },
  { to: '/admin/skill', label: 'admin.nav.skills', icon: 'book' },
  { to: '/admin/katalog', label: 'admin.nav.catalog', icon: 'grid' },
  { to: '/admin/level', label: 'admin.nav.levels', icon: 'map' },
  { to: '/admin/galeri', label: 'admin.nav.gallery', icon: 'image' },
  { to: '/admin/suara', label: 'admin.nav.voice', icon: 'speaker' },
  { group: 'admin.nav.groupPeople' },
  { to: '/admin/staf', label: 'admin.nav.staff', icon: 'badge' },
  { to: '/admin/keluarga', label: 'admin.nav.families', icon: 'users' },
  { to: '/admin/kelas', label: 'admin.nav.classes', icon: 'school' },
  { to: '/admin/laporan', label: 'admin.nav.reports', icon: 'report' },
  { to: '/admin/email', label: 'admin.nav.mail', icon: 'mail' },
  { group: 'admin.nav.groupBilling' },
  { to: '/admin/transaksi', label: 'admin.nav.orders', icon: 'receipt', badge: 'orders' },
  { to: '/admin/paket', label: 'admin.nav.packages', icon: 'tag' },
  { to: '/admin/rekening', label: 'admin.nav.paymentMethods', icon: 'bank' },
  { to: '/admin/pengaturan', label: 'admin.nav.billingSettings', icon: 'gear' },
  { group: 'admin.nav.groupEvents' },
  { to: '/admin/lomba', label: 'admin.nav.contests', icon: 'flag' },
  { to: '/admin/banner', label: 'admin.nav.banners', icon: 'image' },
  { to: '/admin/dokumentasi', label: 'admin.nav.docs', icon: 'image' },
  { group: 'admin.nav.groupFinance' },
  { to: '/admin/kas', label: 'admin.nav.cash', icon: 'wallet' },
  { to: '/admin/komisi', label: 'admin.nav.commission', icon: 'percent' },
  { to: '/admin/afiliasi', label: 'admin.nav.affiliate', icon: 'users' },
];

/** Jumlah transfer yang menunggu verifikasi (badge menu Transaksi). */
function usePendingOrders() {
  const pending = useFetch<{ count: number }>('staff', '/admin/orders/pending-count');
  const { pathname } = useLocation();
  const { reload } = pending;
  const first = useRef(true);
  // Muat ulang saat pindah halaman (bukan saat pertama tampil) dan setelah pesanan disetujui/ditolak.
  useEffect(() => {
    if (first.current) first.current = false;
    else reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    window.addEventListener(ORDERS_CHANGED, reload);
    return () => window.removeEventListener(ORDERS_CHANGED, reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return pending.error ? 0 : (pending.data?.count ?? 0);
}

function GalleryPage() {
  return (
    <>
      <PageHeader title={t('admin.gallery.title')} subtitle={t('admin.gallery.subtitle')} />
      <VisualGallery />
    </>
  );
}

function NotFound() {
  return <PageHeader title={t('admin.notFound')} />;
}

/** Area admin (D-017): dipasang di /admin/* di dalam RequireRole admin. */
export function AdminApp() {
  const session = useSession('staff');
  const navigate = useNavigate();
  const pending = usePendingOrders();

  function logout() {
    setSession('staff', null);
    navigate('/masuk/staf', { replace: true });
  }

  return (
    <AppShell
      id="admin"
      theme="dark"
      brand={<span>{t('admin.brand')}</span>}
      navLabel={t('admin.nav.label')}
      nav={NAV.map((n) =>
        'group' in n
          ? { group: t(n.group) }
          : {
              to: n.to,
              label: t(n.label),
              icon: n.icon,
              end: n.end,
              ...(n.badge === 'orders' && {
                badge: pending,
                badgeLabel: `${t(n.label)}, ${t('admin.nav.pendingOrders', { n: pending })}`,
              }),
            },
      )}
      topbar={session && <NotificationBell userId={session.user.id} />}
      user={{ name: session?.user.name ?? '—', caption: t('admin.topbar.signedInAs') }}
      onLogout={logout}
    >
      <Seo title="Panel Admin" noindex />
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="skill" element={<SkillList />} />
        <Route path="skill/baru" element={<SkillEditorRoute mode="new" />} />
        <Route path="skill/manual-baru" element={<SkillEditorRoute mode="new-manual" />} />
        <Route path="skill/:id" element={<SkillEditorRoute mode="edit" />} />
        <Route path="katalog" element={<CatalogPage />} />
        <Route path="level" element={<LevelList />} />
        <Route path="level/baru" element={<LevelEditorRoute />} />
        <Route path="level/:id" element={<LevelEditorRoute />} />
        <Route path="staf" element={<StaffPage />} />
        <Route path="keluarga" element={<FamiliesPage />} />
        <Route path="kelas" element={<ClassesPage />} />
        <Route path="kelas/:id" element={<ClassStudentsPage />} />
        <Route path="laporan" element={<ReportsPage />} />
        <Route path="laporan/anak/:id" element={<ChildReportPage />} />
        <Route path="galeri" element={<GalleryPage />} />
        <Route path="lomba" element={<ContestsPage />} />
        <Route path="banner" element={<BannersPage />} />
        <Route path="dokumentasi" element={<GalleryAdminPage />} />
        <Route path="suara" element={<VoicePage />} />
        <Route path="email" element={<MailPage />} />
        <Route path="transaksi" element={<OrdersPage />} />
        <Route path="paket" element={<PackagesPage />} />
        <Route path="rekening" element={<PaymentMethodsPage />} />
        <Route path="pengaturan" element={<BillingSettingsPage />} />
        <Route path="kas" element={<CashPage />} />
        <Route path="komisi" element={<CommissionPage />} />
        <Route path="afiliasi" element={<AffiliateAdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}
