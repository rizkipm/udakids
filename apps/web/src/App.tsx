import { ReferralLanding } from './site/ReferralLanding';
import { Unsubscribe } from './site/Unsubscribe';
import { Route, Routes } from 'react-router-dom';
import { WhatsAppButton } from './components/WhatsAppButton';
import { AdminApp } from './admin/AdminApp';
import { FacilitatorApp } from './facilitator/FacilitatorApp';
import { RequireRole } from './auth/RequireRole';
import { t } from './i18n';
import { ParentApp } from './parent/ParentApp';
import { PlayApp } from './play/PlayApp';
import { Landing } from './site/Landing';
import { ArticleDetailPage, ArticlesPage } from './site/SiteContent';
import { StaffLogin } from './staff/StaffLogin';
import { Seo } from './components/Seo';

function Placeholder({ text, title }: { text: string; title?: string }) {
  return (
    <main className="page">
      <Seo title={title ?? 'Udakids Little Coder'} noindex />
      {text}
    </main>
  );
}

export function App() {
  return (
    <>
      <AppRoutes />
      {/* Tombol WhatsApp admin (D-064): landing, orang tua, admin/guru — tidak di area anak. */}
      <WhatsAppButton />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/play/*" element={<PlayApp />} />
      <Route path="/orang-tua/*" element={<ParentApp />} />
      <Route path="/masuk/staf" element={<StaffLogin />} />
      <Route path="/berhenti-langganan" element={<Unsubscribe />} />
      <Route path="/r/:code" element={<ReferralLanding />} />
      <Route path="/artikel" element={<ArticlesPage />} />
      <Route path="/artikel/:slug" element={<ArticleDetailPage />} />
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
        element={<Placeholder text={t('common.placeholder.report')} title="Laporan Belajar Anak" />}
      />
      <Route
        path="*"
        element={<Placeholder text={t('common.notFound')} title="Halaman Tidak Ditemukan" />}
      />
    </Routes>
  );
}
