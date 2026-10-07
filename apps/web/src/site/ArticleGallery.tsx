import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { mediaUrl } from '../components/BannerSlider';
import { t } from '../i18n';

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Galeri gambar artikel (D-076): satu gambar → gambar besar; lebih dari satu → slider dengan panah, titik, penanda
 * "n / total", thumbnail, geser jari (swipe), dan tombol panah keyboard. Gambar ditampilkan utuh (contain) di
 * atas latar buram dari gambar yang sama, jadi gambar portrait maupun landscape tetap rapi.
 */
export function ArticleGallery({ ids, title }: { ids: readonly string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const start = useRef<number | null>(null);
  const count = ids.length;
  const key = ids.join();
  useEffect(() => {
    setIndex(0);
  }, [key]);
  if (count === 0) return null;
  const i = Math.min(index, count - 1);
  const go = (n: number) => setIndex((n + count) % count);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(i - 1);
    if (e.key === 'ArrowRight') go(i + 1);
  };
  const onDown = (e: PointerEvent) => {
    start.current = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    if (start.current === null) return;
    const dx = e.clientX - start.current;
    start.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
  };

  return (
    <figure
      className={`art-gallery${count > 1 ? ' is-multi' : ''}`}
      aria-roledescription={count > 1 ? t('site.articles.gallery') : undefined}
      aria-label={count > 1 ? t('site.articles.galleryLabel', { title, n: count }) : undefined}
    >
      <div
        className="art-gallery-stage"
        tabIndex={count > 1 ? 0 : -1}
        onKeyDown={count > 1 ? onKey : undefined}
        onPointerDown={count > 1 ? onDown : undefined}
        onPointerUp={count > 1 ? onUp : undefined}
      >
        <div className="art-gallery-track" style={{ transform: `translateX(-${i * 100}%)` }}>
          {ids.map((id, k) => (
            <div
              key={id}
              className="art-gallery-slide"
              aria-hidden={k !== i}
              style={{ ['--bg' as string]: `url(${mediaUrl(id)})` }}
            >
              <img
                src={mediaUrl(id)}
                alt={count > 1 ? t('site.articles.imageN', { n: k + 1, total: count }) : ''}
                loading={k === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
        {count > 1 && (
          <>
            <button
              type="button"
              className="art-gallery-nav is-prev"
              aria-label={t('site.articles.prevImage')}
              onClick={() => go(i - 1)}
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className="art-gallery-nav is-next"
              aria-label={t('site.articles.nextImage')}
              onClick={() => go(i + 1)}
            >
              <Chevron dir="right" />
            </button>
            <span className="art-gallery-count" aria-live="polite">
              {i + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="art-gallery-thumbs" role="tablist" aria-label={t('site.articles.gallery')}>
          {ids.map((id, k) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-label={t('site.articles.imageN', { n: k + 1, total: count })}
              className={`art-gallery-thumb${k === i ? ' is-on' : ''}`}
              onClick={() => go(k)}
            >
              <img src={mediaUrl(id)} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
