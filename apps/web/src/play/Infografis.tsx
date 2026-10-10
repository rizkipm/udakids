import { useEffect, useState } from 'react';
import type { Infografis } from '@little-coder/engine';
import { speak, stopSpeaking } from '../audio/speech';
import { VisualView } from '../components/visuals';
import { t } from '../i18n';
import { PeragaPicture } from './peraga/photo';
import './infografis.css';

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="var(--sawah)" />
      <path
        d="M6.5 12.5l3.5 3.5 7.5-8"
        fill="none"
        stroke="var(--on-sawah)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Ikon "hati-hati" (bukan silang merah, PRD A14): lingkaran kuning dengan tanda seru. */
function Careful() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="var(--kunyit)" />
      <path d="M12 6.5v7" stroke="var(--on-kunyit)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="1.5" fill="var(--on-kunyit)" />
    </svg>
  );
}

/**
 * Poster infografis pelajaran (D-101): judul besar + gambar utama, poin bernomor yang diketuk untuk didengar,
 * lencana, panel rumus, panel perbandingan, tips, dan kalimat penutup. Foto Pexels bila ada; selama belum ada
 * (atau offline) gambar SVG yang tampil.
 */
export function InfografisScreen({ data: g }: { data: Infografis }) {
  const [on, setOn] = useState<string>();
  useEffect(() => () => stopSpeaking(), []);
  const say = (key: string, text: string) => {
    setOn(key);
    speak(text, { onEnd: () => setOn((k) => (k === key ? undefined : k)) });
  };
  const hero = g.visual ? <VisualView visual={g.visual} size={190} /> : null;
  return (
    <div className="info">
      <header className="info-head">
        <div className="info-title">
          <h2>{g.judul}</h2>
          <p>{g.sub}</p>
        </div>
        {(g.foto || hero) && (
          <div className="info-hero">
            {g.foto ? <PeragaPicture foto={g.foto} alt={g.foto.label} fallback={hero} /> : hero}
          </div>
        )}
      </header>

      <ol className="info-points">
        {g.poin.map((p, k) => {
          const key = `p${k}`;
          const pic = p.visual ? <VisualView visual={p.visual} size={96} /> : null;
          return (
            <li key={key}>
              <button
                type="button"
                className={`info-point${on === key ? ' is-on' : ''}`}
                onClick={() => say(key, p.suara ?? `${p.judul}. ${p.teks}`)}
              >
                <span className="info-num" aria-hidden>
                  {k + 1}
                </span>
                <span className="info-point-text">
                  <strong>{p.judul}</strong>
                  <span>{p.teks}</span>
                </span>
                {(p.foto || pic) && (
                  <span className="info-point-pic" aria-hidden>
                    {p.foto ? (
                      <PeragaPicture foto={p.foto} alt={p.foto.label} fallback={pic} />
                    ) : (
                      pic
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {g.lencana && (
        <ul className="info-badges" aria-label={t('play.info.badges')}>
          {g.lencana.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {(g.rumus || g.banding) && (
        <div className="info-panels">
          {g.rumus && (
            <section className="info-panel">
              <h3>{g.rumus.judul}</h3>
              <button
                type="button"
                className={`info-formula${on === 'r' ? ' is-on' : ''}`}
                onClick={() => say('r', g.rumus!.suara ?? g.rumus!.baris.join('. '))}
              >
                {g.rumus.baris.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </button>
              {g.rumus.visual && (
                <div className="info-panel-pic">
                  <VisualView visual={g.rumus.visual} size={150} />
                </div>
              )}
            </section>
          )}
          {g.banding && (
            <section className="info-panel">
              <h3>{g.banding.judul}</h3>
              <button
                type="button"
                className={`info-compare${on === 'b' ? ' is-on' : ''}`}
                onClick={() =>
                  say(
                    'b',
                    `${g.banding!.kiri.label} ${g.banding!.kiri.nilai}. ${g.banding!.kanan.label} ${g.banding!.kanan.nilai}. ${g.banding!.catatan}`,
                  )
                }
              >
                {[g.banding.kiri, g.banding.kanan].map((side, k) => (
                  <span key={k} className="info-side" style={{ order: k * 2 }}>
                    <small>{side.label}</small>
                    {(side.foto || side.visual) && (
                      <span className="info-side-pic" aria-hidden>
                        {side.foto ? (
                          <PeragaPicture
                            foto={side.foto}
                            alt={side.foto.label}
                            fallback={
                              side.visual ? <VisualView visual={side.visual} size={80} /> : null
                            }
                          />
                        ) : (
                          <VisualView visual={side.visual!} size={80} />
                        )}
                      </span>
                    )}
                    <strong>{side.nilai}</strong>
                  </span>
                ))}
                <span className="info-sign" style={{ order: 1 }} aria-hidden>
                  {g.banding.tanda}
                </span>
              </button>
              <p className="info-note">{g.banding.catatan}</p>
            </section>
          )}
        </div>
      )}

      {g.tips && (
        <section className="info-panel">
          <h3>{t('play.info.tips')}</h3>
          <ul className="info-tips">
            {g.tips.map((tip, k) => (
              <li key={k}>
                <button
                  type="button"
                  className={`info-tip${tip.tepat ? ' is-good' : ' is-careful'}${on === `x${k}` ? ' is-on' : ''}`}
                  onClick={() =>
                    say(
                      `x${k}`,
                      `${t(tip.tepat ? 'play.info.good' : 'play.info.careful')}: ${tip.teks}`,
                    )
                  }
                >
                  {tip.tepat ? <Check /> : <Careful />}
                  <span className="lesson-sr">
                    {t(tip.tepat ? 'play.info.good' : 'play.info.careful')}:
                  </span>
                  <span>{tip.teks}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {g.kutipan && (
        <button
          type="button"
          className={`info-quote${on === 'q' ? ' is-on' : ''}`}
          onClick={() => say('q', g.kutipan!)}
        >
          {g.kutipan}
        </button>
      )}
    </div>
  );
}
