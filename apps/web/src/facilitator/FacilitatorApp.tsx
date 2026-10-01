import { Route, Routes, useNavigate } from 'react-router-dom';
import { ClassesPage } from '../admin/classes/ClassesPage';
import { ClassStudentsPage } from '../admin/classes/ClassStudentsPage';
import { setSession, useSession } from '../auth/session';
import { t } from '../i18n';
import { AppShell } from '../ui/AppShell';
import { FacilitatorHome } from './FacilitatorHome';
import '../admin/admin.css';

/** Area fasilitator/guru: ringkasan kelasnya sendiri + kelas & pendaftaran siswa (D-025, D-039). */
export function FacilitatorApp() {
  const session = useSession('staff');
  const navigate = useNavigate();
  return (
    <AppShell
      id="facilitator"
      theme="dark"
      brand={<span>{t('admin.fac.brand')}</span>}
      navLabel={t('admin.fac.nav')}
      nav={[
        { to: '/fasilitator', label: t('admin.fac.home'), icon: 'chart', end: true },
        { to: '/fasilitator/kelas', label: t('admin.fac.classes'), icon: 'school' },
      ]}
      user={{ name: session?.user.name ?? '—', caption: t('admin.topbar.signedInAs') }}
      onLogout={() => {
        setSession('staff', null);
        navigate('/masuk/staf', { replace: true });
      }}
    >
      <Routes>
        <Route index element={<FacilitatorHome />} />
        <Route path="kelas" element={<ClassesPage base="/fasilitator/kelas" canAssign={false} />} />
        <Route path="kelas/:id" element={<ClassStudentsPage base="/fasilitator/kelas" />} />
        <Route path=":id" element={<ClassStudentsPage base="/fasilitator/kelas" />} />
      </Routes>
    </AppShell>
  );
}
