import { useEffect, useState } from 'react';
import { BODY_PARTS, type BodyPart, type LessonSim, type SimActivity } from '@little-coder/engine';
import { VisualView } from '../components/visuals';
import { API_URL } from '../config/app';
import { t } from '../i18n';
import './sim.css';

/**
 * Simulasi interaktif bergambar foto realistis (D-088): (1) sentuh untuk menjelajah — ketuk bagian tubuh pada
 * foto anak atau kartu fotonya → disorot, dibacakan Momo, contoh benda nyata muncul; (2) kegiatan — pilih foto
 * kegiatan, ketuk semua bagian tubuh yang dipakai; kegiatan yang memakai > 1 bagian memunculkan momen "aha".
 * Tanpa nilai, tanpa kata "salah": bagian yang tidak dipakai hanya bergoyang pelan. Foto diambil dari AI Gambar
 * yang sudah disetujui admin; bila belum ada atau offline, gambar SVG yang ada dipakai sebagai cadangan.
 */

/** id foto per subjek AI Gambar (null = belum ada / gagal), dipakai bersama semua layar. */
const photoIds = new Map<string, Promise<string | null>>();
function photoUrl(subject: string): Promise<string | null> {
  let p = photoIds.get(subject);
  if (!p) {
    p = fetch(`${API_URL}/pictures/subject/${subject}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ id: string | null }>) : { id: null }))
      .then((d) => (d.id ? `${API_URL}/pictures/${d.id}` : null))
      .catch(() => null);
    photoIds.set(subject, p);
  }
  return p;
}

function usePhoto(subject: string | undefined) {
  const [url, setUrl] = useState<string | null>();
  useEffect(() => {
    let alive = true;
    if (!subject) {
      setUrl(null);
      return;
    }
    void photoUrl(subject).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [subject]);
  return url;
}

/** Foto realistis; selama belum tersedia, `fallback` (gambar SVG) yang tampil. */
function Photo({
  subject,
  alt,
  fallback,
  className,
  onShown,
}: {
  subject: string | undefined;
  alt: string;
  fallback: React.ReactNode;
  className?: string;
  /** Dipanggil saat foto asli tampil (true) atau gagal dimuat (false). */
  onShown?: (shown: boolean) => void;
}) {
  const url = usePhoto(subject);
  const [broken, setBroken] = useState(false);
  if (!url || broken) return <span className={`sim-fallback ${className ?? ''}`}>{fallback}</span>;
  return (
    <img
      className={`sim-photo ${className ?? ''}`}
      src={url}
      alt={alt}
      draggable={false}
      onLoad={() => onShown?.(true)}
      onError={() => {
        setBroken(true);
        onShown?.(false);
      }}
    />
  );
}

export type SimVoice = (key: string, text: string, onEnd?: () => void) => void;

type Phase = 'jelajah' | 'kegiatan' | 'selesai';

export function SimulationScreen({ sim, voice }: { sim: LessonSim; voice: SimVoice }) {
  const [phase, setPhase] = useState<Phase>('jelajah');
  const [active, setActive] = useState<BodyPart>();
  const [seen, setSeen] = useState<BodyPart[]>([]);
  const [doing, setDoing] = useState<SimActivity>();
  const [found, setFound] = useState<BodyPart[]>([]);
  const [nope, setNope] = useState<BodyPart>();
  const [done, setDone] = useState<string[]>([]);
  const [aha, setAha] = useState(false);
  // Titik sentuh disetel untuk foto asli; pada gambar cadangan (SVG) titiknya tidak pas, jadi disembunyikan.
  const [photoShown, setPhotoShown] = useState(false);
  const part = sim.bagian.find((b) => b.id === active);

  const explore = (id: BodyPart) => {
    const b = sim.bagian.find((x) => x.id === id)!;
    setActive(id);
    setSeen((x) => (x.includes(id) ? x : [...x, id]));
    voice(`b.${id}`, b.suara);
  };

  const pickActivity = (k: SimActivity) => {
    setDoing(k);
    setFound([]);
    setActive(undefined);
    voice(`k.${k.id}`, k.suara);
  };

  const tapInActivity = (id: BodyPart) => {
    if (!doing) return;
    if (!doing.bagian.includes(id)) {
      // Bukan bagian yang dipakai: hanya bergoyang pelan, tanpa kata "salah".
      setNope(id);
      window.setTimeout(() => setNope(undefined), 600);
      return;
    }
    if (found.includes(id)) return;
    const next = [...found, id];
    setFound(next);
    setActive(id);
    if (next.length < doing.bagian.length) {
      voice(`b.${id}`, sim.bagian.find((x) => x.id === id)!.suara);
      return;
    }
    const finished = [...done.filter((x) => x !== doing.id), doing.id];
    setDone(finished);
    const all = finished.length === sim.kegiatan.length;
    const firstAha = doing.bagian.length > 1 && !aha;
    if (firstAha) setAha(true);
    voice(`k.${doing.id}.ok`, doing.selesai, () => {
      if (firstAha) voice('aha', sim.aha, all ? () => finish() : undefined);
      else if (all) finish();
    });
  };

  const finish = () => {
    setPhase('selesai');
    voice('tutup', sim.tutup);
  };

  const startActivities = () => {
    setPhase('kegiatan');
    setActive(undefined);
    voice('sk', sim.kegiatanSuara);
  };

  const onPart = (id: BodyPart) => (phase === 'kegiatan' ? tapInActivity(id) : explore(id));
  const lit = (id: BodyPart) => (phase === 'kegiatan' ? found.includes(id) : active === id);

  return (
    <div className="sim">
      <div className="sim-stage">
        <div className="sim-figure">
          <Photo
            subject={sim.foto}
            alt={t('play.sim.figureAlt')}
            className="sim-figure-img"
            onShown={setPhotoShown}
            fallback={
              <VisualView visual={{ kind: 'body', ...(active && { part: active }) }} size={260} />
            }
          />
          {photoShown &&
            sim.bagian.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`sim-spot${lit(b.id) ? ' is-lit' : ''}${nope === b.id ? ' is-nope' : ''}${
                  phase === 'jelajah' && !seen.includes(b.id) ? ' is-new' : ''
                }`}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                aria-label={BODY_PARTS[b.id]}
                aria-pressed={lit(b.id)}
                onClick={() => onPart(b.id)}
              />
            ))}
        </div>

        <div className="sim-side">
          {phase === 'jelajah' && (
            <>
              <p className="sim-count" aria-live="polite">
                {seen.length === sim.bagian.length
                  ? t('play.sim.exploreDone')
                  : t('play.sim.exploreCount', { n: seen.length, of: sim.bagian.length })}
              </p>
              {part && (
                <div className="sim-card" key={part.id}>
                  <Photo
                    subject={part.contoh}
                    alt={part.teks}
                    className="sim-example"
                    fallback={
                      part.contohGambar ? (
                        <VisualView
                          visual={{ kind: 'object', object: part.contohGambar }}
                          size={96}
                        />
                      ) : (
                        <VisualView visual={{ kind: 'body', part: part.id }} size={96} />
                      )
                    }
                  />
                  <div>
                    <strong>{BODY_PARTS[part.id]}</strong>
                    <p>{part.teks}</p>
                  </div>
                </div>
              )}
              {seen.length === sim.bagian.length && (
                <button type="button" className="kid-btn" onClick={startActivities}>
                  {t('play.sim.toActivities')}
                </button>
              )}
            </>
          )}

          {phase === 'kegiatan' && (
            <>
              <p className="sim-count" aria-live="polite">
                {doing
                  ? t('play.sim.findParts', { n: found.length, of: doing.bagian.length })
                  : t('play.sim.pickActivity')}
              </p>
              <div className="sim-activities">
                {sim.kegiatan.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    className={`sim-activity${doing?.id === k.id ? ' is-on' : ''}${
                      done.includes(k.id) ? ' is-done' : ''
                    }`}
                    aria-label={k.teks}
                    aria-pressed={doing?.id === k.id}
                    onClick={() => pickActivity(k)}
                  >
                    <Photo
                      subject={k.foto}
                      alt={k.teks}
                      fallback={
                        k.gambar ? (
                          <VisualView visual={{ kind: 'object', object: k.gambar }} size={72} />
                        ) : (
                          <VisualView visual={{ kind: 'body' }} size={72} />
                        )
                      }
                    />
                    <span>{k.teks}</span>
                  </button>
                ))}
              </div>
              {aha && <p className="sim-aha">{t('play.sim.aha')}</p>}
            </>
          )}

          {phase === 'selesai' && (
            <div className="sim-done">
              <p className="sim-aha">{t('play.sim.done')}</p>
              <button
                type="button"
                className="kid-btn secondary"
                onClick={() => {
                  setPhase('jelajah');
                  setSeen([]);
                  setDone([]);
                  setDoing(undefined);
                  setFound([]);
                  setAha(false);
                  setActive(undefined);
                  voice('sj', sim.jelajahSuara);
                }}
              >
                {t('play.sim.again')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Kartu foto close-up: target sentuh besar yang selalu ada, juga saat fotonya belum tersedia. */}
      <div className="sim-parts" role="group" aria-label={t('play.sim.partsLabel')}>
        {sim.bagian.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`sim-part${lit(b.id) ? ' is-lit' : ''}${nope === b.id ? ' is-nope' : ''}${
              phase === 'jelajah' && seen.includes(b.id) ? ' is-seen' : ''
            }`}
            aria-label={BODY_PARTS[b.id]}
            aria-pressed={lit(b.id)}
            onClick={() => onPart(b.id)}
          >
            <Photo
              subject={b.foto}
              alt=""
              fallback={<VisualView visual={{ kind: 'body', part: b.id }} size={64} />}
            />
            <span>{BODY_PARTS[b.id]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
