import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { setSession, useSession } from '../auth/session';
import { VisualGallery } from '../components/visuals';
import { t, type MessageKey } from '../i18n';
import { Button, PageHeader } from '../ui/ui';
import { CatalogPage } from './catalog/CatalogPage';
import { ClassesPage } from './classes/ClassesPage';
import { ClassStudentsPage } from './classes/ClassStudentsPage';
import { Icon } from './common';
import { LevelEditorRoute } from './levels/LevelEditor';
import { LevelList } from './levels/LevelList';
import { OverviewPage } from './OverviewPage';
import { ChildReportPage } from './reports/ChildReportPage';
import { ReportsPage } from './reports/ReportsPage';
import { SkillEditorRoute } from './skills/SkillEditorRoute';
import { SkillList } from './skills/SkillList';
import { FamiliesPage } from './users/FamiliesPage';
import { StaffPage } from './users/StaffPage';
import './admin.css';

const NAV: { to: string; label: MessageKey; end?: boolean }[] = [
  { to: '/admin', label: 'admin.nav.overview', end: true },
  { to: '/admin/skill', label: 'admin.nav.skills' },
  { to: '/admin/katalog', label: 'admin.nav.catalog' },
  { to: '/admin/level', label: 'admin.nav.levels' },
  { to: '/admin/staf', label: 'admin.nav.staff' },
  { to: '/admin/keluarga', label: 'admin.nav.families' },
  { to: '/admin/kelas', label: 'admin.nav.classes' },
  { to: '/admin/laporan', label: 'admin.nav.reports' },
  { to: '/admin/galeri', label: 'admin.nav.gallery' },
];

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

  function logout() {
    setSession('staff', null);
    navigate('/masuk/staf', { replace: true });
  }

  return (
    <div className="ui-shell">
      <div className="ui-layout">
        <nav className="ui-sidebar" aria-label={t('admin.nav.label')}>
          <div className="ui-brand">{t('admin.brand')}</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        <div className="adm-content">
          <header className="ui-topbar">
            <div className="adm-topbar-user">
              <span>
                {t('admin.topbar.signedInAs')} <strong>{session?.user.name ?? '—'}</strong>
              </span>
              <Button variant="ghost" onClick={logout}>
                <Icon name="logout" />
                {t('admin.topbar.logout')}
              </Button>
            </div>
          </header>
          <main className="ui-main">
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
