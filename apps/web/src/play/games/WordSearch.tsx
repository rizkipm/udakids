import { useEffect, useRef, useState } from 'react';
import {
  wordSearchStep,
  type Interaction,
  type WordSearchState,
  MAX_MISTAKES,
} from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import './games.css';

type Search = Extract<Interaction, { type: 'word-search' }>;
/** Warna lembut untuk kata yang sudah ketemu (bergantian) — token agar teks terbaca di tema terang & gelap (D-110). */
const FOUND = [
  'var(--kunyit-soft)',
  'var(--sawah-soft)',
  'var(--langit-soft)',
  'var(--toska-soft)',
];

/**
 * Cari kata (D-075): kotak huruf + daftar kata bergambar. Anak mengetuk huruf berurutan dari huruf pertama
 * (ke kanan atau ke bawah). Aturan langkah sama dengan penilaian engine (`wordSearchStep`). Huruf yang tidak
 * melanjutkan kata: huruf bergoyang lembut + petunjuk, tanpa kata "salah".
 */
export function WordSearch({
  interaction: it,
  disabled = false,
  onDone,
}: {
  interaction: Pick<Search, 'cols' | 'rows' | 'letters' | 'words'>;
  disabled?: boolean;
  onDone?: (taps: string[]) => void;
}) {
  const [state, setState] = useState<WordSearchState>({ found: [], sel: [] });
  const [cells, setCells] = useState<Record<string, number[]>>({});
  const [shake, setShake] = useState<{ cell: number; n: number }>();
  const taps = useRef<string[]>([]);
  const slips = useRef(0);
  useEffect(() => {
    setState({ found: [], sel: [] });
    setCells({});
    setShake(undefined);
    taps.current = [];
    slips.current = 0;
  }, [it]);

  const texts = it.words.map((w) => w.text);
  const done = texts.every((w) => state.found.includes(w));
  const colorOf = new Map<number, string>();
  state.found.forEach((text) => {
    const k = texts.indexOf(text);
    for (const cell of cells[text] ?? []) colorOf.set(cell, FOUND[k % FOUND.length]!);
  });

  const tap = (cell: number) => {
    if (disabled || done) return;
    const r = wordSearchStep(it, texts, state, cell);
    if (r.ignored) return;
    taps.current = [...taps.current, `c${cell}`];
    setState({ found: r.found, sel: r.sel });
    if (r.completed) {
      const word = it.words.find((w) => w.text === r.completed!.text)!;
      setCells((m) => ({ ...m, [word.text]: r.completed!.cells }));
      const all = texts.every((w) => r.found.includes(w));
      speak(
        all
          ? t('play.wordSearch.done', { word: word.say })
          : t('play.wordSearch.found', { word: word.say }),
      );
      if (all) onDone?.(taps.current);
    } else if (r.slip) {
      setShake((s) => ({ cell, n: (s?.n ?? 0) + 1 }));
      // Kekeliruan ke-2 (D-078): soal berakhir, lanjut ke soal berikutnya (tidak dipaksa sampai benar).
      slips.current += 1;
      // Cari kata: keliru pertama tanpa pengurangan (menjelajah), sama dengan penilaian engine.
      if (slips.current - 1 >= MAX_MISTAKES) return onDone?.(taps.current);
      speak(r.sel.length ? t('play.wordSearch.newStart') : t('play.wordSearch.firstLetter'));
    } else speak(it.letters[cell]!.toLowerCase());
  };

  return (
    <div className={`ws-board${done ? ' is-done' : ''}`}>
      <ul className="ws-words" aria-label={t('play.wordSearch.list')}>
        {it.words.map((w, k) => {
          const got = state.found.includes(w.text);
          return (
            <li key={w.id} className={got ? 'is-found' : undefined}>
              <button
                type="button"
                className="ws-word"
                style={got ? { ['--found' as string]: FOUND[k % FOUND.length] } : undefined}
                onClick={() => speak(w.say)}
                aria-label={`${w.say}${got ? `, ${t('play.wordSearch.gotLabel')}` : ''}`}
              >
                <VisualView visual={w.visual} size={52} />
                <span>{w.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div
        className="ws-grid"
        style={{ ['--cols' as string]: it.cols }}
        role="group"
        aria-label={t('play.wordSearch.grid')}
      >
        {[...it.letters].map((ch, cell) => {
          const sel = state.sel.includes(cell);
          const color = colorOf.get(cell);
          return (
            <button
              key={`${cell}-${shake?.cell === cell ? shake.n : 0}`}
              type="button"
              className={`ws-cell${sel ? ' is-sel' : ''}${color ? ' is-found' : ''}${shake?.cell === cell ? ' is-shake' : ''}`}
              style={color ? { ['--found' as string]: color } : undefined}
              disabled={disabled}
              aria-pressed={sel}
              aria-label={ch.toLowerCase()}
              onClick={() => tap(cell)}
            >
              {ch}
            </button>
          );
        })}
      </div>
    </div>
  );
}
