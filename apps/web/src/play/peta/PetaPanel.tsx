import { forwardRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  lessonPhotos,
  type Access,
  type Color,
  type LessonScreen,
  type PeragaPhoto,
} from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { t } from '../../i18n';
import type { Shelf } from '../catalog';
import { PlayIcon } from '../icons';
import type { Links } from '../links';
import { photoUrl } from '../peraga/photo';
import { PremiumNotice } from '../PremiumNotice';
import { Stars, type NodeInfo } from './PetaBelajar';

/** Layar pelajaran yang punya gambaran visual untuk dipratinjau di panel (D-088, D-093, D-101). */
const PREVIEW_KINDS = ['infografis', 'peraga', 'simulasi'] as const;
type PreviewKind = (typeof PREVIEW_KINDS)[number];
const PREVIEW_KEY = {
  infografis: 'play.peta.preview.infografis',
  peraga: 'play.peta.preview.peraga',
  simulasi: 'play.peta.preview.simulasi',
} as const;

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
      <path d="M8 18h8l10-8v28l-10-8H8z" fill="currentColor" />
      <path
        d="M32 16c3 3 3 13 0 16M36 11c6 6 6 20 0 26"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 48 48" width="30" height="30" aria-hidden className="peta-fact-icon">
      <path d="M24 5a14 14 0 0 0-8 25.5V36h16v-5.5A14 14 0 0 0 24 5z" />
      <path d="M18 41h12" />
    </svg>
  );
}

/**
 * Panel topik Peta Belajar (D-111): Momo membacakan pengantar topik, "Tahukah kamu?" dari tips topik, pratinjau
 * infografis/alat peraga/simulasi dari pelajaran yang sudah ada (dengan fotonya bila sudah tersedia), progres level,
 * lalu "Mulai belajar" ke halaman topik. Bagian yang datanya belum ada tidak ditampilkan (tanpa teks pengganti).
 * Foto tanpa teks kredit dan tanpa tautan keluar di area anak (D-095).
 */
export const PetaPanel = forwardRef<
  HTMLElement,
  {
    id: string;
    shelf: Shelf;
    info: NodeInfo;
    n: number;
    links: Links;
    access: Access;
    momoColor: Color;
  }
>(function PetaPanel({ id, shelf, info, n, links, access, momoColor }, ref) {
  const { category } = shelf;
  const lesson = category.lesson;
  // Kalimat Momo: pengantar topik dari katalog, atau layar pertama pelajaran yang ditulis manual.
  const first = lesson?.layar[0];
  const story = category.intro
    ? { text: category.intro, say: category.intro }
    : first
      ? { text: first.teks, say: first.suara }
      : undefined;
  // "Tahukah kamu?": hal penting topik (tips katalog), atau layar "ingat" pelajaran manual.
  const ingat = lesson?.layar.find((s) => s.jenis === 'ingat');
  const facts = category.tips?.length ? category.tips : ingat ? [ingat.teks] : [];
  const preview = lesson?.layar.find((s): s is LessonScreen & { jenis: PreviewKind } =>
    (PREVIEW_KINDS as readonly string[]).includes(s.jenis),
  );
  // Foto nyata (Pexels, D-095) dari pelajaran: foto infografis lebih dulu, lalu foto lain yang sudah tersedia.
  const photos = lesson
    ? [...(preview?.infografis?.foto ? [preview.infografis.foto] : []), ...lessonPhotos(lesson)]
    : [];
  const topicHref = links.topic(shelf.skills[0]!);
  const lessonHref = topicHref.replace('/play/topik/', '/play/belajar/');
  const locked = info.state === 'terkunci';

  return (
    <section
      ref={ref}
      id={id}
      className={`peta-panel is-${info.state}`}
      aria-label={t('play.peta.panel', { topic: category.title })}
    >
      <header className="peta-panel-head">
        <span className="peta-panel-num" aria-hidden>
          {n}
        </span>
        <h3>{category.title}</h3>
      </header>

      {story && (
        <div className="peta-story">
          <Momo own color={momoColor} mood="happy" size={76} />
          <div className="peta-bubble">
            <p>{story.text}</p>
            <button
              type="button"
              className="kid-btn secondary peta-listen"
              onClick={() => speak(story.say)}
            >
              <SpeakerIcon />
              {t('play.peta.listen')}
            </button>
          </div>
        </div>
      )}

      {facts.length > 0 && (
        <div className="peta-fact">
          <div className="peta-fact-head">
            <BulbIcon />
            <h4>{t('play.peta.fact')}</h4>
            <button
              type="button"
              className="peta-fact-say"
              aria-label={t('play.peta.factListen')}
              onClick={() => speak([t('play.peta.fact'), ...facts].join(' '))}
            >
              <SpeakerIcon />
            </button>
          </div>
          <ul>
            {facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {preview && (
        <Link className="peta-preview" to={lessonHref}>
          <FirstPhoto photos={photos} />
          <span className="peta-preview-text">
            <small>{t(PREVIEW_KEY[preview.jenis])}</small>
            <strong>{preview.infografis?.judul ?? preview.teks}</strong>
            {preview.infografis && <span>{preview.infografis.sub}</span>}
          </span>
          <span className="peta-preview-go">
            <PlayIcon size={24} />
            {t('play.peta.previewOpen')}
          </span>
        </Link>
      )}

      <div className="peta-progress">
        <Stars n={info.stars} />
        <span>
          {locked && !info.paidNext
            ? t('play.peta.lockedNote')
            : t('play.peta.levels', { passed: info.passed, total: info.total })}
        </span>
      </div>
      {info.paidNext && <PremiumNotice access={access} compact />}

      <Link className="kid-btn peta-start" to={topicHref}>
        <PlayIcon />
        {t('play.peta.start')}
      </Link>
    </section>
  );
});

/**
 * Foto pertama yang sudah tersedia di server dari daftar foto pelajaran (paling banyak 4 dicoba). Belum ada / offline →
 * tidak menampilkan apa pun (tanpa gambar pengganti). Tanpa teks kredit & tautan keluar di area anak (D-095).
 */
function FirstPhoto({ photos }: { photos: PeragaPhoto[] }) {
  const [found, setFound] = useState<{ url: string; label: string } | null>(null);
  const key = photos.map((p) => p.id).join('|');
  useEffect(() => {
    let alive = true;
    setFound(null);
    void (async () => {
      for (const p of photos.slice(0, 4)) {
        const url = await photoUrl(p.id);
        if (!alive) return;
        if (url) return setFound({ url, label: p.label });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!found) return null;
  return (
    <img
      className="peta-photo"
      src={found.url}
      alt={found.label}
      loading="lazy"
      onError={() => setFound(null)}
    />
  );
}
