import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { parentLoginSchema, parentRegisterSchema, type SessionUser } from '@little-coder/engine';
import { api, errorMessage } from '../api/client';
import { rememberFamilyCode, setSession } from '../auth/session';
import { t } from '../i18n';
import { AuthLayout, familySteps } from '../site/AuthLayout';
import { Button, Card, Checkbox, Notice, PasswordField, RequiredNote, TextField } from '../ui/ui';
import { fieldErrors, serverFieldErrors } from './form';

type AuthResponse = { token: string; user: SessionUser; familyCode: string };

function storeSession(res: AuthResponse) {
  setSession('parent', { token: res.token, user: res.user, familyCode: res.familyCode });
  // Perangkat ini mengingat kode keluarga, jadi anak tidak perlu mengetiknya (D-016).
  rememberFamilyCode(res.familyCode);
}

export function ParentLogin() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    const parsed = parentLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await api<AuthResponse>('/auth/parent/login', { body: parsed.data });
      storeSession(res);
      navigate(from && from.startsWith('/orang-tua') ? from : '/orang-tua', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      variant="parent"
      title={t('site.auth.parent.title')}
      text={t('site.auth.parent.text')}
    >
      <Card title={t('parent.login.title')}>
        <p className="ui-muted pa-gap">{t('parent.login.subtitle')}</p>
        {error && <Notice tone="error">{error}</Notice>}
        <form onSubmit={submit} noValidate>
          <RequiredNote />
          <TextField
            required
            label={t('parent.login.email')}
            type="email"
            autoComplete="username"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            required
            label={t('parent.login.password')}
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy} className="pa-wide">
            {busy ? t('parent.loading') : t('parent.login.submit')}
          </Button>
        </form>
        <p className="pa-switch">
          {t('parent.login.noAccount')}{' '}
          <Link to="/orang-tua/daftar">{t('parent.login.toRegister')}</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}

export function ParentRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    const parsed = parentRegisterSchema.safeParse({ name, email, password, consent });
    const next = parsed.success ? {} : fieldErrors(parsed.error.issues);
    if (consent !== true) next.consent = t('parent.consent.required');
    if (confirm !== password && !next.password) next.confirm = t('parent.register.confirmMismatch');
    setErrors(next);
    if (!parsed.success || Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      const res = await api<AuthResponse>('/auth/parent/register', { body: parsed.data });
      storeSession(res);
      // Wizard keluarga (D-025): langsung ke langkah 2, tambah profil anak.
      navigate('/orang-tua/anak/baru', { replace: true, state: { welcome: true } });
    } catch (err) {
      setErrors(serverFieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      variant="parent"
      title={t('site.auth.parent.title')}
      text={t('site.auth.parent.text')}
      steps={{ current: 1, labels: familySteps() }}
    >
      <Card title={t('parent.register.title')}>
        <p className="ui-muted pa-gap">{t('parent.register.subtitle')}</p>
        {error && <Notice tone="error">{error}</Notice>}
        <form onSubmit={submit} noValidate>
          <RequiredNote />
          <TextField
            required
            label={t('parent.register.name')}
            hint={t('parent.register.nameHint')}
            autoComplete="name"
            value={name}
            error={errors.name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            required
            label={t('parent.register.email')}
            type="email"
            autoComplete="email"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            required
            label={t('parent.register.password')}
            hint={t('parent.register.passwordHint')}
            autoComplete="new-password"
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordField
            required
            label={t('parent.register.confirm')}
            autoComplete="new-password"
            value={confirm}
            error={errors.confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <section className="pa-consent" aria-labelledby="pa-consent-title">
            <h3 id="pa-consent-title">{t('parent.consent.title')}</h3>
            <ul>
              <li>{t('parent.consent.parent')}</li>
              <li>{t('parent.consent.child')}</li>
              <li>{t('parent.consent.none')}</li>
              <li>{t('parent.consent.delete')}</li>
            </ul>
            <p className="ui-muted">{t('parent.consent.law')}</p>
          </section>
          <Checkbox
            required
            label={t('parent.consent.label')}
            checked={consent}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? 'pa-consent-error' : undefined}
            onChange={(e) => setConsent(e.target.checked)}
          />
          {errors.consent && (
            <p id="pa-consent-error" className="ui-error pa-field-error" role="alert">
              {errors.consent}
            </p>
          )}
          <Button type="submit" disabled={busy} className="pa-wide">
            {busy ? t('parent.saving') : t('parent.register.submit')}
          </Button>
        </form>
        <p className="pa-switch">
          {t('parent.register.haveAccount')}{' '}
          <Link to="/orang-tua/masuk">{t('parent.register.toLogin')}</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
