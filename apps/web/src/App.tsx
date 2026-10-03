import { Unsubscribe } from './site/Unsubscribe';
import { Route, Routes } from 'react-router-dom';
import { AdminApp } from './admin/AdminApp';
import { FacilitatorApp } from './facilitator/FacilitatorApp';
import { RequireRole } from './auth/RequireRole';
import { t } from './i18n';
import { ParentApp } from './parent/ParentApp';
import { PlayApp } from './play/PlayApp';
import { Landing } from './site/Landing';
import { StaffLogin } from './staff/StaffLogin';

function Placeholder({ text }: { text: string }) {
  return <main className="page">{text}</main>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/play/*" element={<PlayApp />} />
      <Route path="/orang-tua/*" element={<ParentApp />} />
      <Route path="/masuk/staf" element={<StaffLogin />} />
      <Route path="/berhenti-langganan" element={<Unsubscribe />} />
      <Route
        path="/admin/*"
        element={
          <RequireRole kind="staff" roles={['admin']} login="/masuk/staf">
            <AdminApp />
          </RequireRole>
        }
      />
      <Route
        path="/fasilitator/*"
        element={
          <RequireRole kind="staff" roles={['facilitator', 'admin']} login="/masuk/staf">
            <FacilitatorApp />
          </RequireRole>
        }
      />
      <Route
        path="/laporan/:token"
        element={<Placeholder text={t('common.placeholder.report')} />}
      />
      <Route path="*" element={<Placeholder text={t('common.notFound')} />} />
    </Routes>
  );
}
