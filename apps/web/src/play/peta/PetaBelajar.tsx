import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { isMockSkill, type Access, type Color, type PlayStatus } from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { Momo } from '../../components/Momo';
import { t } from '../../i18n';
import { RebungBand } from '../../site/AboutName';
import type { Shelf } from '../catalog';
import { SpeakButton } from '../ItemPlayer';
import { LockIcon, TrophyIcon } from '../icons';
import type { Links } from '../links';
import { PetaPanel } from './PetaPanel';
import './peta.css';

/**
 * Peta Belajar (D-111, D-114): pengganti kisi topik di beranda anak. Setiap bab (= `group` katalog, atau seluruh buku
 * bila tanpa group) adalah jalur ular (baris bolak-balik, 3–5 simpul per baris) supaya buku 40-an topik tidak perlu
 * digulir panjang. Semua isi dari data yang sudah ada — katalog (judul, intro, tips, pelajaran), level per topik, dan
 * progres anak (`levelStatuses` + `withAccess`). Tidak ada materi yang dikarang di sini.
 */

/** Tinggi satu baris peta (px): tanda + cincin 76 px + bintang + nama topik (maks 2 baris). */
export const ROW = 166;
/** Lebar minimum satu sel simpul (px); menentukan jumlah kolom 3–5. */
const CELL = 120;

/** Jumlah kolom dari lebar peta: minimal 3 (HP), maksimal 5. */
export const columnsFor = (width: number) =>
  Math.max(3, Math.min(5, Math.floor((width - 36) / CELL)));

/**
 * Letak simpul ke-i pada jalur ular: baris genap kiri → kanan, baris ganjil kanan → kiri, sehingga simpul terakhir
 * sebuah baris tepat di atas simpul pertama baris berikutnya.
 */
export function snake(i: number, cols: number) {
  const row = Math.floor(i / cols);
  const pos = i % cols;
  return { row, col: row % 2 === 0 ? pos : cols - 1 - pos };
}

export type NodeState = 'lulus' | 'sekarang' | 'terbuka' | 'terkunci';
/** Tanda tambahan simpul: topik berikutnya setelah "sekarang", atau topik terbuka lain yang boleh dilompati. */
export type NodeMark = 'berikutnya' | 'lompat';

export type NodeInfo = {
  state: NodeState;
  passed: number;
  total: number;
  /** 0–3, dari bagian level yang lulus. */
  stars: number;
  /** Level berikutnya berbayar (D-036): panel memberi tahu dengan lembut, tanpa harga. */
  paidNext: boolean;
  mark?: NodeMark;
};

/** Keadaan simpul dari progres yang sudah ada (sama dengan logika kartu topik lama). */
export function nodeInfo(
  shelf: Shelf,
  statuses: Readonly<Record<string, PlayStatus>>,
  isNext: boolean,
): NodeInfo {
  const total = shelf.skills.length;
  const st = shelf.skills.map((k) => statuses[k.id] ?? 'locked');
  const passed = st.filter((s) => s === 'passed').length;
  const done = total > 0 && passed === total;
  const closed = st.every((s) => s === 'locked' || s === 'paid');
  const stars = done ? 3 : total > 0 ? Math.min(2, Math.floor((passed / total) * 3)) : 0;
  const state: NodeState = done ? 'lulus' : closed ? 'terkunci' : isNext ? 'sekarang' : 'terbuka';
  return {
    state,
    passed,
    total,
    stars,
    paidNext: !st.includes('open') && st.includes('paid'),
  };
}

/**
 * Tanda "berikutnya" untuk topik terbuka pertama sesudah topik "sekarang" (urutan peta), dan "boleh lompat" untuk
 * topik terbuka lainnya — anak boleh memilih topik terbuka mana saja.
 */
export function markNodes(order: NodeInfo[]): void {
  const now = order.findIndex((n) => n.state === 'sekarang');
  let nextGiven = false;
  order.forEach((n, i) => {
    if (n.state !== 'terbuka') return;
    if (now >= 0 && i > now && !nextGiven) {
      n.mark = 'berikutnya';
      nextGiven = true;
    } else n.mark = 'lompat';
  });
}

/** Materi mock test: tanda katalog `mock` (D-076) atau level ber-family `mock` (D-072). */
export const isMockShelf = (s: Shelf) => s.category.mock === true || s.skills.some(isMockSkill);
const isGameSection = (group?: string) => !!group && /^Game · /.test(group);

/**
 * Bab di dalam buku (D-069): materi tanpa `group` lebih dulu, lalu tiap `group`. Di dalam bab lomba, topik kisi-kisi
 * dulu lalu mock test. Bab "Game · …" selalu di akhir (D-078).
 */
export function babsOf(shelves: Shelf[]): { group?: string; shelves: Shelf[] }[] {
  const out: { group?: string; shelves: Shelf[] }[] = [];
  const plain = shelves.filter((s) => !s.category.group);
  if (plain.length > 0) out.push({ shelves: plain });
  for (const s of shelves) {
    const g = s.category.group;
    if (!g) continue;
    const sec = out.find((x) => x.group === g);
    if (sec) sec.shelves.push(s);
    else out.push({ group: g, shelves: [s] });
  }
  for (const b of out)
    if (b.group)
      b.shelves = [...b.shelves.filter((s) => !isMockShelf(s)), ...b.shelves.filter(isMockShelf)];
  return [
    ...out.filter((x) => !isGameSection(x.group)),
    ...out.filter((x) => isGameSection(x.group)),
  ];
}

const OLYMPIAD_GROUP = /^(KMSI|EMC|EEC|ESC|OSN)\b/;

/** Warna mapel (data-mapel, uk-tokens.css) untuk buku: olimpiade, lalu per domain. */
export function mapelOf(book: { domain: string; grade: string }): string {
  if (book.grade === 'tkosn' || /^(sd|smp)\d\d$/.test(book.grade)) return 'olimpiade';
  switch (book.domain) {
    case 'math':
      return 'matematika';
    case 'english':
      return 'english';
    case 'sains':
      return 'sains';
    default:
      // Worksheet (baca tulis & berhitung PAUD) memakai warna Bahasa Indonesia.
      return 'bindo';
  }
}

/** Bab lomba (KMSI, EMC, OSN, …) di dalam buku biasa ikut berwarna olimpiade. */
const babMapel = (group?: string) =>
  group && OLYMPIAD_GROUP.test(group) ? 'olimpiade' : undefined;

/** Panel di kanan bila layar ≥ 861 px; di HP panel tampil di bawah baris simpul yang diketuk. */
function useWide() {
  const query = '(min-width: 861px)';
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}

/** Jumlah kolom jalur mengikuti lebar wadah peta (bukan lebar layar: di layar lebar ada panel di kanan). */
function useColumns() {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      if (e && e.contentRect.width > 0) setCols(columnsFor(e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, cols] as const;
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function PetaBelajar({
  book,
  shelves,
  statuses,
  nextCode,
  links,
  access,
  momoColor,
}: {
  book: { domain: string; grade: string; title: string };
  shelves: Shelf[];
  statuses: Readonly<Record<string, PlayStatus>>;
  /** Kode topik yang disarankan (level terbuka pertama, `firstOpen`). */
  nextCode?: string;
  links: Links;
  access: Access;
  momoColor: Color;
}) {
  const wide = useWide();
  const [babsRef, cols] = useColumns();
  const babs = babsOf(shelves);
  const infos = new Map(
    shelves.map((s) => [s.category.code, nodeInfo(s, statuses, s.category.code === nextCode)]),
  );
  markNodes(babs.flatMap((b) => b.shelves.map((s) => infos.get(s.category.code)!)));
  const doneCount = shelves.filter((s) => infos.get(s.category.code)?.state === 'lulus').length;
  const allDone = shelves.length > 0 && doneCount === shelves.length;

  // Panel awal: topik yang disarankan, atau topik pertama yang belum lulus.
  const fallback =
    nextCode ??
    shelves.find((s) => infos.get(s.category.code)?.state !== 'lulus')?.category.code ??
    shelves[0]?.category.code;
  const [chosen, setChosen] = useState<string>();
  // Bab yang sudah selesai semua dilipat; anak bisa membukanya lagi.
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const bookId = `${book.domain}/${book.grade}`;
  useEffect(() => {
    setChosen(undefined);
    setOpened(new Set());
  }, [bookId]);
  const selected = shelves.find((s) => s.category.code === (chosen ?? fallback));
  const panelRef = useRef<HTMLElement>(null);
  const [scrollTo, setScrollTo] = useState(0);
  useEffect(() => {
    if (!scrollTo || wide) return;
    panelRef.current?.scrollIntoView?.({
      behavior: reducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [scrollTo, wide]);

  const choose = (s: Shelf) => {
    speak(s.category.title);
    setChosen(s.category.code);
    setScrollTo((n) => n + 1);
  };
  const toggleBab = (key: string) =>
    setOpened((o) => {
      const n = new Set(o);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const panel = selected && (
    <PetaPanel
      ref={panelRef}
      id="peta-panel"
      shelf={selected}
      info={infos.get(selected.category.code)!}
      n={numberIn(babs, selected)}
      links={links}
      access={access}
      momoColor={momoColor}
    />
  );

  return (
    <div className={`peta${wide ? ' is-wide' : ''}`}>
      <div className="peta-babs" ref={babsRef}>
        {allDone ? (
          <AllDone momoColor={momoColor} title={book.title} />
        ) : (
          <Summary done={doneCount} total={shelves.length} />
        )}
        {babs.map((bab) => {
          const key = bab.group ?? '';
          const babInfos = bab.shelves.map((s) => infos.get(s.category.code)!);
          const babDone = babInfos.filter((n) => n.state === 'lulus').length;
          const complete = babDone === bab.shelves.length;
          const folded = complete && !opened.has(key);
          const title = bab.group ? groupTitle(bab.group) : book.title;
          // Di HP panel menjadi baris selebar jalur, tepat di bawah baris simpul yang dipilih.
          const selIndex = selected ? bab.shelves.indexOf(selected) : -1;
          const panelRow = !wide && !folded && selIndex >= 0 ? snake(selIndex, cols).row : -1;
          return (
            <section
              key={key}
              className={`peta-bab${complete ? ' is-complete' : ''}`}
              data-mapel={babMapel(bab.group)}
              aria-label={title}
            >
              <header className={`peta-bab-head${bab.group ? ' is-group' : ''}`}>
                {bab.group ? (
                  <BabTitle group={bab.group} shelves={bab.shelves} />
                ) : (
                  <span className="peta-bab-text">
                    <strong>{book.title}</strong>
                  </span>
                )}
                <BabProgress done={babDone} total={bab.shelves.length} />
                <SpeakButton
                  text={
                    complete
                      ? `${title}. ${t('play.peta.babDoneSay')}`
                      : bab.group
                        ? groupSay(bab.group, bab.shelves)
                        : title
                  }
                />
              </header>
              {complete && (
                <div className="peta-bab-done">
                  <span className="peta-bab-done-text">
                    <CheckMark size={26} />
                    {t('play.peta.babDone')}
                  </span>
                  <button
                    type="button"
                    className="peta-fold"
                    aria-expanded={!folded}
                    onClick={() => toggleBab(key)}
                  >
                    {folded ? t('play.peta.babShow') : t('play.peta.babHide')}
                  </button>
                </div>
              )}
              {!folded && (
                <ol className="peta-path" style={{ '--cols': cols } as CSSProperties}>
                  {bab.shelves.map((s, i) => {
                    const info = babInfos[i]!;
                    const { row, col } = snake(i, cols);
                    const last = i === bab.shelves.length - 1;
                    const nextRow = last ? row : snake(i + 1, cols).row;
                    // Garis ke simpul berikutnya: mendatar di baris yang sama, turun di ujung baris (kecuali panel
                    // terbuka di antara dua baris itu).
                    const link = last
                      ? ''
                      : nextRow !== row
                        ? row === panelRow
                          ? ''
                          : ' to-down'
                        : row % 2 === 0
                          ? ' to-right'
                          : ' to-left';
                    const style = {
                      gridRow: row + 1 + (panelRow >= 0 && row > panelRow ? 1 : 0),
                      gridColumn: col + 1,
                    } as CSSProperties;
                    return (
                      <li
                        key={s.category.code}
                        className={`peta-row${link}${info.state === 'lulus' ? ' is-link-done' : ''}`}
                        style={style}
                      >
                        <Node
                          shelf={s}
                          n={i + 1}
                          info={info}
                          mock={isMockShelf(s)}
                          selected={s === selected}
                          momoColor={momoColor}
                          onChoose={() => choose(s)}
                        />
                      </li>
                    );
                  })}
                  {panelRow >= 0 && (
                    <li className="peta-panel-row" style={{ gridRow: panelRow + 2 }}>
                      {panel}
                    </li>
                  )}
                </ol>
              )}
            </section>
          );
        })}
      </div>
      {wide && panel && <div className="peta-side">{panel}</div>}
    </div>
  );
}

/** Nomor topik di dalam babnya (sama dengan nomor pada simpul). */
function numberIn(babs: { shelves: Shelf[] }[], shelf: Shelf) {
  for (const b of babs) {
    const i = b.shelves.indexOf(shelf);
    if (i >= 0) return i + 1;
  }
  return 1;
}

/** Ringkasan progres buku (berapa topik lulus + bilah sawah) dan keterangan tanda peta dalam satu kartu. */
function Summary({ done, total }: { done: number; total: number }) {
  const text = t('play.peta.summary', { done, total });
  return (
    <div className="peta-summary">
      <div className="peta-summary-row">
        <span className="peta-summary-text">
          <strong>{text}</strong>
          <span className="peta-bar" aria-hidden>
            <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </span>
        </span>
        <SpeakButton text={text} />
      </div>
      <Legend />
    </div>
  );
}

/** Semua topik di buku ini lulus: perayaan dengan Momo bangga (pujian untuk usaha, D-111/D-114). */
function AllDone({ momoColor, title }: { momoColor: Color; title: string }) {
  const say = `${t('play.peta.allDone')} ${t('play.peta.allDoneBody', { book: title })}`;
  return (
    <div className="peta-alldone" role="status">
      <RebungBand />
      <div className="peta-alldone-body">
        <Momo own color={momoColor} mood="proud" size={88} />
        <span className="peta-alldone-text">
          <strong>
            <TrophyIcon size={30} />
            {t('play.peta.allDone')}
          </strong>
          <span>{t('play.peta.allDoneBody', { book: title })}</span>
        </span>
        <SpeakButton text={say} />
      </div>
    </div>
  );
}

/** Keterangan tanda di peta, dengan tombol dengar (anak PAUD belum membaca). */
function Legend() {
  const items: { key: string; icon: ReactNode; label: string }[] = [
    { key: 'now', icon: <span className="peta-key-dot is-now" />, label: t('play.peta.now') },
    { key: 'next', icon: <ArrowIcon />, label: t('play.peta.next') },
    { key: 'jump', icon: <JumpIcon />, label: t('play.peta.jump') },
    { key: 'done', icon: <CheckMark size={20} />, label: t('play.peta.done') },
    { key: 'locked', icon: <LockIcon size={18} />, label: t('play.peta.locked') },
  ];
  return (
    <div className="peta-legend">
      <ul aria-label={t('play.peta.legend')}>
        {items.map((it) => (
          <li key={it.key} className={`peta-key is-${it.key}`}>
            <span className="peta-key-icon" aria-hidden>
              {it.icon}
            </span>
            {it.label}
          </li>
        ))}
      </ul>
      <SpeakButton text={t('play.peta.legendSay')} label={t('play.peta.legendListen')} />
    </div>
  );
}

/** "3/5" topik lulus di bab ini, dengan cincin kecil. */
function BabProgress({ done, total }: { done: number; total: number }) {
  return (
    <span
      className="peta-bab-count"
      style={{ '--p': `${total ? (done / total) * 100 : 0}%` } as CSSProperties}
      aria-label={t('play.peta.summary', { done, total })}
    >
      {done}/{total}
    </span>
  );
}

function CheckMark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <path
        d="M12 25l8 8 16-17"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Panah ke kanan: topik berikutnya. */
function ArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M4 12h14M12 5l7 7-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Lengkung melompat: topik terbuka yang boleh dipilih kapan saja. */
function JumpIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M3 18c2-9 11-12 16-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M20 6v6h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 21h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Stars({ n, size = 20 }: { n: number; size?: number }) {
  return (
    <span className="peta-stars" aria-hidden>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={size}
          height={size}
          className={i < n ? 'is-on' : ''}
        >
          <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

const STATE_KEY = {
  lulus: 'play.peta.state.done',
  sekarang: 'play.peta.state.now',
  terbuka: 'play.peta.state.open',
  terkunci: 'play.peta.state.locked',
} as const;
const MARK_KEY = { berikutnya: 'play.peta.state.next', lompat: 'play.peta.state.jump' } as const;

export const nodeLabel = (title: string, info: NodeInfo, mock = false) => {
  const base = t('play.peta.nodeLabel', {
    topic: mock ? `${title} (${t('play.peta.mock')})` : title,
    state: t(STATE_KEY[info.state]),
    stars: info.stars,
  });
  return info.mark ? `${base}, ${t(MARK_KEY[info.mark])}` : base;
};

function Node({
  shelf,
  n,
  info,
  mock,
  selected,
  momoColor,
  onChoose,
}: {
  shelf: Shelf;
  n: number;
  info: NodeInfo;
  mock: boolean;
  selected: boolean;
  momoColor: Color;
  onChoose: () => void;
}) {
  const ring = info.total ? (info.passed / info.total) * 100 : 0;
  return (
    <button
      type="button"
      className={`peta-stop is-${info.state}${info.mark ? ` is-${info.mark}` : ''}${selected ? ' is-selected' : ''}`}
      aria-label={nodeLabel(shelf.category.title, info, mock)}
      aria-expanded={selected}
      aria-controls={selected ? 'peta-panel' : undefined}
      onClick={onChoose}
    >
      <span className="peta-flag" aria-hidden>
        {info.state === 'sekarang' ? (
          <span className="peta-tag is-now">{t('play.peta.now')}</span>
        ) : info.mark === 'berikutnya' ? (
          <span className="peta-tag is-next">
            {t('play.peta.next')}
            <ArrowIcon size={14} />
          </span>
        ) : null}
      </span>
      <span className="peta-ring" style={{ '--p': `${ring}%` } as CSSProperties}>
        <span className="peta-node">
          {info.state === 'lulus' ? (
            <CheckMark />
          ) : info.state === 'terkunci' ? (
            <LockIcon size={28} />
          ) : mock ? (
            <TrophyIcon size={34} />
          ) : (
            <span className="peta-num">{n}</span>
          )}
        </span>
        {info.state === 'sekarang' && (
          <span className="peta-here">
            <Momo own color={momoColor} mood="happy" size={40} />
          </span>
        )}
        {info.mark === 'lompat' && (
          <span className="peta-jump">
            <JumpIcon size={16} />
          </span>
        )}
      </span>
      <Stars n={info.stars} size={16} />
      <span className="peta-name">{shelf.category.title}</span>
    </button>
  );
}

/** "EMC · Eduversal Mathematics Competition — Penyisihan …" → nama lomba (D-069, D-070). */
const groupParts = (group: string) => {
  const m = /^(\S{2,12}) · (.+?)(?: [—–-] (.+))?$/.exec(group);
  return { badge: m?.[1], title: m ? m[2]! : group, note: m?.[3] };
};
const groupTitle = (group: string) => groupParts(group).title;

const groupCount = (shelves: Shelf[]) => {
  const topics = shelves.filter((s) => !isMockShelf(s)).length;
  const mocks = shelves
    .filter(isMockShelf)
    .reduce((n, s) => n + s.skills.filter(isMockSkill).length, 0);
  return [
    topics > 0 && t('play.home.groupTopics', { n: topics }),
    mocks > 0 && t('play.home.groupMocks', { n: mocks }),
  ]
    .filter(Boolean)
    .join(' · ');
};

const groupSay = (group: string, shelves: Shelf[]) => {
  const { title, note } = groupParts(group);
  const count = groupCount(shelves);
  return note ? `${title}. ${note}. ${count}.` : `${title}. ${count}.`;
};

/** Judul bab bergrup (lencana singkatan + nama + keterangan), sama dengan judul bagian lama. */
function BabTitle({ group, shelves }: { group: string; shelves: Shelf[] }) {
  const { badge, title, note } = groupParts(group);
  return (
    <>
      {badge && (
        <span className="peta-bab-badge">
          <TrophyIcon size={22} />
          {badge}
        </span>
      )}
      <span className="peta-bab-text">
        <strong>{title}</strong>
        <span>
          {note && <>{note} · </>}
          {groupCount(shelves)}
        </span>
      </span>
    </>
  );
}
