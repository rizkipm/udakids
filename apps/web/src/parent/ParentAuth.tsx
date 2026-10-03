import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  emailVerifySchema,
  parentLoginSchema,
  parentRegisterSchema,
  type SessionUser,
} from '@little-coder/engine';
import { ApiError, api, errorMessage } from '../api/client';
import { rememberFamilyCode, setSession } from '../auth/session';
import { t } from '../i18n';
import { AuthLayout, familySteps } from '../site/AuthLayout';
import { Button, Card, Checkbox, Notice, PasswordField, RequiredNote, TextField } from '../ui/ui';
import { fieldErrors, serverFieldErrors } from './form';

type AuthResponse = { token: string; user: SessionUser; familyCode: string };
/** Pendaftaran baru menunggu kode verifikasi email (D-044). */
type PendingResponse = { verificationRequired: true; email: string };

const verifyPath = (email: string) => `/orang-tua/verifikasi?email=${encodeURIComponent(email)}`;

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
      // Akun ada tapi email belum diverifikasi → ke langkah kode (D-044).
      if (err instanceof ApiError && err.status === 403 && err.body.code === 'EMAIL_NOT_VERIFIED') {
        navigate(verifyPath(parsed.data.email), { replace: true, state: { fromLogin: true } });
        return;
      }
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
      const res = await api<AuthResponse | PendingResponse>('/auth/parent/register', {
        body: parsed.data,
      });
      if ('verificationRequired' in res) {
        navigate(verifyPath(res.email), { replace: true, state: { sent: true } });
        return;
      }
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
        <p className="pa-steps-hint">{t('parent.register.stepsHint')}</p>
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
              <li>{t('parent.consent.news')}</li>
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
          <Notice tone="info">{t('parent.register.emailNote')}</Notice>
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

/** Detik jeda sebelum kode baru boleh diminta (sama dengan server). */
const RESEND_SECONDS = 60;

/**
 * Langkah verifikasi email (D-044): orang tua memasukkan kode 6 angka dari email. Berhasil → langsung masuk
 * dan lanjut ke wizard keluarga (tambah profil anak).
 */
export function ParentVerify() {
  const navigate = useNavigate();
  const state = useLocation().state as { sent?: boolean; fromLogin?: boolean } | null;
  const [params] = useSearchParams();
  const email = (params.get('email') ?? '').trim().toLowerCase();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(state?.sent ? RESEND_SECONDS : 0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  if (!email) return <Navigate to="/orang-tua/daftar" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setInfo(undefined);
    const parsed = emailVerifySchema.safeParse({ email, code });
    if (!parsed.success) {
      setError(t('parent.verify.codeInvalid'));
      return;
    }
    setBusy(true);
    try {
      const res = await api<AuthResponse>('/auth/parent/verify', { body: parsed.data });
      storeSession(res);
      navigate('/orang-tua/anak/baru', { replace: true, state: { welcome: true } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        navigate('/orang-tua/masuk', { replace: true });
        return;
      }
      const left = err instanceof ApiError ? err.body.attemptsLeft : undefined;
      setError(
        typeof left === 'number'
          ? `${errorMessage(err)} ${t('parent.verify.attemptsLeft', { n: left })}`
          : errorMessage(err),
      );
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(undefined);
    setInfo(undefined);
    setBusy(true);
    try {
      const res = await api<{ cooldownSeconds: number }>('/auth/parent/resend', {
        body: { email },
      });
      setWait(res.cooldownSeconds ?? RESEND_SECONDS);
      setInfo(t('parent.verify.resent'));
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
      steps={{ current: 2, labels: familySteps() }}
    >
      <Card title={t('parent.verify.title')}>
        <p className="ui-muted pa-gap">
          {state?.fromLogin ? t('parent.verify.fromLogin') : t('parent.verify.subtitle')}{' '}
          <strong>{email}</strong>
        </p>
        <Notice tone="info">
          <strong>{t('parent.verify.spamTitle')}</strong> {t('parent.verify.spam')}
        </Notice>
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}
        <form onSubmit={submit} noValidate>
          <TextField
            required
            label={t('parent.verify.code')}
            hint={t('parent.verify.codeHint')}
            className="pa-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <Button type="submit" disabled={busy || code.length !== 6} className="pa-wide">
            {busy ? t('parent.loading') : t('parent.verify.submit')}
          </Button>
        </form>
        <div className="pa-verify-actions">
          <Button variant="ghost" disabled={busy || wait > 0} onClick={() => void resend()}>
            {wait > 0 ? t('parent.verify.resendIn', { n: wait }) : t('parent.verify.resend')}
          </Button>
        </div>
        <p className="pa-switch">
          {t('parent.verify.wrongEmail')}{' '}
          <Link to="/orang-tua/daftar">{t('parent.verify.toRegister')}</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
