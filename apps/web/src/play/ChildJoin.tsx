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
import { SpeakButton } from './ItemPlayer';

type Step = 'code' | 'name' | 'color' | 'pin' | 'confirm';
const STEPS: Step[] = ['code', 'name', 'color', 'pin', 'confirm'];

const cleanCode = (v: string) =>
  v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

/**
 * Gabung kelas sendiri (D-025): kode kelas → nama panggilan → warna Momo → 3 gambar sandi (2×).
 * Tanpa email; persetujuan diwakili fasilitator kelas. Setelah selesai langsung masuk Pustaka.
 */
export function ChildJoin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState<Step>('code');
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
    name: t('play.join.name.say', { className }),
    color: t('play.join.color.say'),
    pin: t('play.join.pin.say'),
    confirm: t('play.join.confirm.say'),
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

  async function join(full: PinPicture[]) {
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
          <p className="join-class">{className}</p>
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

      <div className="kid-row">
        <button type="button" className="kid-link" onClick={back}>
          {t('play.login.back')}
        </button>
        {step === 'code' && (
          <Link className="kid-link" to="/play">
            {t('play.join.haveAccount')}
          </Link>
        )}
      </div>
    </main>
  );
}
