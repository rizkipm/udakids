import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { emailSchema } from '@little-coder/engine';
import { api, errorMessage } from '../api/client';
import { setSession, type Session } from '../auth/session';
import { t } from '../i18n';
import { Seo } from '../components/Seo';
import { AuthLayout } from '../site/AuthLayout';
import { Button, Card, Notice, PasswordField, RequiredNote, TextField } from '../ui/ui';

export function StaffLogin() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const [emailError, setEmailError] = useState<string>();
  async function submit(e: FormEvent) {
    e.preventDefault();
    // Format dicek dulu di perangkat (sama dengan server) agar pesannya jelas.
    if (!emailSchema.safeParse(email).success) {
      setEmailError(t('common.email.invalid'));
      return;
    }
    setEmailError(undefined);
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<Session>('/auth/staff/login', { body: { email, password } });
      setSession('staff', res);
      const home = res.user.role === 'admin' ? '/admin' : '/fasilitator';
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout variant="staff" title={t('site.auth.staff.title')} text={t('site.auth.staff.text')}>
      <Seo
        title="Masuk Guru &amp; Fasilitator"
        description="Portal masuk untuk fasilitator kelas dan admin sekolah Udakids Little Coder."
        canonical="/masuk/staf"
      />
      <Card title={t('staff.login.title')}>
        {error && <Notice tone="error">{error}</Notice>}
        <form onSubmit={submit}>
          <RequiredNote />
          <TextField
            required
            label={t('staff.login.email')}
            type="email"
            autoComplete="username"
            maxLength={254}
            error={emailError}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            required
            label={t('staff.login.password')}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {t('staff.login.submit')}
          </Button>
        </form>
        <p className="ui-muted auth-note">{t('staff.login.note')}</p>
      </Card>
    </AuthLayout>
  );
}
