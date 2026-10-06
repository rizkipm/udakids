import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MOMO_COLORS,
  nicknameSchema,
  PIN_LENGTH,
  PIN_PICTURES,
  SAY_COLOR,
  type Color,
  type PinPicture,
} from '@little-coder/engine';
import { api, ApiError } from '../api/client';
import { speak } from '../audio/speech';
import { rememberFamilyCode, setSession, type Session } from '../auth/session';
import { Momo } from '../components/Momo';
import { VisualView } from '../components/visuals';
import { t } from '../i18n';
import { Seo } from '../components/Seo';
import { SpeakButton } from './ItemPlayer';

type Step = 'code' | 'name' | 'color' | 'pin' | 'confirm' | 'done';
const CLASS_STEPS: Step[] = ['code', 'name', 'color', 'pin', 'confirm'];
/** Daftar sendiri (D-037): tanpa kode kelas; di akhir anak mendapat kode keluarga sendiri. */
const SELF_STEPS: Step[] = ['name', 'color', 'pin', 'confirm', 'done'];

const cleanCode = (v: string) =>
  v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

/**
 * Gabung kelas sendiri (D-025): kode kelas → nama panggilan → warna Momo → 3 gambar sandi (2×).
 * Tanpa email; persetujuan diwakili fasilitator kelas. Setelah selesai langsung masuk Pustaka.
 *
 * `self` = daftar sendiri tanpa orang tua (D-037): nama → warna → sandi gambar → kode keluarga baru.
 * Hanya nama panggilan, warna Momo, dan sandi gambar yang disimpan (PRD A17).
 */
export function ChildJoin({ self = false }: { self?: boolean }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const STEPS = self ? SELF_STEPS : CLASS_STEPS;
  const [step, setStep] = useState<Step>(self ? 'name' : 'code');
  const [newCode, setNewCode] = useState('');
  // Sesi baru dipasang setelah anak melihat kode keluarganya (PlayApp berpindah saat sesi ada).
  const [pending, setPending] = useState<Session>();
  const [code, setCode] = useState(() => cleanCode(params.get('kode') ?? ''));
  const [className, setClassName] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState<Color>('ungu');
  const [pin, setPin] = useState<PinPicture[]>([]);
  const [confirm, setConfirm] = useState<PinPicture[]>([]);
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(false);

  const say: Record<Step, string> = {
    code: t('play.join.code.say'),
    name: self ? t('play.register.name.say') : t('play.join.name.say', { className }),
    color: t('play.join.color.say'),
    pin: t('play.join.pin.say'),
    confirm: t('play.join.confirm.say'),
    done: t('play.register.done', { name, code: newCode.split('').join(' ') }),
  };
  useEffect(() => {
    setNote(undefined);
    speak(say[step]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function checkCode(e?: FormEvent) {
    e?.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const res = await api<{ eventName: string }>(`/auth/class/${code}`);
      setClassName(res.eventName);
      setStep('name');
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 404
          ? t('play.join.code.notFound')
          : t('play.login.offline');
      setNote(msg);
      speak(msg);
    } finally {
      setBusy(false);
    }
  }

  function submitName(e: FormEvent) {
    e.preventDefault();
    const parsed = nicknameSchema.safeParse(name);
    if (!parsed.success) {
      setNote(t('play.join.name.invalid'));
      return;
    }
    setName(parsed.data);
    setStep('color');
  }

  async function register(full: PinPicture[]) {
    setBusy(true);
    try {
      const res = await api<Session & { familyCode: string }>('/auth/child/register', {
        body: { nickname: name, momoColor: color, pin: full },
      });
      rememberFamilyCode(res.familyCode);
      setPending({ token: res.token, user: res.user });
      setNewCode(res.familyCode);
      setStep('done');
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 429
          ? t('play.register.limit')
          : t('play.login.offline');
      setNote(msg);
      speak(msg);
      setPin([]);
      setConfirm([]);
      setStep('pin');
    } finally {
      setBusy(false);
    }
  }

  async function join(full: PinPicture[]) {
    if (self) return register(full);
    setBusy(true);
    try {
      const res = await api<Session & { classCode: string }>('/auth/class/join', {
        body: { classCode: code, nickname: name, momoColor: color, pin: full },
      });
      // Perangkat mengingat kode kelas: lain kali cukup pilih nama + sandi gambar.
      rememberFamilyCode(code);
      setSession('child', { token: res.token, user: res.user });
      speak(t('play.join.done', { name }));
      navigate('/play', { replace: true });
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      const msg = conflict ? t('play.join.name.taken') : t('play.login.offline');
      setNote(msg);
      speak(msg);
      setPin([]);
      setConfirm([]);
      setStep(conflict ? 'name' : 'pin');
    } finally {
      setBusy(false);
    }
  }

  const tapPin = (p: PinPicture) => {
    if (busy) return;
    if (step === 'pin') {
      const next = [...pin, p].slice(0, PIN_LENGTH);
      setPin(next);
      if (next.length === PIN_LENGTH) setTimeout(() => setStep('confirm'), 350);
      return;
    }
    const next = [...confirm, p].slice(0, PIN_LENGTH);
    setConfirm(next);
    if (next.length < PIN_LENGTH) return;
    if (next.every((x, i) => x === pin[i])) void join(pin);
    else {
      const msg = t('play.join.confirm.mismatch');
      setNote(msg);
      speak(msg);
      setPin([]);
      setConfirm([]);
      setStep('pin');
    }
  };

  const stepNo = STEPS.indexOf(step);
  const back = () => (stepNo === 0 ? navigate('/play') : setStep(STEPS[stepNo - 1]!));

  return (
    <main className="kid-screen join-screen">
      <Seo
        title={self ? 'Daftar Sendiri Anak' : 'Gabung Kelas'}
        description={
          self
            ? 'Pendaftaran mandiri anak dengan nama panggilan dan 3 gambar sandi rahasia.'
            : 'Gabung kelas Little Coder dengan kode kelas dari guru atau sekolah.'
        }
        canonical={self ? '/play/daftar' : '/play/gabung'}
      />
      <ol
        className="join-steps"
        aria-label={t('play.join.progress', { n: stepNo + 1, total: STEPS.length })}
      >
        {STEPS.map((s, i) => (
          <li key={s} className={i < stepNo ? 'is-done' : i === stepNo ? 'is-current' : ''} />
        ))}
      </ol>
      <div className="kid-say">
        <Momo color={color} mood={note ? 'curious' : 'happy'} size={96} />
        <SpeakButton text={note ?? say[step]} />
        <p>{note ?? say[step]}</p>
      </div>

      {step === 'code' && (
        <form className="code-form" onSubmit={checkCode}>
          <label htmlFor="class-code">{t('play.join.code.title')}</label>
          <input
            id="class-code"
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button type="submit" className="kid-btn" disabled={busy || code.length !== 6}>
            {t('play.login.code.submit')}
          </button>
        </form>
      )}

      {step === 'name' && (
        <form className="code-form" onSubmit={submitName}>
          {className && <p className="join-class">{className}</p>}
          <label htmlFor="nickname">{t('play.join.name.title')}</label>
          <input
            id="nickname"
            className="is-name"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          <small>{t('play.join.name.hint')}</small>
          <button type="submit" className="kid-btn" disabled={name.trim().length === 0}>
            {t('play.login.code.submit')}
          </button>
        </form>
      )}

      {step === 'color' && (
        <>
          <div className="color-choices" role="radiogroup" aria-label={t('play.join.color.title')}>
            {MOMO_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === color}
                className={`color-choice${c === color ? ' is-on' : ''}`}
                onClick={() => {
                  setColor(c);
                  speak(SAY_COLOR[c]);
                }}
              >
                <Momo color={c} mood={c === color ? 'happy' : 'idle'} size={76} />
                <span>{SAY_COLOR[c]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="kid-btn" onClick={() => setStep('pin')}>
            {t('play.login.code.submit')}
          </button>
        </>
      )}

      {(step === 'pin' || step === 'confirm') && (
        <>
          <div className="pin-slots" aria-live="polite">
            {Array.from({ length: PIN_LENGTH }, (_, i) => {
              const p = (step === 'pin' ? pin : confirm)[i];
              return (
                <div key={i} className="pin-slot">
                  {p ? (
                    <VisualView visual={{ kind: 'object', object: p }} size={64} />
                  ) : (
                    <span className="pin-dot" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
          <div className="pin-grid">
            {PIN_PICTURES.map((p) => (
              <button
                key={p}
                type="button"
                className="pin-key"
                disabled={busy}
                onClick={() => tapPin(p)}
                aria-label={p}
              >
                <VisualView visual={{ kind: 'object', object: p }} size={76} />
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'done' && (
        <div className="code-form self-code">
          <p className="self-code-label">{t('play.register.codeLabel')}</p>
          <p className="self-code-value" aria-label={newCode.split('').join(' ')}>
            {newCode}
          </p>
          <small>{t('play.register.codeHint')}</small>
          <button
            type="button"
            className="kid-btn"
            onClick={() => {
              if (pending) setSession('child', pending);
              navigate('/play', { replace: true });
            }}
          >
            {t('play.register.start')}
          </button>
        </div>
      )}

      <div className="kid-row">
        {step !== 'done' && (
          <button type="button" className="kid-link" onClick={back}>
            {t('play.login.back')}
          </button>
        )}
        {(step === 'code' || (self && step === 'name')) && (
          <Link className="kid-link" to="/play">
            {t('play.join.haveAccount')}
          </Link>
        )}
      </div>
    </main>
  );
}
