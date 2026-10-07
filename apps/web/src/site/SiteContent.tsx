import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { articleBlocks, youtubeEmbed, youtubeThumb } from '@little-coder/engine';
import { api, ApiError } from '../api/client';
import { mediaUrl } from '../components/BannerSlider';
import { Seo } from '../components/Seo';
import { t } from '../i18n';
import { ArticleGallery } from './ArticleGallery';
import { SiteFooter, SiteNav } from './Landing';
import './gallery.css';
import './content.css';

export type PublicVideo = { id: string; youtubeId: string; title: string; description: string };
export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImageId: string | null;
  imageIds?: string[];
  publishedAt: string | null;
};
export type ArticleFull = ArticleCard & { body: string };
type ArticlePage = { items: ArticleCard[]; total: number; page: number; pageSize: number };

const LIST_SIZE = 12;

export const articleDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

const isObj = (d: unknown): d is Record<string, unknown> => typeof d === 'object' && d !== null;
const asVideos = (d: unknown): PublicVideo[] | null =>
  Array.isArray(d) ? d.filter((v) => isObj(v) && typeof v.youtubeId === 'string') : null;
const asArticlePage = (d: unknown): ArticlePage | null =>
  isObj(d) && Array.isArray(d.items)
    ? {
        items: d.items.filter((a) => isObj(a) && typeof a.slug === 'string') as ArticleCard[],
        total: typeof d.total === 'number' ? d.total : d.items.length,
        page: typeof d.page === 'number' ? d.page : 1,
        pageSize: typeof d.pageSize === 'number' ? d.pageSize : d.items.length,
      }
    : null;
const asArticle = (d: unknown): ArticleFull | null =>
  isObj(d) && typeof d.slug === 'string' && typeof d.body === 'string' ? (d as ArticleFull) : null;

/**
 * Ambil data publik sekali; gagal atau bentuk data tak terduga → `null` (bagian landing disembunyikan, tidak
 * mengganggu halaman).
 */
function usePublic<T>(path: string, parse: (d: unknown) => T | null) {
  // `path` diisi saat jawaban untuk alamat itu sudah datang (berhasil, 404, atau gagal).
  const [state, setState] = useState<{ path: string | null; data: T | null; failed: boolean }>({
    path: null,
    data: null,
    failed: false,
  });
  useEffect(() => {
    let live = true;
    api<unknown>(path)
      .then((raw) => {
        const data = parse(raw);
        if (live) setState({ path, data, failed: data === null });
      })
      .catch(
        (err: unknown) =>
          live &&
          setState({ path, data: null, failed: !(err instanceof ApiError && err.status === 404) }),
      );
    return () => {
      live = false;
    };
    // `parse` adalah fungsi modul yang tetap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  const done = state.path === path;
  return { data: done ? state.data : null, failed: done && state.failed, loading: !done };
}

// ------------------------------------------------------------ video

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden focusable="false">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Pemutar dalam dialog (youtube-nocookie, baru dimuat saat dibuka). Esc / klik luar menutup. */
function VideoDialog({ video, onClose }: { video: PublicVideo; onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeBtn.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Tab') {
      // Hanya satu tombol yang bisa difokus di luar iframe: tahan fokus di dialog.
      e.preventDefault();
      closeBtn.current?.focus();
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
        className="vid-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={video.title}
        onKeyDown={onKeyDown}
      >
        <button
          ref={closeBtn}
          type="button"
          className="gal-close"
          aria-label={t('site.videos.close')}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
        <div className="vid-frame">
          <iframe
            src={youtubeEmbed(video.youtubeId)}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p className="vid-caption">
          <strong>{video.title}</strong>
          {video.description && <span>{video.description}</span>}
        </p>
      </div>
    </div>
  );
}

/** Video panduan dari admin (D-073). Disembunyikan bila belum ada video aktif. */
export function VideosSection() {
  const { data } = usePublic('/public/videos', asVideos);
  const [open, setOpen] = useState<PublicVideo | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  if (!data?.length) return null;
  const close = () => {
    const last = open;
    setOpen(null);
    if (last) buttons.current.get(last.id)?.focus();
  };
  return (
    <section id="video" className="site-section videos" aria-labelledby="video-title">
      <h2 id="video-title">{t('site.videos.title')}</h2>
      <p className="section-lead">{t('site.videos.lead')}</p>
      <ul className="vid-grid">
        {data.map((v) => (
          <li key={v.id} className="vid-item">
            <button
              type="button"
              className="vid-thumb"
              aria-label={t('site.videos.play', { title: v.title })}
              ref={(el) => {
                if (el) buttons.current.set(v.id, el);
                else buttons.current.delete(v.id);
              }}
              onClick={() => setOpen(v)}
            >
              <img src={youtubeThumb(v.youtubeId)} alt="" loading="lazy" decoding="async" />
              <span className="vid-play" aria-hidden>
                <svg viewBox="0 0 24 24" width="30" height="30">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </span>
            </button>
            <div className="vid-meta">
              <strong>{v.title}</strong>
              {v.description && <span>{v.description}</span>}
            </div>
          </li>
        ))}
      </ul>
      {open && <VideoDialog video={open} onClose={close} />}
    </section>
  );
}

// ------------------------------------------------------------ artikel

function ArticleCardView({ a, headingLevel = 3 }: { a: ArticleCard; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <li className="art-card">
      <Link to={`/artikel/${a.slug}`} className="art-card-link">
        <div className={`art-cover${a.coverImageId ? '' : ' is-empty'}`}>
          {a.coverImageId && (
            <img src={mediaUrl(a.coverImageId)} alt="" loading="lazy" decoding="async" />
          )}
        </div>
        <div className="art-card-body">
          {a.publishedAt && <time dateTime={a.publishedAt}>{articleDate(a.publishedAt)}</time>}
          <H>{a.title}</H>
          <p>{a.summary}</p>
          <span className="art-more" aria-hidden>
            {t('site.articles.read')}
          </span>
        </div>
      </Link>
    </li>
  );
}

/** 3 artikel terbaru + "Lihat semua" (D-073). Disembunyikan bila belum ada artikel terbit. */
export function ArticlesSection() {
  const { data } = usePublic('/public/articles?page=1&pageSize=3', asArticlePage);
  if (!data?.items.length) return null;
  return (
    <section id="artikel" className="site-section articles" aria-labelledby="artikel-title">
      <h2 id="artikel-title">{t('site.articles.title')}</h2>
      <p className="section-lead">{t('site.articles.lead')}</p>
      <ul className="art-grid">
        {data.items.map((a) => (
          <ArticleCardView key={a.id} a={a} />
        ))}
      </ul>
      {data.total > data.items.length && (
        <div className="art-foot">
          <Link to="/artikel" className="site-btn ghost">
            {t('site.articles.all', { n: data.total })}
          </Link>
        </div>
      )}
    </section>
  );
}

/** Isi artikel: blok teks biasa (subjudul, paragraf, daftar) — tidak ada HTML dari admin. */
export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="art-body">
      {articleBlocks(body).map((b, i) =>
        b.type === 'h' ? (
          <h2 key={i}>{b.text}</h2>
        ) : b.type === 'ul' ? (
          <ul key={i}>
            {b.items.map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}

function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <SiteNav />
      <main className="art-page">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** /artikel — semua artikel terbit, terbaru dulu, per halaman. */
export function ArticlesPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('halaman')) || 1);
  const { data, failed, loading } = usePublic(
    `/public/articles?page=${page}&pageSize=${LIST_SIZE}`,
    asArticlePage,
  );
  const pages = data ? Math.max(1, Math.ceil(data.total / LIST_SIZE)) : 1;
  const go = (p: number) => {
    setParams(p > 1 ? { halaman: String(p) } : {});
    window.scrollTo({ top: 0 });
  };
  return (
    <SitePage>
      <Seo
        title={t('site.articles.title')}
        description={t('site.articles.lead')}
        canonical={page > 1 ? `/artikel?halaman=${page}` : '/artikel'}
      />
      <nav className="art-crumbs" aria-label={t('site.articles.crumbs')}>
        <Link to="/">{t('site.articles.home')}</Link>
      </nav>
      <h1>{t('site.articles.title')}</h1>
      <p className="section-lead">{t('site.articles.lead')}</p>
      {loading ? (
        <p className="art-status" role="status">
          {t('site.articles.loading')}
        </p>
      ) : failed ? (
        <p className="art-status">{t('site.articles.offline')}</p>
      ) : !data?.items.length ? (
        <p className="art-status">{t('site.articles.empty')}</p>
      ) : (
        <>
          <ul className="art-grid">
            {data.items.map((a) => (
              <ArticleCardView key={a.id} a={a} headingLevel={2} />
            ))}
          </ul>
          {pages > 1 && (
            <nav className="art-pager" aria-label={t('site.articles.pager')}>
              <button
                type="button"
                className="site-btn ghost"
                disabled={page <= 1}
                onClick={() => go(page - 1)}
              >
                {t('site.articles.prev')}
              </button>
              <span aria-live="polite">{t('site.articles.pageOf', { page, pages })}</span>
              <button
                type="button"
                className="site-btn ghost"
                disabled={page >= pages}
                onClick={() => go(page + 1)}
              >
                {t('site.articles.next')}
              </button>
            </nav>
          )}
        </>
      )}
    </SitePage>
  );
}

const readMinutes = (body: string) =>
  Math.max(1, Math.round(body.trim().split(/\s+/).filter(Boolean).length / 200));

/** Semua gambar artikel (D-076); data lama hanya punya sampul. */
export const articleImageIds = (a: Pick<ArticleCard, 'coverImageId' | 'imageIds'>) =>
  a.imageIds?.length ? a.imageIds : a.coverImageId ? [a.coverImageId] : [];

function ShareBar({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? '' : window.location.href;
  const copy = () => {
    void navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  };
  return (
    <div className="art-share" aria-label={t('site.articles.share')} role="group">
      <span className="art-share-label">{t('site.articles.share')}</span>
      <a
        className="art-share-btn"
        href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('site.articles.shareWa')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            fill="currentColor"
            d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"
          />
        </svg>
      </a>
      <button
        type="button"
        className="art-share-btn"
        onClick={copy}
        aria-label={t('site.articles.copyLink')}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
          <path
            d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <span className="art-share-note" role="status">
        {copied ? t('site.articles.copied') : ''}
      </span>
    </div>
  );
}

/** Artikel lain (terbaru, tanpa artikel yang sedang dibuka). */
function MoreArticles({ slug }: { slug: string }) {
  const { data } = usePublic('/public/articles?page=1&pageSize=4', asArticlePage);
  const items = data?.items.filter((a) => a.slug !== slug).slice(0, 3) ?? [];
  if (!items.length) return null;
  return (
    <section className="art-more-sec" aria-labelledby="art-more-title">
      <div className="art-more-head">
        <h2 id="art-more-title">{t('site.articles.moreTitle')}</h2>
        <Link to="/artikel" className="art-more-all">
          {t('site.articles.back')}
        </Link>
      </div>
      <ul className="art-grid">
        {items.map((a) => (
          <ArticleCardView key={a.id} a={a} />
        ))}
      </ul>
    </section>
  );
}

/** /artikel/:slug — header + galeri (slider bila >1 gambar, D-076) + isi + bagikan + artikel lain. */
export function ArticleDetailPage() {
  const { slug = '' } = useParams();
  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const { data, failed, loading } = usePublic(
    valid ? `/public/articles/${slug}` : '/public/articles/-',
    asArticle,
  );
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);
  const crumbs = (
    <nav className="art-crumbs" aria-label={t('site.articles.crumbs')}>
      <Link to="/">{t('site.articles.home')}</Link>
      <span aria-hidden>/</span>
      <Link to="/artikel">{t('site.articles.title')}</Link>
      {data && (
        <>
          <span aria-hidden>/</span>
          <span className="art-crumb-here" aria-current="page">
            {data.title}
          </span>
        </>
      )}
    </nav>
  );
  return (
    <SitePage>
      {loading && valid ? (
        <div className="art-detail" aria-busy="true">
          {crumbs}
          <div className="art-skeleton" role="status">
            <span className="sr-only">{t('site.articles.loading')}</span>
            <i className="sk-line w40" />
            <i className="sk-line w90 tall" />
            <i className="sk-line w70" />
            <i className="sk-block" />
          </div>
        </div>
      ) : !data ? (
        <div className="art-detail art-missing">
          {crumbs}
          <Seo title={t('site.articles.notFound')} noindex />
          <h1>{t('site.articles.notFound')}</h1>
          <p className="art-status">
            {failed ? t('site.articles.offline') : t('site.articles.notFoundBody')}
          </p>
          <Link to="/artikel" className="site-btn">
            {t('site.articles.back')}
          </Link>
        </div>
      ) : (
        <div className="art-detail">
          <Seo title={data.title} description={data.summary} canonical={`/artikel/${data.slug}`} />
          {crumbs}
          <article className="art-full">
            <header className="art-head">
              <span className="art-kicker">{t('site.articles.kicker')}</span>
              <h1>{data.title}</h1>
              {data.summary && <p className="art-lead">{data.summary}</p>}
              <div className="art-meta">
                <span className="art-meta-info">
                  {data.publishedAt && (
                    <time dateTime={data.publishedAt}>{articleDate(data.publishedAt)}</time>
                  )}
                  {data.publishedAt && <span aria-hidden>·</span>}
                  <span>{t('site.articles.minutes', { n: readMinutes(data.body) })}</span>
                </span>
                <ShareBar title={data.title} />
              </div>
            </header>
            <ArticleGallery ids={articleImageIds(data)} title={data.title} />
            <ArticleBody body={data.body} />
            <aside className="art-cta">
              <div>
                <strong>{t('site.articles.ctaTitle')}</strong>
                <p>{t('site.articles.ctaBody')}</p>
              </div>
              <div className="art-cta-actions">
                <Link to="/play" className="site-btn">
                  {t('site.cta.play')}
                </Link>
                <Link to="/artikel" className="site-btn ghost">
                  {t('site.articles.back')}
                </Link>
              </div>
            </aside>
          </article>
          <MoreArticles slug={data.slug} />
        </div>
      )}
    </SitePage>
  );
}
