import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../api/client';
import { mediaUrl } from '../components/BannerSlider';
import { t } from '../i18n';
import './gallery.css';

export type GalleryPhoto = {
  id: string;
  title: string;
  caption: string;
  eventDate: string | null;
  imageId: string;
};
type GalleryPage = { items: GalleryPhoto[]; total: number; page: number; pageSize: number };

export const GALLERY_PAGE_SIZE = 12;

const pagePath = (page: number) => `/public/gallery?page=${page}&pageSize=${GALLERY_PAGE_SIZE}`;

function asPage(d: unknown): GalleryPage {
  const p = (d ?? {}) as Partial<GalleryPage>;
  return {
    items: Array.isArray(p.items) ? p.items : [],
    total: typeof p.total === 'number' ? p.total : 0,
    page: typeof p.page === 'number' ? p.page : 1,
    pageSize: GALLERY_PAGE_SIZE,
  };
}

/** Halaman pertama dibagi antara nav ("Galeri") dan bagian galeri — satu request. */
let firstPage: { at: number; promise: Promise<GalleryPage> } | null = null;
function loadFirstPage(): Promise<GalleryPage> {
  if (!firstPage || Date.now() - firstPage.at > 60_000) {
    const promise = api<unknown>(pagePath(1)).then(asPage);
    promise.catch(() => {
      firstPage = null;
    });
    firstPage = { at: Date.now(), promise };
  }
  return firstPage.promise;
}
/** Untuk test: lupakan cache halaman pertama. */
export const resetGalleryCache = () => {
  firstPage = null;
};

/** Ada foto galeri? (tautan "Galeri" di nav hanya muncul bila ada isinya). */
export function useHasGallery() {
  const [has, setHas] = useState(false);
  useEffect(() => {
    let live = true;
    loadFirstPage()
      .then((p) => live && setHas(p.items.length > 0))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return has;
}

export const eventDateLabel = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

function Chevron({ dir }: { dir: 'prev' | 'next' | 'close' }) {
  const d =
    dir === 'prev' ? 'M15 5l-7 7 7 7' : dir === 'next' ? 'M9 5l7 7-7 7' : 'M6 6l12 12M18 6L6 18';
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden focusable="false">
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

/** Lightbox: Esc menutup, ← → berpindah foto, fokus dikurung di dalam dialog. */
export function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: GalleryPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const photo = items[index]!;
  const count = items.length;

  useEffect(() => {
    closeBtn.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const step = (d: number) => onIndex((index + d + count) % count);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowRight' && count > 1) step(1);
    else if (e.key === 'ArrowLeft' && count > 1) step(-1);
    else if (e.key === 'Tab') {
      const nodes = box.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (!nodes?.length) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="gal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        className="gal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('media.gallery.dialog')}
        aria-describedby="gal-dialog-cap"
        onKeyDown={onKeyDown}
      >
        <button
          ref={closeBtn}
          type="button"
          className="gal-close"
          aria-label={t('media.gallery.close')}
          onClick={onClose}
        >
          <Chevron dir="close" />
        </button>
        <figure className="gal-figure">
          <img src={mediaUrl(photo.imageId)} alt={photo.title} />
          <figcaption id="gal-dialog-cap">
            <strong>{photo.title}</strong>
            {photo.eventDate && (
              <time dateTime={photo.eventDate}>{eventDateLabel(photo.eventDate)}</time>
            )}
            {photo.caption && <span>{photo.caption}</span>}
            {count > 1 && (
              <span className="gal-pos" aria-live="polite">
                {t('media.gallery.position', { n: index + 1, total: count })}
              </span>
            )}
          </figcaption>
        </figure>
        {count > 1 && (
          <>
            <button
              type="button"
              className="gal-nav gal-prev"
              aria-label={t('media.gallery.prev')}
              onClick={() => step(-1)}
            >
              <Chevron dir="prev" />
            </button>
            <button
              type="button"
              className="gal-nav gal-next"
              aria-label={t('media.gallery.next')}
              onClick={() => step(1)}
            >
              <Chevron dir="next" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Galeri dokumentasi kegiatan di landing (D-042). Disembunyikan bila belum ada foto. */
export function GallerySection() {
  const [items, setItems] = useState<GalleryPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const thumbs = useRef(new Map<string, HTMLButtonElement>());
  /** Tutup lightbox → fokus kembali ke foto yang terakhir dilihat. */
  const close = () => {
    const last = open !== null ? items[open] : undefined;
    setOpen(null);
    if (last) thumbs.current.get(last.id)?.focus();
  };

  useEffect(() => {
    let live = true;
    loadFirstPage()
      .then((p) => {
        if (!live) return;
        setItems(p.items);
        setTotal(p.total);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const more = useCallback(async () => {
    setBusy(true);
    try {
      const p = asPage(await api<unknown>(pagePath(page + 1)));
      setItems((old) => {
        const seen = new Set(old.map((x) => x.id));
        return [...old, ...p.items.filter((x) => !seen.has(x.id))];
      });
      setTotal(p.total);
      setPage((n) => n + 1);
    } catch {
      /* coba lagi lewat tombol yang sama */
    } finally {
      setBusy(false);
    }
  }, [page]);

  if (items.length === 0) return null;

  return (
    <section id="galeri" className="site-section gallery" aria-labelledby="galeri-title">
      <h2 id="galeri-title">{t('media.gallery.title')}</h2>
      <p className="section-lead">{t('media.gallery.lead')}</p>
      <ul className="gal-grid">
        {items.map((p, i) => (
          <li key={p.id} className="gal-item">
            <button
              type="button"
              className="gal-thumb"
              aria-label={t('media.gallery.open', { title: p.title })}
              ref={(el) => {
                if (el) thumbs.current.set(p.id, el);
                else thumbs.current.delete(p.id);
              }}
              onClick={() => setOpen(i)}
            >
              <img src={mediaUrl(p.imageId)} alt="" loading="lazy" decoding="async" />
            </button>
            <div className="gal-meta">
              <strong>{p.title}</strong>
              {p.eventDate && <time dateTime={p.eventDate}>{eventDateLabel(p.eventDate)}</time>}
            </div>
          </li>
        ))}
      </ul>
      <div className="gal-foot">
        <span className="gal-count" aria-live="polite">
          {t('media.gallery.count', { shown: items.length, total: Math.max(total, items.length) })}
        </span>
        {items.length < total && (
          <button
            type="button"
            className="site-btn ghost"
            disabled={busy}
            onClick={() => void more()}
          >
            {busy ? t('media.gallery.loading') : t('media.gallery.more')}
          </button>
        )}
      </div>
      {open !== null && items[open] && (
        <Lightbox items={items} index={open} onIndex={setOpen} onClose={close} />
      )}
    </section>
  );
}
