import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { getSession, type SessionKind } from '../auth/session';
import { API_URL } from '../config/app';
import { t } from '../i18n';
import './banner.css';

export type BannerPlacement = 'landing' | 'parent' | 'admin';
export const BANNER_TONES = ['grape', 'sun', 'coral', 'sky', 'leaf', 'teal'] as const;
export type BannerTone = (typeof BANNER_TONES)[number];

/** Banner seperti yang dikirim API untuk ditampilkan (D-042). */
export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  imageId: string | null;
  tone: string;
};

/** Alamat gambar yang diunggah admin (publik, cache lama). */
export const mediaUrl = (id: string) => `${API_URL}/media/${id}`;

const AUTOPLAY_MS = 6000;

const SOURCES: Record<BannerPlacement, { path: string; kind: SessionKind | null }> = {
  landing: { path: '/public/banners?placement=landing', kind: null },
  parent: { path: '/parent/banners', kind: 'parent' },
  admin: { path: '/admin/banners/live', kind: 'staff' },
};

function reducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/** Ambil banner tayang. Gagal/tidak ada → daftar kosong (slider disembunyikan, tanpa pesan). */
function useBanners(placement: BannerPlacement) {
  const [items, setItems] = useState<Banner[]>([]);
  useEffect(() => {
    const ctrl = new AbortController();
    const { path, kind } = SOURCES[placement];
    const token = kind ? (getSession(kind)?.token ?? null) : null;
    if (kind && !token) return;
    api<{ items?: unknown }>(path, { token, signal: ctrl.signal })
      .then((d) => setItems(Array.isArray(d?.items) ? (d.items as Banner[]) : []))
      .catch(() => {
        /* banner hanya pelengkap */
      });
    return () => ctrl.abort();
  }, [placement]);
  return items;
}

const isExternal = (url: string) => url.startsWith('https://');

function Cta({ banner }: { banner: Banner }) {
  if (!banner.ctaLabel || !banner.ctaUrl) return null;
  if (isExternal(banner.ctaUrl))
    return (
      <a className="bnr-cta" href={banner.ctaUrl} target="_blank" rel="noopener noreferrer">
        {banner.ctaLabel}
        <span className="bnr-sr">{t('media.banner.newTab')}</span>
        <Arrow dir="ext" />
      </a>
    );
  if (banner.ctaUrl.startsWith('/'))
    return (
      <Link className="bnr-cta" to={banner.ctaUrl}>
        {banner.ctaLabel}
        <Arrow dir="next" />
      </Link>
    );
  return null;
}

function Arrow({ dir }: { dir: 'prev' | 'next' | 'ext' }) {
  const d =
    dir === 'prev' ? 'M15 5l-7 7 7 7' : dir === 'next' ? 'M9 5l7 7-7 7' : 'M7 17L17 7M9 7h8v8';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden focusable="false">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Banner bergambar: gambar tampil UTUH sesuai rasio aslinya (tanpa dipotong, tanpa lapisan gelap). Teks sudah ada
 * di gambar, jadi judul tidak ditampilkan di atasnya — tetap dipakai sebagai teks alternatif untuk pembaca layar.
 * Bila ada tautan, seluruh gambar bisa diketuk.
 */
function ImageBanner({ banner }: { banner: Banner }) {
  const alt = [banner.title, banner.subtitle].filter(Boolean).join('. ');
  const img = (
    <img
      className="bnr-img-full"
      src={mediaUrl(banner.imageId!)}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
  const label = banner.ctaLabel || banner.title;
  const link =
    banner.ctaUrl && isExternal(banner.ctaUrl) ? (
      <a className="bnr-img-link" href={banner.ctaUrl} target="_blank" rel="noopener noreferrer">
        {img}
        <span className="bnr-sr">
          {label} {t('media.banner.newTab')}
        </span>
      </a>
    ) : banner.ctaUrl?.startsWith('/') ? (
      <Link className="bnr-img-link" to={banner.ctaUrl}>
        {img}
        <span className="bnr-sr">{label}</span>
      </Link>
    ) : (
      img
    );
  return (
    <div className="bnr-card is-image">
      <h2 className="bnr-sr">{banner.title}</h2>
      {link}
    </div>
  );
}

/** Satu kartu banner (dipakai slider dan pratinjau di admin). */
export function BannerCard({ banner }: { banner: Banner }) {
  if (banner.imageId) return <ImageBanner banner={banner} />;
  const tone = (BANNER_TONES as readonly string[]).includes(banner.tone) ? banner.tone : 'grape';
  return (
    <div className={`bnr-card bnr-tone-${tone}`}>
      <div className="bnr-text">
        <h2 className="bnr-title">{banner.title}</h2>
        {banner.subtitle && <p className="bnr-sub">{banner.subtitle}</p>}
        <Cta banner={banner} />
      </div>
      <svg className="bnr-deco" viewBox="0 0 120 120" aria-hidden focusable="false">
        <circle cx="90" cy="30" r="26" />
        <rect x="18" y="62" width="40" height="40" rx="10" />
        <path d="M78 74l10 20 22 2-16 15 5 22-21-11-20 11 4-22-16-15 22-2z" />
      </svg>
    </div>
  );
}

/** Slider dari daftar banner (tanpa fetch) — dipisah agar mudah dites. */
export function BannerSlides({
  items,
  placement,
}: {
  items: Banner[];
  placement: BannerPlacement;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [reduced] = useState(reducedMotion);
  const id = useId();
  const count = items.length;
  const current = Math.min(index, Math.max(0, count - 1));
  const autoplay = count > 1 && !reduced && !paused;
  const running = autoplay && !hover && !focus;

  const go = useCallback(
    (next: number, smooth = true) => {
      if (count === 0) return;
      const i = ((next % count) + count) % count;
      setIndex(i);
      const el = track.current;
      el?.scrollTo?.({
        left: i * el.clientWidth,
        behavior: (smooth && !reduced ? 'smooth' : 'instant') as ScrollBehavior,
      });
    },
    [count, reduced],
  );

  // Posisi geser (jari / trackpad) → slide aktif.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth || 1;
        setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / w))));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
    };
  }, [count]);

  // Lebar berubah (HP diputar) → tetap di slide yang sama.
  const indexRef = useRef(current);
  indexRef.current = current;
  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w) return;
      w = el.clientWidth;
      el.scrollTo?.({ left: indexRef.current * w, behavior: 'instant' as ScrollBehavior });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);

  // Ganti otomatis tiap ~6 detik (berhenti saat kursor/fokus di dalam, dijeda, atau reduced motion).
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      go(indexRef.current + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [running, go]);

  // Slide yang tidak tampil tidak bisa difokus (tautan di dalamnya).
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    Array.from(el.children).forEach((c, i) => {
      (c as HTMLElement).toggleAttribute('inert', i !== current);
    });
  }, [current, count]);

  if (count === 0) return null;
  const single = count === 1;

  return (
    <section
      className={`bnr bnr-at-${placement}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={t('media.banner.region')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
      }}
    >
      <div
        className="bnr-track"
        id={`${id}-track`}
        ref={track}
        aria-live={running ? 'off' : 'polite'}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(current + 1);
          if (e.key === 'ArrowLeft') go(current - 1);
        }}
      >
        {items.map((b, i) => (
          <div
            key={b.id}
            className="bnr-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${t('media.banner.slide', { n: i + 1, total: count })}: ${b.title}`}
            aria-hidden={i !== current}
          >
            <BannerCard banner={b} />
          </div>
        ))}
      </div>
      {!single && (
        <div className="bnr-controls">
          <button
            type="button"
            className="bnr-btn"
            aria-controls={`${id}-track`}
            aria-label={t('media.banner.prev')}
            onClick={() => go(current - 1)}
          >
            <Arrow dir="prev" />
          </button>
          <div className="bnr-dots" role="group" aria-label={t('media.banner.dots')}>
            {items.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className={`bnr-dot${i === current ? ' is-on' : ''}`}
                aria-current={i === current ? 'true' : undefined}
                aria-controls={`${id}-track`}
                aria-label={t('media.banner.goto', { n: i + 1, title: b.title })}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="bnr-btn"
            aria-controls={`${id}-track`}
            aria-label={t('media.banner.next')}
            onClick={() => go(current + 1)}
          >
            <Arrow dir="next" />
          </button>
          {!reduced && (
            <button
              type="button"
              className="bnr-btn"
              aria-label={paused ? t('media.banner.play') : t('media.banner.pause')}
              onClick={() => setPaused((p) => !p)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden focusable="false">
                {paused ? (
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                ) : (
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
                )}
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** Slideshow banner (kegiatan/promosi/info) untuk landing, dasbor orang tua, dan admin (D-042). */
export function BannerSlider({ placement }: { placement: BannerPlacement }) {
  const items = useBanners(placement);
  return <BannerSlides items={items} placement={placement} />;
}
