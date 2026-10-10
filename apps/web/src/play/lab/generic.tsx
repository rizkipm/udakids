import { useEffect, useMemo, useState } from 'react';
import type { LabExperiment } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { t } from '../../i18n';
import { TraceBoard } from '../games/TraceBoard';
import { DoneNote, useLater, useShake } from './ui';
import { LabPicView } from './pic';

/**
 * Eksperimen umum untuk semua mapel (D-109): pilah ke 2–4 kotak, susun urutan, pasangkan kiri ↔ kanan.
 * Tidak dinilai; pilihan yang belum tepat hanya bergoyang dan diberi petunjuk lembut.
 */
type Generic = Extract<
  LabExperiment,
  { jenis: 'pilah' | 'urut' | 'pasang' | 'pola' | 'dengar-pilih' | 'tebal' | 'geser' }
>;
const GENERIC = new Set<string>([
  'pilah',
  'urut',
  'pasang',
  'pola',
  'dengar-pilih',
  'tebal',
  'geser',
]);
export const isGeneric = (e: LabExperiment): e is Generic => GENERIC.has(e.jenis);

export function GenericExperiment({ e, onDone }: { e: Generic; onDone: () => void }) {
  switch (e.jenis) {
    case 'pilah':
      return <Pilah e={e} onDone={onDone} />;
    case 'urut':
      return <Urut e={e} onDone={onDone} />;
    case 'pasang':
      return <Pasang e={e} onDone={onDone} />;
    case 'pola':
      return <Pola e={e} onDone={onDone} />;
    case 'dengar-pilih':
      return <DengarPilih e={e} onDone={onDone} />;
    case 'tebal':
      return <Tebal e={e} onDone={onDone} />;
    case 'geser':
      return <Geser e={e} onDone={onDone} />;
  }
}

/** Urutan tampil tetap tapi teracak (diputar), supaya jawaban tidak langsung terlihat. */
function shuffled(n: number): number[] {
  const out = Array.from({ length: n }, (_, i) => (i * 3 + 1) % n);
  return new Set(out).size === n ? out : Array.from({ length: n }, (_, i) => n - 1 - i);
}

function Pilah({ e, onDone }: { e: Extract<Generic, { jenis: 'pilah' }>; onDone: () => void }) {
  const order = useMemo(() => shuffled(e.benda.length), [e.benda.length]);
  const [sel, setSel] = useState<number>();
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const s = useShake();
  const pick = (k: number) => {
    if (k in placed) return;
    setSel(k);
    speak(e.benda[k]!.nama);
  };
  const put = (box: number) => {
    if (sel === undefined) {
      speak(t('play.lab.pickFirst'));
      return;
    }
    const b = e.benda[sel]!;
    if (b.kotak === box) {
      const next = { ...placed, [sel]: box };
      setPlaced(next);
      setSel(undefined);
      const done = Object.keys(next).length === e.benda.length;
      speak(done ? `${b.suara} ${e.selesai}` : b.suara);
      if (done) onDone();
    } else {
      s.shake(`b${box}`);
      speak(t('play.lab.thinkAgain', { name: b.nama }));
    }
  };
  const done = Object.keys(placed).length === e.benda.length;
  return (
    <div className="lab-sort">
      <div className="lab-sort-pool" role="group" aria-label={t('play.lab.itemsLabel')}>
        {order.map((k) => {
          const b = e.benda[k]!;
          return k in placed ? (
            <span key={k} className="lab-sort-item is-gone" aria-hidden />
          ) : (
            <button
              key={k}
              type="button"
              className={`lab-sort-item${sel === k ? ' is-on' : ''}`}
              onClick={() => pick(k)}
            >
              <LabPicView pic={b.gambar} size={64} alt={b.nama} />
              <span>{b.nama}</span>
            </button>
          );
        })}
      </div>
      <div className={`lab-sort-boxes is-${e.kotak.length}`}>
        {e.kotak.map((box, i) => (
          <button
            key={s.key(`b${i}`)}
            type="button"
            className={`lab-sort-box${s.on(`b${i}`) ? ' is-shake' : ''}${sel !== undefined ? ' is-ready' : ''}`}
            onClick={() => put(i)}
          >
            <span className="lab-sort-head">
              {box.gambar && <LabPicView pic={box.gambar} size={44} alt={box.label} />}
              <strong>{box.label}</strong>
            </span>
            <span className="lab-bin-items">
              {Object.entries(placed)
                .filter(([, v]) => v === i)
                .map(([k]) => (
                  <LabPicView
                    key={k}
                    pic={e.benda[Number(k)]!.gambar}
                    size={34}
                    alt={e.benda[Number(k)]!.nama}
                  />
                ))}
            </span>
          </button>
        ))}
      </div>
      {done ? (
        <DoneNote text={e.selesai} />
      ) : (
        <p className="lab-hint">
          {sel === undefined ? t('play.lab.sortPick') : t('play.lab.sortPut')}
        </p>
      )}
    </div>
  );
}

function Urut({ e, onDone }: { e: Extract<Generic, { jenis: 'urut' }>; onDone: () => void }) {
  const order = useMemo(() => shuffled(e.langkah.length), [e.langkah.length]);
  const [got, setGot] = useState<number[]>([]);
  const s = useShake();
  const done = got.length === e.langkah.length;
  const tap = (k: number) => {
    if (done || got.includes(k)) return;
    if (k === got.length) {
      const next = [...got, k];
      setGot(next);
      const all = next.length === e.langkah.length;
      speak(all ? `${e.langkah[k]!.suara} ${e.selesai}` : e.langkah[k]!.suara);
      if (all) onDone();
    } else {
      s.shake(String(k));
      speak(t('play.lab.orderWhich', { n: got.length + 1 }));
    }
  };
  return (
    <div className="lab-order">
      <ol className="lab-order-track" aria-label={t('play.lab.orderTrack')}>
        {e.langkah.map((l, k) => (
          <li key={k} className={got[k] !== undefined ? 'is-on' : undefined}>
            <span className="lab-order-no">{k + 1}</span>
            {got[k] !== undefined ? (
              <LabPicView pic={e.langkah[got[k]!]!.gambar} size={70} alt={l.nama} />
            ) : (
              <span className="lab-order-empty" aria-hidden />
            )}
            {k < e.langkah.length - 1 && <i className="lab-order-arrow" aria-hidden />}
          </li>
        ))}
      </ol>
      <div className="lab-choices">
        {order.map((k) => {
          const l = e.langkah[k]!;
          return got.includes(k) ? (
            <span key={k} className="lab-sort-item is-gone" aria-hidden />
          ) : (
            <button
              key={s.key(String(k))}
              type="button"
              className={`lab-sort-item${s.on(String(k)) ? ' is-shake' : ''}`}
              onClick={() => tap(k)}
            >
              <LabPicView pic={l.gambar} size={70} alt={l.nama} />
              <span>{l.nama}</span>
            </button>
          );
        })}
      </div>
      {done && <DoneNote text={e.selesai} />}
    </div>
  );
}

function Pasang({ e, onDone }: { e: Extract<Generic, { jenis: 'pasang' }>; onDone: () => void }) {
  const right = useMemo(() => shuffled(e.pasangan.length), [e.pasangan.length]);
  const [sel, setSel] = useState<number>();
  const [done, setDone] = useState<number[]>([]);
  const s = useShake();
  const pickLeft = (k: number) => {
    if (done.includes(k)) return;
    setSel(k);
    speak(e.pasangan[k]!.kiri.nama);
  };
  const pickRight = (k: number) => {
    if (done.includes(k)) return;
    if (sel === undefined) {
      speak(t('play.lab.pickLeftFirst'));
      return;
    }
    if (k === sel) {
      const next = [...done, k];
      setDone(next);
      setSel(undefined);
      speak(e.pasangan[k]!.suara);
      if (next.length === e.pasangan.length) onDone();
    } else {
      s.shake(`r${k}`);
      speak(t('play.lab.matchAgain', { name: e.pasangan[sel]!.kiri.nama }));
    }
  };
  return (
    <div className="lab-match">
      <div className="lab-match-cols">
        <div className="lab-match-col">
          {e.pasangan.map((p, k) => (
            <button
              key={k}
              type="button"
              className={`lab-match-card${sel === k ? ' is-on' : ''}${done.includes(k) ? ' is-done' : ''}`}
              onClick={() => pickLeft(k)}
            >
              {p.kiri.gambar && <LabPicView pic={p.kiri.gambar} size={56} alt={p.kiri.nama} />}
              <span>{p.kiri.nama}</span>
              {done.includes(k) && <b className="lab-match-no">{k + 1}</b>}
            </button>
          ))}
        </div>
        <div className="lab-match-col">
          {right.map((k) => {
            const p = e.pasangan[k]!;
            return (
              <button
                key={s.key(`r${k}`)}
                type="button"
                className={`lab-match-card${s.on(`r${k}`) ? ' is-shake' : ''}${done.includes(k) ? ' is-done' : ''}`}
                onClick={() => pickRight(k)}
              >
                {p.kanan.gambar && <LabPicView pic={p.kanan.gambar} size={56} alt={p.kanan.nama} />}
                <span>{p.kanan.nama}</span>
                {done.includes(k) && <b className="lab-match-no">{k + 1}</b>}
              </button>
            );
          })}
        </div>
      </div>
      {done.length === e.pasangan.length ? (
        <DoneNote text={t('play.lab.matchDone')} />
      ) : (
        <p className="lab-hint">
          {sel === undefined ? t('play.lab.matchStart') : t('play.lab.matchPick')}
        </p>
      )}
    </div>
  );
}

function Rounds({ n, at }: { n: number; at: number }) {
  return (
    <div className="lab-rounds">
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className={k < at ? 'is-done' : k === at ? 'is-now' : undefined} />
      ))}
    </div>
  );
}

/** Lanjutkan pola: kotak terakhir kosong, pilih gambar yang tepat. */
function Pola({ e, onDone }: { e: Extract<Generic, { jenis: 'pola' }>; onDone: () => void }) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = e.ronde[r];
  if (!round)
    return (
      <div className="lab-finish">
        <DoneNote text={t('play.lab.patternDone')} />
        <button type="button" className="kid-btn secondary" onClick={() => setR(0)}>
          {t('play.lab.again')}
        </button>
      </div>
    );
  const pick = (k: number) => {
    if (right) return;
    const p = round.pilihan[k]!;
    if (k === round.jawaban) {
      setRight(true);
      speak(
        `${round.deret.map((x) => x.nama).join(', ')}, ${p.nama}. ${t('play.lab.patternRight')}`,
      );
      later(() => {
        setRight(false);
        if (r + 1 === e.ronde.length) onDone();
        setR(r + 1);
      }, 2200);
    } else {
      s.shake(String(k));
      speak(t('play.lab.patternAgain'));
    }
  };
  const answer = round.pilihan[round.jawaban]!;
  return (
    <div className="lab-pattern">
      <Rounds n={e.ronde.length} at={r} />
      <div className="lab-pattern-row" key={r}>
        {round.deret.map((x, k) => (
          <span key={k} className="lab-pattern-cell">
            <LabPicView pic={x.gambar} size={56} alt={x.nama} />
          </span>
        ))}
        <span className={`lab-pattern-cell is-blank${right ? ' is-right' : ''}`}>
          {right ? <LabPicView pic={answer.gambar} size={56} alt={answer.nama} /> : '?'}
        </span>
      </div>
      <div className="lab-choices">
        {round.pilihan.map((p, k) => (
          <button
            key={s.key(String(k))}
            type="button"
            className={`lab-choice${s.on(String(k)) ? ' is-shake' : ''}${right && k === round.jawaban ? ' is-right' : ''}`}
            aria-label={p.nama}
            onClick={() => pick(k)}
          >
            <LabPicView pic={p.gambar} size={80} alt={p.nama} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Dengar kata, lalu ketuk gambarnya. */
function DengarPilih({
  e,
  onDone,
}: {
  e: Extract<Generic, { jenis: 'dengar-pilih' }>;
  onDone: () => void;
}) {
  const [r, setR] = useState(0);
  const [right, setRight] = useState(false);
  const s = useShake();
  const later = useLater();
  const round = e.ronde[r];
  useEffect(() => {
    if (round) speak(round.kata);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r]);
  if (!round)
    return (
      <div className="lab-finish">
        <DoneNote text={t('play.lab.listenDone')} />
        <button type="button" className="kid-btn secondary" onClick={() => setR(0)}>
          {t('play.lab.again')}
        </button>
      </div>
    );
  const pick = (k: number) => {
    if (right) return;
    if (k === round.jawaban) {
      setRight(true);
      speak(`${round.kata}. ${t('play.lab.listenRight')}`);
      later(() => {
        setRight(false);
        if (r + 1 === e.ronde.length) onDone();
        setR(r + 1);
      }, 1800);
    } else {
      s.shake(String(k));
      speak(round.kata);
    }
  };
  return (
    <div className="lab-guess">
      <Rounds n={e.ronde.length} at={r} />
      <button
        type="button"
        className="kid-btn big-play lab-play-sound"
        onClick={() => speak(round.kata)}
      >
        {t('play.lab.listenWord')}
      </button>
      <div className="lab-choices">
        {round.pilihan.map((p, k) => (
          <button
            key={s.key(String(k))}
            type="button"
            className={`lab-choice${s.on(String(k)) ? ' is-shake' : ''}${right && k === round.jawaban ? ' is-right' : ''}`}
            aria-label={p.nama}
            onClick={() => pick(k)}
          >
            <LabPicView pic={p.gambar} size={90} alt={p.nama} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tebalkan angka/huruf/garis satu per satu (papan yang sama dengan latihan menebalkan). */
function Tebal({ e, onDone }: { e: Extract<Generic, { jenis: 'tebal' }>; onDone: () => void }) {
  const [k, setK] = useState(0);
  const [finished, setFinished] = useState(false);
  const glyph = e.garis[k]!;
  return (
    <div className="lab-trace">
      <Rounds n={e.garis.length} at={finished ? e.garis.length : k} />
      <TraceBoard
        key={`${k}-${glyph}`}
        glyph={glyph}
        tolerance={20}
        size={260}
        onDone={() => {
          if (k + 1 < e.garis.length) window.setTimeout(() => setK(k + 1), 1100);
          else {
            setFinished(true);
            onDone();
          }
        }}
      />
      {finished && <DoneNote text={t('play.lab.traceDone')} />}
    </div>
  );
}

/** Simulasi sebab-akibat bertahap: ketuk tahap (atau panah) untuk melihat perubahannya. */
function Geser({ e, onDone }: { e: Extract<Generic, { jenis: 'geser' }>; onDone: () => void }) {
  const [k, setK] = useState(0);
  const [seen, setSeen] = useState<number[]>([0]);
  const go = (j: number) => {
    const at = Math.max(0, Math.min(e.tahap.length - 1, j));
    setK(at);
    speak(e.tahap[at]!.suara);
    if (!seen.includes(at)) {
      const next = [...seen, at];
      setSeen(next);
      if (next.length === e.tahap.length) window.setTimeout(() => (speak(e.selesai), onDone()), 0);
    }
  };
  const st = e.tahap[k]!;
  return (
    <div className="lab-slide">
      <div className="lab-slide-stage" key={k}>
        <LabPicView pic={st.gambar} size={170} alt={st.label} />
        <strong>{st.label}</strong>
      </div>
      <div className="lab-slide-track" role="group" aria-label={e.label}>
        <small>{e.label}</small>
        <div className="lab-slide-steps">
          {e.tahap.map((x, j) => (
            <button
              key={j}
              type="button"
              className={`lab-slide-step${j === k ? ' is-on' : ''}${seen.includes(j) ? ' is-seen' : ''}`}
              onClick={() => go(j)}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="lab-pager">
        <button
          type="button"
          className="kid-btn secondary"
          disabled={k === 0}
          onClick={() => go(k - 1)}
        >
          {t('play.lesson.back')}
        </button>
        <button
          type="button"
          className="kid-btn"
          disabled={k === e.tahap.length - 1}
          onClick={() => go(k + 1)}
        >
          {t('play.lesson.next')}
        </button>
      </div>
    </div>
  );
}
