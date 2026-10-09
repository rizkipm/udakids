import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Color, MomoLook } from '@little-coder/engine';
import { api } from '../api/client';
import { Momo } from '../components/Momo';
import { t } from '../i18n';
import './playingToast.css';

type Playing = {
  nickname: string;
  momoColor: string;
  momoLook: MomoLook | null;
  book: string;
  topic: string;
};

/** Jadwal tampil (D-103): pertama setelah 8 dtk, tampil 7 dtk, jeda 20 dtk, maks. 4 kali per kunjungan. */
const FIRST_MS = 8_000;
const SHOW_MS = 7_000;
const GAP_MS = 20_000;
const MAX_PER_VISIT = 4;
const REFRESH_MS = 60_000;
const SEEN_KEY = 'lc.playingToast';

const readSeen = (): { n: number; closed: boolean } => {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '') as { n: number; closed: boolean };
  } catch {
    return { n: 0, closed: false };
  }
};
const writeSeen = (v: { n: number; closed: boolean }) => {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(v));
  } catch {
    /* penyimpanan tidak tersedia: batas hanya berlaku di halaman ini */
  }
};

/**
 * Toast "sedang bermain" di landing (D-103): kiri bawah (tombol WhatsApp di kanan bawah), kecil, bisa ditutup,
 * berhenti saat disorot, dan tidak muncul lebih dari 4 kali per kunjungan. Datanya hanya nama panggilan, Momo, dan
 * materi (`/public/playing`, tanpa id/waktu; anak kelas sekolah tidak ditampilkan).
 */
export function PlayingToast() {
  const [list, setList] = useState<Playing[]>([]);
  const [shown, setShown] = useState<Playing>();
  const seen = useRef(readSeen());
  const idx = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nextTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listRef = useRef(list);
  listRef.current = list;

  // Ambil daftar, lalu perbarui tiap menit selama tab terlihat.
  useEffect(() => {
    let live = true;
    const load = () =>
      api<Playing[]>('/public/playing')
        .then((x) => live && setList(Array.isArray(x) ? x : []))
        .catch(() => undefined);
    void load();
    const id = setInterval(() => document.visibilityState !== 'hidden' && void load(), REFRESH_MS);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const hide = () => {
    setShown(undefined);
    nextTimer.current = setTimeout(show, GAP_MS);
  };
  function show() {
    const xs = listRef.current;
    if (seen.current.closed || seen.current.n >= MAX_PER_VISIT) return;
    if (xs.length === 0 || document.visibilityState === 'hidden') {
      nextTimer.current = setTimeout(show, GAP_MS);
      return;
    }
    setShown(xs[idx.current++ % xs.length]);
    seen.current = { ...seen.current, n: seen.current.n + 1 };
    writeSeen(seen.current);
    hideTimer.current = setTimeout(hide, SHOW_MS);
  }

  useEffect(() => {
    nextTimer.current = setTimeout(show, FIRST_MS);
    return () => {
      clearTimeout(nextTimer.current);
      clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    clearTimeout(hideTimer.current);
    clearTimeout(nextTimer.current);
    seen.current = { ...seen.current, closed: true };
    writeSeen(seen.current);
    setShown(undefined);
  };

  return (
    <div className="play-toast-zone" aria-live="polite" aria-label={t('site.toast.label')}>
      {shown && (
        <div
          className="play-toast"
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={() => {
            clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(hide, SHOW_MS / 2);
          }}
        >
          <Momo color={shown.momoColor as Color} look={shown.momoLook} mood="happy" size={46} />
          <p className="play-toast-text">
            <span>
              <strong>{shown.nickname}</strong> {t('site.toast.playing')}{' '}
              <strong>{shown.topic}</strong>
            </span>
            <small>{shown.book}</small>
            <Link to="/play" className="play-toast-cta">
              {t('site.toast.cta')}
            </Link>
          </p>
          <button
            type="button"
            className="play-toast-close"
            aria-label={t('site.toast.close')}
            onClick={close}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
