import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PIN_LENGTH, PIN_PICTURES, type Color, type PinPicture } from '@little-coder/engine';
import { api, ApiError } from '../api/client';
import { speak } from '../audio/speech';
import {
  rememberedFamilyCode,
  rememberFamilyCode,
  setSession,
  type Session,
} from '../auth/session';
import { Momo } from '../components/Momo';
import { VisualView } from '../components/visuals';
import { t } from '../i18n';
import { SpeakButton } from './ItemPlayer';

type Profile = { id: string; nickname: string; momoColor: Color };
type Step =
  | { name: 'code' }
  | { name: 'who'; profiles: Profile[] }
  | { name: 'pin'; profiles: Profile[]; profile: Profile };

/**
 * Masuk anak (D-016, D-025): kode keluarga ATAU kode kelas (diingat perangkat) → pilih profil →
 * 3 gambar sandi.
 */
export function ChildLogin() {
  const [code, setCode] = useState(() => rememberedFamilyCode() ?? '');
  const [step, setStep] = useState<Step>({ name: 'code' });
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function loadProfiles(c: string) {
    setBusy(true);
    setMessage(undefined);
    try {
      const profiles = await api<Profile[]>(`/auth/family/${encodeURIComponent(c)}`);
      rememberFamilyCode(c);
      setStep({ name: 'who', profiles });
      speak(profiles.length ? t('play.login.who.say') : t('play.login.who.empty'));
    } catch (err) {
      setMessage(
        err instanceof ApiError && err.status === 404
          ? t('play.login.code.notFound')
          : t('play.login.offline'),
      );
      if (err instanceof ApiError && err.status === 404) rememberFamilyCode(null);
      setStep({ name: 'code' });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const remembered = rememberedFamilyCode();
    if (remembered) void loadProfiles(remembered);
    else speak(t('play.login.code.say'));
  }, []);

  if (step.name === 'code') {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      const c = code.trim().toUpperCase();
      if (c.length === 6) void loadProfiles(c);
    };
    return (
      <main className="kid-screen">
        <Momo mood="curious" size={140} />
        <div className="kid-say">
          <SpeakButton text={t('play.login.code.say')} />
          <p>{t('play.login.code.say')}</p>
        </div>
        <form className="code-form" onSubmit={submit}>
          <label htmlFor="family-code">{t('play.login.code.title')}</label>
          <input
            id="family-code"
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6),
              )
            }
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
            aria-describedby="family-code-hint"
          />
          <small id="family-code-hint">{t('play.login.code.hint')}</small>
          <button type="submit" className="kid-btn" disabled={busy || code.length !== 6}>
            {t('play.login.code.submit')}
          </button>
        </form>
        {message && <p className="kid-note">{message}</p>}
        <div className="login-alt">
          <p>{t('play.login.new')}</p>
          <div className="kid-row">
            <Link className="kid-btn secondary" to="/play/daftar">
              {t('play.login.selfRegister')}
            </Link>
            <Link className="kid-btn secondary" to="/play/gabung">
              {t('play.login.joinClass')}
            </Link>
            <Link className="kid-link" to="/orang-tua/daftar">
              {t('play.login.parentRegister')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (step.name === 'who') {
    return (
      <main className="kid-screen">
        <div className="kid-say">
          <SpeakButton text={t('play.login.who.say')} />
          <p>{step.profiles.length ? t('play.login.who.say') : t('play.login.who.empty')}</p>
        </div>
        <div className="profiles">
          {step.profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className="profile-card"
              onClick={() => {
                speak(`${p.nickname}. ${t('play.login.pin.say')}`);
                setStep({ name: 'pin', profiles: step.profiles, profile: p });
              }}
            >
              <Momo color={p.momoColor} mood="happy" size={110} label={`Momo ${p.nickname}`} />
              <span>{p.nickname}</span>
            </button>
          ))}
        </div>
        <button type="button" className="kid-link" onClick={() => setStep({ name: 'code' })}>
          {t('play.login.code.change')}
        </button>
      </main>
    );
  }

  return (
    <PinPad
      profile={step.profile}
      code={code}
      onBack={() => setStep({ name: 'who', profiles: step.profiles })}
    />
  );
}

function PinPad({ profile, code, onBack }: { profile: Profile; code: string; onBack: () => void }) {
  const [pin, setPin] = useState<PinPicture[]>([]);
  const [note, setNote] = useState<string>();
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(full: PinPicture[]) {
    setBusy(true);
    try {
      const res = await api<Session>('/auth/child/login', {
        body: { familyCode: code, childId: profile.id, pin: full },
      });
      setSession('child', res);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 429
          ? t('play.login.pin.locked')
          : err instanceof ApiError && err.status === 401
            ? t('play.login.pin.retry')
            : t('play.login.offline');
      setNote(msg);
      speak(msg);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin([]);
    } finally {
      setBusy(false);
    }
  }

  const tap = (p: PinPicture) => {
    if (busy || pin.length >= PIN_LENGTH) return;
    const next = [...pin, p];
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  return (
    <main className="kid-screen">
      <div className="kid-say">
        <Momo color={profile.momoColor} mood={note ? 'curious' : 'happy'} size={90} />
        <SpeakButton text={t('play.login.pin.say')} />
        <p>{note ?? t('play.login.pin.say')}</p>
      </div>
      <div className={`pin-slots${shake ? ' shake' : ''}`} aria-live="polite">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <div key={i} className="pin-slot">
            {pin[i] ? (
              <VisualView visual={{ kind: 'object', object: pin[i]! }} size={64} />
            ) : (
              <span className="pin-dot" aria-hidden />
            )}
          </div>
        ))}
      </div>
      <div className="pin-grid">
        {PIN_PICTURES.map((p) => (
          <button
            key={p}
            type="button"
            className="pin-key"
            disabled={busy}
            onClick={() => tap(p)}
            aria-label={p}
          >
            <VisualView visual={{ kind: 'object', object: p }} size={76} />
          </button>
        ))}
      </div>
      <div className="kid-row">
        <button type="button" className="kid-link" onClick={onBack}>
          {t('play.login.back')}
        </button>
        <button
          type="button"
          className="kid-link"
          disabled={pin.length === 0}
          onClick={() => setPin([])}
        >
          {t('play.login.pin.clear')}
        </button>
      </div>
    </main>
  );
}
