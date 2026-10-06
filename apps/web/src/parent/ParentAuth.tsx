import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  emailVerifySchema,
  isReferralCode,
  normalizeReferralCode,
  parentLoginSchema,
  parentRegisterSchema,
  passwordForgotSchema,
  passwordResetSchema,
  type SessionUser,
  MAX_CHILDREN_PER_PARENT,
} from '@little-coder/engine';
import { ApiError, api, errorMessage } from '../api/client';
import { rememberFamilyCode, setSession } from '../auth/session';
import { t } from '../i18n';
import { AuthLayout, familySteps } from '../site/AuthLayout';
import { forgetReferral, readReferral, rememberReferral } from '../site/referral';
import { Button, Card, Checkbox, Notice, PasswordField, RequiredNote, TextField } from '../ui/ui';
import { fieldErrors, serverFieldErrors } from './form';
import { useReferralPreview } from './referralPreview';
import {
  ConsentSection,
  GoogleButton,
  GoogleConsent,
  type GoogleStatus,
  sendGoogle,
  type GoogleAuthResult,
  type GooglePending,
} from './GoogleAuth';

type AuthResponse = { token: string; user: SessionUser; familyCode: string };
/** Pendaftaran baru menunggu kode verifikasi email (D-044). */
type PendingResponse = { verificationRequired: true; email: string };

const verifyPath = (email: string) => `/orang-tua/verifikasi?email=${encodeURIComponent(email)}`;

function storeSession(res: AuthResponse) {
  setSession('parent', { token: res.token, user: res.user, familyCode: res.familyCode });
  // Perangkat ini mengingat kode keluarga, jadi anak tidak perlu mengetiknya (D-016).
  rememberFamilyCode(res.familyCode);
}

/**
 * Alur Google (D-066): akun lama langsung masuk; akun baru menampilkan langkah persetujuan dulu. Akun baru
 * lanjut ke wizard keluarga (tambah anak), akun lama ke dasbor (atau halaman asal).
 */
function useGoogleFlow(from?: string) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<GooglePending>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  function finish(res: GoogleAuthResult) {
    storeSession(res);
    forgetReferral();
    if (res.created) navigate('/orang-tua/anak/baru', { replace: true, state: { welcome: true } });
    else navigate(from && from.startsWith('/orang-tua') ? from : '/orang-tua', { replace: true });
  }

  async function onCredential(credential: string) {
    setError(undefined);
    setBusy(true);
    try {
      const res = await sendGoogle(credential);
      if ('needsConsent' in res) setPending({ credential, email: res.email, name: res.name });
      else finish(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return { pending, setPending, error, busy, onCredential, finish };
}

/** Kartu "Satu langkah lagi" untuk akun Google baru. */
function GoogleConsentCard({
  google,
  referral,
}: {
  google: ReturnType<typeof useGoogleFlow>;
  referral?: string;
}) {
  return (
    <Card title={t('parent.google.consentTitle')}>
      <GoogleConsent
        pending={google.pending!}
        referral={referral}
        onDone={google.finish}
        onCancel={() => google.setPending(undefined)}
      />
    </Card>
  );
}

/**
 * Pilihan awal daftar/masuk (D-066): Google disarankan, isi manual sebagai alternatif. Form manual langsung
 * tampil bila Google tidak tersedia (belum diatur, offline, diblokir) atau orang tua memilihnya.
 */
function useAuthMode(initialManual: boolean) {
  const [google, setGoogle] = useState<GoogleStatus>('loading');
  const [manual, setManual] = useState(initialManual);
  return {
    google,
    setGoogle,
    manual,
    setManual,
    showForm: manual || google === 'off',
    canGoBack: manual && google !== 'off',
  };
}

function AuthChoice({
  context,
  onCredential,
  mode,
}: {
  context: 'signup' | 'signin';
  onCredential: (credential: string) => void;
  mode: ReturnType<typeof useAuthMode>;
}) {
  const signup = context === 'signup';
  return (
    <div className="pa-choice">
      <GoogleButton context={context} onCredential={onCredential} onStatus={mode.setGoogle} />
      <p className="pa-choice-hint">
        {signup ? t('parent.choice.googleHintRegister') : t('parent.choice.googleHintLogin')}
      </p>
      <p className="pa-or">
        <span>{t('parent.choice.or')}</span>
      </p>
      <Button variant="secondary" className="pa-wide" onClick={() => mode.setManual(true)}>
        {signup ? t('parent.choice.manualRegister') : t('parent.choice.manualLogin')}
      </Button>
    </div>
  );
}

function BackToChoice({ mode }: { mode: ReturnType<typeof useAuthMode> }) {
  if (!mode.canGoBack) return null;
  return (
    <p className="pa-choice-back">
      <button type="button" className="pa-link-button" onClick={() => mode.setManual(false)}>
        {t('parent.choice.back')}
      </button>
    </p>
  );
}

export function ParentLogin() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [search] = useSearchParams();
  // Datang dari tautan berisi email (mis. setelah verifikasi) → langsung form manual.
  const [email, setEmail] = useState(() => search.get('email') ?? '');
  const mode = useAuthMode(!!search.get('email'));
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const google = useGoogleFlow(from);

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
      {google.pending ? (
        <GoogleConsentCard google={google} referral={readReferral()} />
      ) : (
        <Card title={t('parent.login.title')}>
          <p className="ui-muted pa-gap">{t('parent.login.subtitle')}</p>
          <p className="ui-muted">{t('parent.login.childLimit', { n: MAX_CHILDREN_PER_PARENT })}</p>
          {(error ?? google.error) && <Notice tone="error">{error ?? google.error}</Notice>}
          {!mode.showForm && (
            <AuthChoice
              context="signin"
              mode={mode}
              onCredential={(c) => void google.onCredential(c)}
            />
          )}
          {mode.showForm && <BackToChoice mode={mode} />}
          <form onSubmit={submit} noValidate hidden={!mode.showForm}>
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
            <p className="pa-forgot">
              <Link
                to={`/orang-tua/lupa-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              >
                {t('parent.forgot.link')}
              </Link>
            </p>
            <Button type="submit" disabled={busy || google.busy} className="pa-wide">
              {busy ? t('parent.loading') : t('parent.login.submit')}
            </Button>
          </form>
          <p className="pa-switch">
            {t('parent.login.noAccount')}{' '}
            <Link to="/orang-tua/daftar">{t('parent.login.toRegister')}</Link>
          </p>
        </Card>
      )}
    </AuthLayout>
  );
}

export function ParentRegister() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [referral, setReferral] = useState(() => search.get('ref') ?? readReferral());
  const preview = useReferralPreview(referral);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const google = useGoogleFlow();
  const mode = useAuthMode(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    const referralCode = normalizeReferralCode(referral);
    const parsed = parentRegisterSchema.safeParse({
      name,
      email,
      password,
      consent,
      ...(referralCode && { referralCode }),
    });
    const next = parsed.success ? {} : fieldErrors(parsed.error.issues);
    if (consent !== true) next.consent = t('parent.consent.required');
    if (referralCode && (!isReferralCode(referralCode) || preview?.valid === false))
      next.referralCode = t('parent.register.referralInvalid');
    if (confirm !== password && !next.password) next.confirm = t('parent.register.confirmMismatch');
    setErrors(next);
    if (!parsed.success || Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      const res = await api<AuthResponse | PendingResponse>('/auth/parent/register', {
        body: parsed.data,
      });
      forgetReferral();
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
      {google.pending ? (
        <GoogleConsentCard google={google} referral={referral} />
      ) : (
        <Card title={t('parent.register.title')}>
          <p className="ui-muted pa-gap">
            {t('parent.register.subtitle', { n: MAX_CHILDREN_PER_PARENT })}
          </p>
          <Notice tone="info">
            {t('parent.register.childLimit', { n: MAX_CHILDREN_PER_PARENT })}
          </Notice>
          {mode.showForm && <p className="pa-steps-hint">{t('parent.register.stepsHint')}</p>}
          {(error ?? google.error) && <Notice tone="error">{error ?? google.error}</Notice>}
          {!mode.showForm && (
            <AuthChoice
              context="signup"
              mode={mode}
              onCredential={(c) => void google.onCredential(c)}
            />
          )}
          {mode.showForm && <BackToChoice mode={mode} />}
          {mode.showForm && mode.google !== 'off' && (
            <Notice tone="info">{t('parent.choice.manualHintRegister')}</Notice>
          )}
          <form onSubmit={submit} noValidate hidden={!mode.showForm}>
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
            <TextField
              label={t('parent.register.referral')}
              hint={
                preview?.valid
                  ? t('parent.register.referralBy', { name: preview.name ?? '' })
                  : t('parent.register.referralHint')
              }
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              value={referral}
              error={
                errors.referralCode ??
                (preview?.valid === false ? t('parent.register.referralInvalid') : undefined)
              }
              onChange={(e) => {
                setReferral(e.target.value);
                setErrors(({ referralCode: _old, ...rest }) => rest);
                if (isReferralCode(e.target.value)) rememberReferral(e.target.value);
              }}
            />
            <ConsentSection />
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
            <Button type="submit" disabled={busy || google.busy} className="pa-wide">
              {busy ? t('parent.saving') : t('parent.register.submit')}
            </Button>
          </form>
          <p className="pa-switch">
            {t('parent.register.haveAccount')}{' '}
            <Link to="/orang-tua/masuk">{t('parent.register.toLogin')}</Link>
          </p>
        </Card>
      )}
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

/**
 * Lupa password (D-064): (1) email → kode dikirim, (2) kode + password baru → langsung masuk. Jawaban
 * server selalu sama, jadi halaman ini tidak membocorkan apakah email terdaftar.
 */
export function ParentForgot() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState((params.get('email') ?? '').trim());
  const [sentTo, setSentTo] = useState<string>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function request(e?: FormEvent) {
    e?.preventDefault();
    setError(undefined);
    setInfo(undefined);
    const parsed = passwordForgotSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await api<{ cooldownSeconds: number }>('/auth/parent/forgot', {
        body: parsed.data,
      });
      setSentTo(parsed.data.email);
      setWait(res.cooldownSeconds ?? RESEND_SECONDS);
      setInfo(t('parent.forgot.sent', { email: parsed.data.email }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setInfo(undefined);
    const parsed = passwordResetSchema.safeParse({ email: sentTo, code, password });
    const next = parsed.success ? {} : fieldErrors(parsed.error.issues);
    if (confirm !== password && !next.password) next.confirm = t('parent.register.confirmMismatch');
    setErrors(next);
    if (!parsed.success || Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      const res = await api<AuthResponse>('/auth/parent/reset', { body: parsed.data });
      storeSession(res);
      navigate('/orang-tua', { replace: true });
    } catch (err) {
      const left = err instanceof ApiError ? err.body.attemptsLeft : undefined;
      setError(
        typeof left === 'number'
          ? `${errorMessage(err)} ${t('parent.verify.attemptsLeft', { n: left })}`
          : errorMessage(err),
      );
      setErrors(serverFieldErrors(err));
      setCode('');
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
      <Card title={t('parent.forgot.title')}>
        <p className="ui-muted pa-gap">
          {sentTo ? t('parent.forgot.step2') : t('parent.forgot.step1')}
        </p>
        {sentTo && (
          <Notice tone="info">
            <strong>{t('parent.verify.spamTitle')}</strong> {t('parent.verify.spam')}
          </Notice>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}
        {!sentTo ? (
          <form onSubmit={request} noValidate>
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
            <Button type="submit" disabled={busy} className="pa-wide">
              {busy ? t('parent.loading') : t('parent.forgot.send')}
            </Button>
          </form>
        ) : (
          <form onSubmit={reset} noValidate>
            <RequiredNote />
            <TextField
              required
              label={t('parent.verify.code')}
              hint={t('parent.forgot.codeHint')}
              className="pa-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              error={errors.code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <PasswordField
              required
              label={t('parent.forgot.newPassword')}
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
            <Button type="submit" disabled={busy || code.length !== 6} className="pa-wide">
              {busy ? t('parent.loading') : t('parent.forgot.submit')}
            </Button>
            <div className="pa-verify-actions">
              <Button variant="ghost" disabled={busy || wait > 0} onClick={() => void request()}>
                {wait > 0 ? t('parent.verify.resendIn', { n: wait }) : t('parent.verify.resend')}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setSentTo(undefined);
                  setInfo(undefined);
                  setError(undefined);
                }}
              >
                {t('parent.forgot.otherEmail')}
              </Button>
            </div>
          </form>
        )}
        <p className="pa-switch">
          {t('parent.forgot.remember')}{' '}
          <Link to="/orang-tua/masuk">{t('parent.forgot.toLogin')}</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
