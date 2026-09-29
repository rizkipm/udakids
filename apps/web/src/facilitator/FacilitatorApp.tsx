import { Route, Routes, useNavigate } from 'react-router-dom';
import { ClassesPage } from '../admin/classes/ClassesPage';
import { ClassStudentsPage } from '../admin/classes/ClassStudentsPage';
import { setSession, useSession } from '../auth/session';
import { t } from '../i18n';
import { Button } from '../ui/ui';
import '../admin/admin.css';

/** Area fasilitator: kelas miliknya sendiri + pendaftaran siswa (D-025). Dashboard realtime = M5. */
export function FacilitatorApp() {
  const session = useSession('staff');
  const navigate = useNavigate();
  return (
    <div className="ui-shell">
      <header className="ui-topbar fac-topbar">
        <strong>{t('admin.fac.brand')}</strong>
        <div className="adm-topbar-user">
          <span>{session?.user.name}</span>
          <Button
            variant="ghost"
            onClick={() => {
              setSession('staff', null);
              navigate('/masuk/staf', { replace: true });
            }}
          >
            {t('admin.topbar.logout')}
          </Button>
        </div>
      </header>
      <main className="ui-main">
        <Routes>
          <Route index element={<ClassesPage base="/fasilitator" canAssign={false} />} />
          <Route path=":id" element={<ClassStudentsPage base="/fasilitator" />} />
        </Routes>
      </main>
    </div>
  );
}
