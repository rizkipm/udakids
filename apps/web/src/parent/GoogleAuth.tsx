import { useEffect, useRef, useState, type FormEvent } from 'react';
import { normalizeReferralCode, isReferralCode, type SessionUser } from '@little-coder/engine';
import { api, errorMessage } from '../api/client';
import { rememberReferral } from '../site/referral';
import { t } from '../i18n';
import { Button, Checkbox, Notice, TextField } from '../ui/ui';
import { useReferralPreview } from './referralPreview';

/**
 * Daftar/masuk orang tua dengan Google (D-066): tombol resmi Google Identity Services + pop-up One Tap yang
 * menawarkan akun Google aktif di perangkat. Client ID diambil dari server (GOOGLE_CLIENT_ID), jadi bisa
 * diganti tanpa build ulang. Tidak pernah dipakai di area anak.
 */

type GoogleId = {
  initialize(opts: Record<string, unknown>): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
  prompt(): void;
  cancel(): void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

export type GoogleAuthResult = {
  token: string;
  user: SessionUser;
  familyCode: string;
  mustChangePassword: boolean;
  created: boolean;
};
type NeedsConsent = { needsConsent: true; email: string; name: string };
export type GooglePending = { credential: string; email: string; name: string };

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let clientIdOnce: Promise<string | null> | null = null;
let scriptOnce: Promise<GoogleId> | null = null;

/** Untuk test: lupakan client ID & skrip yang sudah dimuat. */
export function resetGoogleCache() {
  clientIdOnce = null;
  scriptOnce = null;
}

function googleClientId(): Promise<string | null> {
  clientIdOnce ??= api<{ clientId: string | null }>('/auth/parent/google')
    .then((r) => r.clientId || null)
    .catch(() => {
      clientIdOnce = null;
      return null;
    });
  return clientIdOnce;
}

function loadGoogle(): Promise<GoogleId> {
  scriptOnce ??= new Promise<GoogleId>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () =>
      window.google?.accounts?.id
        ? resolve(window.google.accounts.id)
        : reject(new Error('Google tidak tersedia'));
    s.onerror = () => {
      scriptOnce = null;
      reject(new Error('Google tidak tersedia'));
    };
    document.head.appendChild(s);
  });
  return scriptOnce;
}

/** Kirim ID token ke server: akun lama → masuk; akun baru → butuh persetujuan dulu. */
export function sendGoogle(credential: string, extra: Record<string, unknown> = {}) {
  return api<GoogleAuthResult | NeedsConsent>('/auth/parent/google', {
    body: { credential, ...extra },
  });
}

/** Batas tunggu tombol Google siap; lewat dari ini form manual ditampilkan (mis. skrip diblokir). */
export const GOOGLE_READY_TIMEOUT_MS = 6000;
export type GoogleStatus = 'loading' | 'ready' | 'off';

/**
 * Tombol "Daftar/Lanjutkan dengan Google" + One Tap. `onStatus('off')` bila Google belum diatur di server,
 * skrip gagal dimuat (offline/diblokir), atau tidak siap dalam batas waktu: halaman lalu menampilkan form
 * manual sehingga orang tua tidak pernah terkunci.
 */
export function GoogleButton({
  context,
  onCredential,
  onStatus,
}: {
  context: 'signup' | 'signin';
  onCredential: (credential: string) => void;
  onStatus?: (s: Exclude<GoogleStatus, 'loading'>) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const handler = useRef(onCredential);
  handler.current = onCredential;
  const status = useRef(onStatus);
  status.current = onStatus;

  useEffect(() => {
    let alive = true;
    let done = false;
    let gid: GoogleId | undefined;
    const report = (s: 'ready' | 'off') => {
      if (!alive || done) return;
      done = true;
      status.current?.(s);
    };
    const timer = setTimeout(() => report('off'), GOOGLE_READY_TIMEOUT_MS);
    void googleClientId().then(async (clientId) => {
      if (!clientId || !alive) return report('off');
      try {
        gid = await loadGoogle();
      } catch {
        return report('off');
      }
      if (!alive || !box.current || done) return;
      gid.initialize({
        client_id: clientId,
        callback: (r: { credential?: string }) => r.credential && handler.current(r.credential),
        context,
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
      });
      gid.renderButton(box.current, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        shape: 'pill',
        text: context === 'signup' ? 'signup_with' : 'signin_with',
        logo_alignment: 'left',
        locale: 'id',
        width: Math.min(400, Math.max(240, box.current.clientWidth || 320)),
      });
      clearTimeout(timer);
      setReady(true);
      report('ready');
      // Pop-up kecil One Tap: menawarkan akun Google yang aktif di perangkat ini.
      gid.prompt();
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      gid?.cancel();
    };
  }, [context]);

  return (
    <div className="pa-google" aria-busy={!ready}>
      {!ready && <p className="pa-google-loading ui-muted">{t('parent.choice.loading')}</p>}
      <div ref={box} className="pa-google-btn" />
    </div>
  );
}

/** Langkah persetujuan untuk akun Google baru: nama bisa diubah, email dari Google, persetujuan wajib. */
export function GoogleConsent({
  pending,
  referral,
  onDone,
  onCancel,
}: {
  pending: GooglePending;
  referral?: string;
  onDone: (res: GoogleAuthResult) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pending.name);
  // Kode referal (D-063): terisi dari link /r/KODE atau halaman daftar; bisa diketik/diubah di sini.
  const [code, setCode] = useState(referral ?? '');
  const preview = useReferralPreview(code);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t('parent.google.nameRequired');
    if (!consent) next.consent = t('parent.consent.required');
    const referralCode = normalizeReferralCode(code);
    if (referralCode && (!isReferralCode(referralCode) || preview?.valid === false))
      next.referralCode = t('parent.register.referralInvalid');
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await sendGoogle(pending.credential, {
        consent: true,
        name: name.trim(),
        ...(referralCode && { referralCode }),
      });
      if ('needsConsent' in res) throw new Error(t('parent.google.retry'));
      onDone(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="pa-google-consent">
      <Notice tone="info">{t('parent.google.consentIntro', { email: pending.email })}</Notice>
      {error && <Notice tone="error">{error}</Notice>}
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
        value={code}
        error={
          errors.referralCode ??
          (preview?.valid === false ? t('parent.register.referralInvalid') : undefined)
        }
        onChange={(e) => {
          setCode(e.target.value);
          // Pesan kode keliru dari percobaan sebelumnya hilang begitu kode diubah.
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
        aria-describedby={errors.consent ? 'pa-google-consent-error' : undefined}
        onChange={(e) => setConsent(e.target.checked)}
      />
      {errors.consent && (
        <p id="pa-google-consent-error" className="ui-error pa-field-error" role="alert">
          {errors.consent}
        </p>
      )}
      <Button type="submit" disabled={busy} className="pa-wide">
        {busy ? t('parent.saving') : t('parent.google.create')}
      </Button>
      <Button type="button" variant="ghost" className="pa-wide" onClick={onCancel}>
        {t('parent.google.cancel')}
      </Button>
    </form>
  );
}

/** Isi persetujuan pengolahan data (sama untuk daftar email dan Google). */
export function ConsentSection() {
  return (
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
  );
}
