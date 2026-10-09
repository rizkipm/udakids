import { useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import {
  checkAnswer,
  isRetryGame,
  itemPoints,
  MAX_MISTAKES,
  isAudioOnlyItem,
  spokenPrompt,
  voiceLangOf,
  type InteractionType,
  type AnswerResult,
  type AnswerValue,
  type Choice,
  type Interaction,
  type Item,
  type Visual,
} from '@little-coder/engine';
import {
  SPEECH_BLOCKED,
  SPEECH_TROUBLE,
  pushVoiceItem,
  speak,
  speakChoice,
  speakItem,
  speakLine,
  stopSpeaking,
} from '../audio/speech';
import { VisualView } from '../components/visuals';
import { CatchGame } from './games/CatchGame';
import { ConnectDots } from './games/ConnectDots';
import { MazeBoard } from './games/MazeBoard';
import { MemoryGame } from './games/MemoryGame';
import { TraceBoard } from './games/TraceBoard';
import { WordSearch } from './games/WordSearch';
import { CrosswordGame } from './games/Crossword';
import { FacePick } from './games/FacePick';
import { FeedCat } from './games/FeedCat';
import { HopGame } from './games/HopGame';
import { JigsawGame } from './games/Jigsaw';
import { LabelMatch } from './games/Labels';
import { SortGame } from './games/SortGame';
import { SumGame } from './games/SumGame';
import { TrainSpell } from './games/Train';
import { WheelGame } from './games/Wheel';
import { t, type MessageKey } from '../i18n';
import { ItemVoice } from './itemVoice';
import './play.css';

export type ItemPlayerProps = {
  item: Item;
  /** Dipanggil setelah anak menjawab (sudah diperiksa). */
  onAnswer?: (result: AnswerResult & { value: AnswerValue }) => void;
  /** 'preview' = untuk admin: tanpa suara otomatis. */
  mode?: 'play' | 'preview';
  /** Kunci jawaban ditandai (preview admin). */
  showAnswer?: boolean;
  disabled?: boolean;
  /**
   * Tingkat skill (D-035): Basic → kalimat soal dibacakan suara Momo; kelas 1+ → hanya perintah
   * ("Pilih satu jawaban…"), bukan seluruh soal. Tanpa tier (mis. contoh di materi) → kalimat soal.
   */
  tier?: 'basic' | 'intermediate' | 'advanced';
  /**
   * Mode "kirim saja" (lomba, D-042): jawaban TIDAK diperiksa di perangkat (kunci tidak ada); nilai mentah
   * diteruskan ke sini tanpa tanda benar/keliru. Suara memakai suara perangkat (tanpa id soal).
   */
  onSubmitValue?: (value: AnswerValue) => void;
  /**
   * `false` = jawaban diperiksa (onAnswer) tetapi tanda benar/belum tepat TIDAK ditampilkan — Mock Test
   * olimpiade (D-072), seperti lembar lomba; hasil & pembahasan tampil di akhir.
   */
  showMarks?: boolean;
};

const COMMAND_TEXT: Record<InteractionType, MessageKey> = {
  'pick-one': 'play.cmd.pickOne',
  'tap-all': 'play.cmd.tapAll',
  order: 'play.cmd.order',
  group: 'play.cmd.group',
  match: 'play.cmd.match',
  build: 'play.cmd.build',
  'number-line': 'play.cmd.numberLine',
  'number-input': 'play.cmd.numberInput',
  trace: 'play.cmd.trace',
  connect: 'play.cmd.connect',
  spell: 'play.cmd.spell',
  maze: 'play.cmd.maze',
  'word-search': 'play.cmd.wordSearch',
  memory: 'play.cmd.memory',
  catch: 'play.cmd.catch',
  sum: 'play.cmd.sum',
  hop: 'play.cmd.hop',
  sort: 'play.cmd.sort',
  crossword: 'play.cmd.crossword',
  jigsaw: 'play.cmd.jigsaw',
};

/** Ucapkan perintah/kalimat soal sesuai tingkat (suara Momo, cadangan suara browser). */
export function speakPrompt(item: Item, tier: ItemPlayerProps['tier']) {
  // Tanpa tingkat (contoh soal, pratinjau): kalimat soal lengkap, suara Chirp per soal (D-091).
  if (!tier) return speakItem(item, item.say ?? item.prompt);
  const spoken = spokenPrompt(item, tier);
  if (spoken.kind === 'item') return speakItem(item, spoken.text);
  speakLine(spoken.key, t(COMMAND_TEXT[item.interaction.type]));
}

/** Seperti `speakPrompt`, tetapi tanpa klip suara per soal (soal lomba tidak membawa id/seed). */
function speakPlain(item: Item, tier: ItemPlayerProps['tier']) {
  if (!tier || tier === 'basic')
    return speak(item.say ?? item.prompt, { lang: voiceLangOf(item.skillId) });
  const spoken = spokenPrompt(item, tier);
  if (spoken.kind === 'line') speakLine(spoken.key, t(COMMAND_TEXT[item.interaction.type]));
}

/** Pemutar satu soal Pustaka. Semua interaksi cukup diketuk (tanpa drag), target ≥ 64 px. */
export function ItemPlayer({
  item,
  onAnswer,
  mode = 'play',
  showAnswer = false,
  disabled = false,
  tier,
  onSubmitValue,
  showMarks = true,
}: ItemPlayerProps) {
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<AnswerResult>();
  // Game tombol Selesai (D-078): kekeliruan pertama −5 poin dan boleh dibetulkan; nomor kekeliruan untuk animasi.
  const [mistakes, setMistakes] = useState(0);
  const say = item.say ?? item.prompt;

  const submitOnly = onSubmitValue !== undefined;
  const sayPrompt = () => (submitOnly ? speakPlain(item, tier) : speakPrompt(item, tier));

  // Suara tidak keluar di perangkat ini (tidak ada mesin suara / gagal walau dicoba ulang): tampilkan bantuan.
  const [trouble, setTrouble] = useState(false);
  // Browser menolak suara otomatis (belum ada ketukan): minta anak mengetuk speaker (D-047).
  const [blocked, setBlocked] = useState(false);
  // Soal yang isinya hanya lewat suara: petunjuk tertulis untuk dibacakan orang dewasa (D-047).
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    setTrouble(false);
    setBlocked(false);
    setReveal(false);
    const onTrouble = () => setTrouble(true);
    const onBlocked = () => setBlocked(true);
    window.addEventListener(SPEECH_TROUBLE, onTrouble);
    window.addEventListener(SPEECH_BLOCKED, onBlocked);
    return () => {
      window.removeEventListener(SPEECH_TROUBLE, onTrouble);
      window.removeEventListener(SPEECH_BLOCKED, onBlocked);
    };
  }, [item]);
  const audioOnly = isAudioOnlyItem(item);

  // Konteks suara (D-091): kalimat soal, kartu, dan game di soal ini boleh dibuatkan suara Chirp. Layout effect
  // supaya terpasang sebelum suara pertama diputar.
  useLayoutEffect(
    () => pushVoiceItem({ skillId: item.skillId, seed: item.seed, band: item.band }),
    [item.skillId, item.seed, item.band],
  );

  useEffect(() => {
    setLocked(false);
    setResult(undefined);
    setMistakes(0);
    if (mode === 'play') (submitOnly ? speakPlain : speakPrompt)(item, tier);
    return () => stopSpeaking();
  }, [item, mode, tier, submitOnly]);

  const submit = (value: AnswerValue) => {
    if (locked || disabled) return;
    if (onSubmitValue) {
      setLocked(true);
      onSubmitValue(value);
      return;
    }
    const r = checkAnswer(item, value);
    if (!r.correct && isRetryGame(item.interaction) && mistakes + 1 < MAX_MISTAKES) {
      // Belum pas: poin soal ini berkurang, anak membetulkan jawabannya (tanpa kata "salah").
      setMistakes((m) => m + 1);
      speak(t('play.game.retry'));
      return;
    }
    const total = isRetryGame(item.interaction)
      ? mistakes + (r.correct ? 0 : 1)
      : (r.mistakes ?? 0);
    const final = isRetryGame(item.interaction)
      ? { ...r, mistakes: total, points: itemPoints(r.correct, mistakes) }
      : r;
    setLocked(true);
    setResult(final);
    onAnswer?.({ ...final, value });
  };

  const inactive = locked || disabled;
  return (
    <div className="item" data-interaction={item.interaction.type}>
      <div className={`item-prompt${blocked ? ' is-blocked' : ''}`}>
        <SpeakButton
          text={say}
          onSpeak={() => {
            setBlocked(false);
            sayPrompt();
          }}
        />
        <p className={item.prompt.length > 160 ? 'is-long' : undefined}>{item.prompt}</p>
      </div>
      {blocked && mode === 'play' && (
        <p className="speech-help is-tap" role="status">
          {t('play.speechHelp.tapSpeaker')}
        </p>
      )}
      {audioOnly && mode === 'play' && !trouble && !reveal && (
        <button type="button" className="speech-reveal" onClick={() => setReveal(true)}>
          {t('play.speechHelp.reveal')}
        </button>
      )}
      {(trouble || reveal) && mode === 'play' && (
        <div className="speech-help" role="status">
          {trouble && (
            <>
              <strong>{t('play.speechHelp.title')}</strong>
              <span>{t('play.speechHelp.tips')}</span>
            </>
          )}
          {say !== item.prompt && (
            <span>
              {t('play.speechHelp.readAloud')} <q className="speech-help-text">{say}</q>
            </span>
          )}
        </div>
      )}
      {item.stimulus.length > 0 && (
        <PeekStimulus item={item} active={mode === 'play' && !!item.peek}>
          {item.stimulus.map((v, i) => (
            <VisualView key={i} visual={v} size={stimulusSize(v)} />
          ))}
        </PeekStimulus>
      )}
      <div
        className={`interaction${result && showMarks ? (result.correct ? ' is-right' : ' is-wrong') : ''}`}
      >
        <ItemVoice.Provider value={item}>
          {mistakes > 0 && !locked && (
            <p key={mistakes} className="game-retry" role="status">
              {t('play.game.retryNote')}
            </p>
          )}
          <InteractionView
            interaction={item.interaction}
            onSubmit={submit}
            disabled={inactive}
            showAnswer={
              showAnswer || (result !== undefined && !result.correct && mode === 'preview')
            }
            result={showMarks ? result : undefined}
          />
        </ItemVoice.Provider>
      </div>
    </div>
  );
}

/** Kolom grid pilihan agar kartu sama besar dan rata tengah. */
export const gridColumns = (n: number, textual: boolean) =>
  n <= 3 ? n : n === 4 ? (textual ? 2 : 4) : 3;

const stimulusSize = (v: Visual) =>
  v.kind === 'bar-chart' || v.kind === 'table'
    ? 300
    : v.kind === 'numeral' || v.kind === 'equation'
      ? 120
      : v.kind === 'row' || v.kind === 'text'
        ? 110
        : 180;

export function SpeakButton({
  text,
  label,
  onSpeak,
}: {
  text: string;
  label?: string;
  onSpeak?: () => void;
}) {
  return (
    <button
      type="button"
      className="speak-btn"
      aria-label={label ?? t('play.listen')}
      onClick={() => (onSpeak ? onSpeak() : speak(text))}
    >
      <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden>
        <path d="M8 18h8l10-8v28l-10-8H8z" fill="currentColor" />
        <path
          d="M32 16c3 3 3 13 0 16M36 11c6 6 6 20 0 26"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

export function CheckButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="check-btn"
      aria-label={t('play.check')}
      disabled={disabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden>
        <path
          d="M10 25l9 9 19-20"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function ChoiceCard({
  choice,
  selected,
  marked,
  disabled,
  onClick,
  size = 110,
  badge,
}: {
  choice: Choice;
  selected?: boolean;
  marked?: 'answer' | 'right' | 'wrong';
  disabled?: boolean;
  onClick?: () => void;
  size?: number;
  badge?: ReactNode;
}) {
  const voiceItem = useContext(ItemVoice);
  return (
    <button
      type="button"
      className={`choice${selected ? ' is-selected' : ''}${marked ? ` is-${marked}` : ''}`}
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => {
        speakChoice(voiceItem, choice);
        onClick?.();
      }}
    >
      {badge !== undefined && <span className="choice-badge">{badge}</span>}
      {choice.visual.kind === 'text' || choice.visual.kind === 'word' ? (
        <span
          className={`choice-text${choice.visual.kind === 'word' && choice.visual.text.length === 1 ? ' is-letter' : ''}`}
        >
          {choice.visual.text}
        </span>
      ) : (
        <VisualView visual={choice.visual} size={size} />
      )}
    </button>
  );
}

type ViewProps<I extends Interaction> = {
  interaction: I;
  onSubmit: (v: AnswerValue) => void;
  disabled: boolean;
  showAnswer: boolean;
  result?: AnswerResult;
};

function InteractionView(props: ViewProps<Interaction>) {
  const it = props.interaction;
  switch (it.type) {
    case 'pick-one':
      return <PickOne {...props} interaction={it} />;
    case 'tap-all':
      return <TapAll {...props} interaction={it} />;
    case 'order':
      // Bianglala / roket (D-078): tampilan game, penilaian sama.
      return it.style ? (
        <WheelGame {...props} interaction={it} />
      ) : (
        <Order {...props} interaction={it} />
      );
    case 'group':
      return <Group {...props} interaction={it} />;
    case 'match':
      return it.style === 'labels' ? (
        <LabelMatch {...props} interaction={it} />
      ) : (
        <Match {...props} interaction={it} />
      );
    case 'spell':
      return it.style === 'train' ? (
        <TrainSpell {...props} interaction={it} />
      ) : (
        <Spell {...props} interaction={it} />
      );
    case 'build':
      return it.style === 'feed' ? (
        <FeedCat {...props} interaction={it} />
      ) : (
        <Build {...props} interaction={it} />
      );
    case 'number-line':
      return <NumberLine {...props} interaction={it} />;
    case 'number-input':
      return <NumberInput {...props} interaction={it} />;
    case 'trace':
      return (
        <TraceBoard
          glyph={it.glyph}
          guide={it.guide}
          tolerance={it.tolerance}
          disabled={props.disabled}
          onDone={(slips) => props.onSubmit(slips)}
        />
      );
    case 'connect':
      return (
        <ConnectDots
          interaction={it}
          disabled={props.disabled}
          onDone={(taps) => props.onSubmit(taps)}
        />
      );
    case 'maze':
      return <MazeBoard interaction={it} disabled={props.disabled} onDone={props.onSubmit} />;
    case 'word-search':
      return <WordSearch interaction={it} disabled={props.disabled} onDone={props.onSubmit} />;
    case 'memory':
      return (
        <MemoryGame
          interaction={it}
          disabled={props.disabled}
          reveal={props.showAnswer}
          onDone={props.onSubmit}
        />
      );
    case 'catch':
      return <CatchGame interaction={it} disabled={props.disabled} onDone={props.onSubmit} />;
    // Game seru (D-078).
    case 'sum':
      return <SumGame {...props} interaction={it} />;
    case 'hop':
      return <HopGame {...props} interaction={it} onDone={props.onSubmit} />;
    case 'sort':
      return <SortGame {...props} interaction={it} onDone={props.onSubmit} />;
    case 'crossword':
      return <CrosswordGame {...props} interaction={it} onDone={props.onSubmit} />;
    case 'jigsaw':
      return <JigsawGame {...props} interaction={it} onDone={props.onSubmit} />;
  }
}

/** Ubah "1.250" / "0,5" (gaya Indonesia) menjadi angka. */
export function parseIdNumber(text: string): number | undefined {
  if (!/^\d+(,\d+)?$/.test(text)) return undefined;
  return Number(text.replace(',', '.'));
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'hapus'] as const;

function NumberInput({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
  result,
}: ViewProps<Extract<Interaction, { type: 'number-input' }>>) {
  const [text, setText] = useState('');
  useEffect(() => setText(''), [it]);
  const allowComma = (it.decimals ?? 0) > 0;
  const shown = text || (showAnswer ? String(it.answer).replace('.', ',') : '');
  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'hapus') setText((x) => x.slice(0, -1));
    else if (k === ',') setText((x) => (allowComma && x && !x.includes(',') ? `${x},` : x));
    else setText((x) => (x.length >= 9 ? x : x === '0' ? k : x + k));
  };
  const value = parseIdNumber(text);
  return (
    <>
      <div
        className={`numinput-display${result ? (result.correct ? ' is-right' : ' is-wrong') : ''}`}
        aria-live="polite"
        aria-label={t('play.answerBox')}
      >
        <span className="numinput-value">{shown || ' '}</span>
        {it.unit && <span className="numinput-unit">{it.unit}</span>}
      </div>
      {result && !result.correct && (
        <p className="numinput-key-answer">
          {t('play.correctAnswer', {
            answer: `${String(it.answer).replace('.', ',')}${it.unit ? ` ${it.unit}` : ''}`,
          })}
        </p>
      )}
      <div className="numinput-keys">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className="numinput-key"
            disabled={disabled || (k === ',' && !allowComma)}
            aria-label={k === 'hapus' ? t('play.erase') : k === ',' ? t('play.comma') : k}
            onClick={() => press(k)}
          >
            {k === 'hapus' ? (
              <svg viewBox="0 0 48 48" width="32" height="32" aria-hidden>
                <path
                  d="M18 12h20v24H18L8 24z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 19l10 10M32 19L22 29"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              k
            )}
          </button>
        ))}
      </div>
      <CheckButton
        disabled={disabled || value === undefined}
        onClick={() => value !== undefined && onSubmit(value)}
      />
    </>
  );
}

function PickOne({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
  result,
}: ViewProps<Extract<Interaction, { type: 'pick-one' }>>) {
  const [chosen, setChosen] = useState<string>();
  const voiceItem = useContext(ItemVoice);
  useEffect(() => setChosen(undefined), [it]);
  const textual = it.choices.every((c) => c.visual.kind === 'word' || c.visual.kind === 'text');
  if (it.arrangement === 'face')
    return (
      <FacePick
        choices={it.choices}
        chosen={chosen}
        disabled={disabled}
        marks={(c) =>
          chosen === c.id && result
            ? result.correct
              ? 'right'
              : 'wrong'
            : showAnswer && c.id === it.answer
              ? 'answer'
              : undefined
        }
        onPick={(c) => {
          speakChoice(voiceItem, c);
          setChosen(c.id);
          onSubmit(c.id);
        }}
      />
    );
  return (
    <div
      className={`choices arrange-${it.arrangement ?? 'grid'}${textual ? ' choices-words' : ''}`}
      style={{ ['--cols' as string]: gridColumns(it.choices.length, textual) }}
    >
      {it.choices.map((c) => (
        <ChoiceCard
          key={c.id}
          choice={c}
          disabled={disabled}
          selected={chosen === c.id}
          marked={
            chosen === c.id && result
              ? result.correct
                ? 'right'
                : 'wrong'
              : showAnswer && c.id === it.answer
                ? 'answer'
                : undefined
          }
          size={it.arrangement === 'row' && it.choices.length > 4 ? 84 : 110}
          onClick={() => {
            setChosen(c.id);
            onSubmit(c.id);
          }}
        />
      ))}
    </div>
  );
}

function TapAll({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
  result,
}: ViewProps<Extract<Interaction, { type: 'tap-all' }>>) {
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => setSel([]), [it]);
  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <>
      <div
        className={`choices arrange-grid${it.style === 'balloons' ? ' is-balloons' : ''}`}
        style={{ ['--cols' as string]: gridColumns(it.choices.length, false) }}
      >
        {it.choices.map((c) => (
          <ChoiceCard
            key={c.id}
            choice={c}
            disabled={disabled}
            selected={sel.includes(c.id)}
            marked={
              result && sel.includes(c.id)
                ? it.answer.includes(c.id)
                  ? 'right'
                  : 'wrong'
                : (showAnswer || (result && !result.correct)) && it.answer.includes(c.id)
                  ? 'answer'
                  : undefined
            }
            onClick={() => toggle(c.id)}
          />
        ))}
      </div>
      <CheckButton disabled={disabled || sel.length === 0} onClick={() => onSubmit(sel)} />
    </>
  );
}

function Order({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
}: ViewProps<Extract<Interaction, { type: 'order' }>>) {
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setPicked([]), [it]);
  const byId = useMemo(() => new Map(it.choices.map((c) => [c.id, c])), [it]);
  const order = showAnswer ? it.answer : picked;
  return (
    <>
      <div className="order-slots" aria-label={t('play.orderSlots')}>
        {it.choices.map((_, i) => {
          const id = order[i];
          const c = id ? byId.get(id) : undefined;
          return c ? (
            <ChoiceCard
              key={i}
              choice={c}
              badge={i + 1}
              disabled={disabled || showAnswer}
              size={80}
              onClick={() => setPicked((p) => p.filter((x) => x !== c.id))}
            />
          ) : (
            <div key={i} className="slot-empty" aria-hidden>
              {i + 1}
            </div>
          );
        })}
      </div>
      <div className="choices arrange-row">
        {it.choices
          .filter((c) => !order.includes(c.id))
          .map((c) => (
            <ChoiceCard
              key={c.id}
              choice={c}
              disabled={disabled}
              size={90}
              onClick={() => setPicked((p) => [...p, c.id])}
            />
          ))}
      </div>
      <CheckButton
        disabled={disabled || picked.length !== it.choices.length}
        onClick={() => onSubmit(picked)}
      />
    </>
  );
}

/**
 * Lengkapi nama (D-070): kartu huruf mengisi kotak kosong dari kiri; ketuk kotak yang terisi untuk
 * mengembalikan hurufnya. Tanpa drag.
 */
function Spell({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
}: ViewProps<Extract<Interaction, { type: 'spell' }>>) {
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => setPicked([]), [it]);
  const byId = useMemo(() => new Map(it.letters.map((c) => [c.id, c])), [it]);
  const blanks = it.slots.filter((x) => x === null).length;
  const letterOf = (id: string) => {
    const v = byId.get(id)?.visual;
    return v?.kind === 'word' ? v.text : '';
  };
  let k = 0;
  return (
    <>
      <div className="spell-slots" aria-label={t('play.spellSlots')}>
        {it.slots.map((fixed, i) => {
          if (fixed !== null)
            return (
              <span key={i} className="spell-slot is-fixed">
                {fixed}
              </span>
            );
          const n = k++;
          const id = picked[n];
          const letter = showAnswer ? it.answer[n] : id ? letterOf(id) : '';
          return (
            <button
              key={i}
              type="button"
              className={`spell-slot${letter ? ' is-filled' : ''}${n === picked.length && !showAnswer ? ' is-next' : ''}`}
              disabled={disabled || showAnswer || !id}
              aria-label={letter || t('play.spellEmpty')}
              onClick={() => setPicked((p) => p.filter((_, j) => j !== n))}
            >
              {letter}
            </button>
          );
        })}
      </div>
      <div className="choices arrange-row spell-letters">
        {it.letters
          .filter((c) => !picked.includes(c.id))
          .map((c) => (
            <ChoiceCard
              key={c.id}
              choice={c}
              disabled={disabled || showAnswer || picked.length >= blanks}
              onClick={() => setPicked((p) => (p.length < blanks ? [...p, c.id] : p))}
            />
          ))}
      </div>
      <CheckButton
        disabled={disabled || picked.length !== blanks}
        onClick={() => onSubmit(picked.map(letterOf))}
      />
    </>
  );
}

function Group({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
}: ViewProps<Extract<Interaction, { type: 'group' }>>) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string>();
  useEffect(() => {
    setPlaced({});
    setActive(undefined);
  }, [it]);
  const where = showAnswer ? it.answer : placed;
  const pool = it.items.filter((c) => !where[c.id]);
  const voiceItem = useContext(ItemVoice);
  return (
    <>
      <div className="group-pool" aria-label={t('play.groupPool')}>
        {pool.map((c) => (
          <ChoiceCard
            key={c.id}
            choice={c}
            size={80}
            disabled={disabled}
            selected={active === c.id}
            onClick={() => setActive(active === c.id ? undefined : c.id)}
          />
        ))}
        {pool.length === 0 && <span className="group-done" aria-hidden />}
      </div>
      <div className="group-bins">
        {it.groups.map((g) => (
          <div key={g.id} className={`group-bin${active ? ' is-target' : ''}`}>
            <button
              type="button"
              className="group-bin-head"
              disabled={disabled}
              aria-label={g.say ?? t('play.groupHere')}
              onClick={() => {
                speakChoice(voiceItem, g);
                if (active) {
                  setPlaced((p) => ({ ...p, [active]: g.id }));
                  setActive(undefined);
                }
              }}
            >
              <VisualView visual={g.visual} size={72} />
            </button>
            <div className="group-bin-items">
              {it.items
                .filter((c) => where[c.id] === g.id)
                .map((c) => (
                  <ChoiceCard
                    key={c.id}
                    choice={c}
                    size={64}
                    disabled={disabled || showAnswer}
                    onClick={() =>
                      setPlaced((p) => {
                        const next = { ...p };
                        delete next[c.id];
                        return next;
                      })
                    }
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
      <CheckButton
        disabled={disabled || Object.keys(placed).length !== it.items.length}
        onClick={() => onSubmit(placed)}
      />
    </>
  );
}

function Match({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
}: ViewProps<Extract<Interaction, { type: 'match' }>>) {
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [left, setLeft] = useState<string>();
  useEffect(() => {
    setPairs({});
    setLeft(undefined);
  }, [it]);
  const shown = showAnswer ? it.answer : pairs;
  const number = (leftId: string) => it.left.findIndex((c) => c.id === leftId) + 1;
  return (
    <>
      <div className="match">
        <div className="match-col">
          {it.left.map((c) => (
            <ChoiceCard
              key={c.id}
              choice={c}
              size={80}
              disabled={disabled}
              selected={left === c.id}
              badge={shown[c.id] ? number(c.id) : undefined}
              onClick={() => setLeft(c.id)}
            />
          ))}
        </div>
        <div className="match-col">
          {it.right.map((c) => {
            const owner = Object.keys(shown).find((k) => shown[k] === c.id);
            return (
              <ChoiceCard
                key={c.id}
                choice={c}
                size={80}
                disabled={disabled || !left}
                badge={owner ? number(owner) : undefined}
                onClick={() => {
                  if (!left) return;
                  setPairs((p) => {
                    const next = Object.fromEntries(
                      Object.entries(p).filter(([, v]) => v !== c.id),
                    );
                    return { ...next, [left]: c.id };
                  });
                  setLeft(undefined);
                }}
              />
            );
          })}
        </div>
      </div>
      <CheckButton
        disabled={disabled || Object.keys(pairs).length !== it.left.length}
        onClick={() => onSubmit(pairs)}
      />
    </>
  );
}

function Build({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
}: ViewProps<Extract<Interaction, { type: 'build' }>>) {
  const [n, setN] = useState(0);
  useEffect(() => setN(0), [it]);
  const count = showAnswer ? it.target : n;
  const visual: Visual =
    it.unit === 'cube'
      ? { kind: 'cubes', counts: [count], colors: ['biru'] }
      : it.unit === 'frame'
        ? { kind: 'frame', filled: count, size: it.frameSize ?? 10 }
        : {
            kind: 'objects',
            object: it.unit === 'sticker' ? 'stiker' : (it.object ?? 'bintang'),
            count,
            layout: 'row',
          };
  const unitVisual: Visual =
    it.unit === 'cube'
      ? { kind: 'cubes', counts: [1], colors: ['biru'] }
      : it.unit === 'frame'
        ? { kind: 'dots', count: 1, layout: 'row' }
        : { kind: 'object', object: it.unit === 'sticker' ? 'stiker' : (it.object ?? 'bintang') };
  return (
    <>
      <div className="build-area" aria-live="polite">
        <VisualView visual={visual} size={150} />
      </div>
      <div className="build-controls">
        <button
          type="button"
          className="build-btn"
          aria-label={t('play.buildRemove')}
          disabled={disabled || n === 0}
          onClick={() => setN((x) => x - 1)}
        >
          <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden>
            <path d="M12 24h24" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className="build-btn build-add"
          aria-label={t('play.buildAdd')}
          disabled={disabled || n >= it.max}
          onClick={() => setN((x) => x + 1)}
        >
          <VisualView visual={unitVisual} size={56} />
          <svg viewBox="0 0 48 48" width="32" height="32" aria-hidden>
            <path
              d="M24 12v24M12 24h24"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <CheckButton disabled={disabled || n === 0} onClick={() => onSubmit(n)} />
    </>
  );
}

function NumberLine({
  interaction: it,
  onSubmit,
  disabled,
  showAnswer,
}: ViewProps<Extract<Interaction, { type: 'number-line' }>>) {
  const [sel, setSel] = useState<number>();
  useEffect(() => setSel(undefined), [it]);
  const values = Array.from({ length: it.max - it.min + 1 }, (_, i) => it.min + i);
  const step = 56;
  const width = values.length * step + 24;
  const mark = showAnswer ? it.answer : sel;
  return (
    <>
      <div className="number-line-wrap">
        <svg
          viewBox={`0 0 ${width} 130`}
          style={{ width: '100%', minWidth: values.length * 36, height: 'auto' }}
          role="group"
          aria-label={t('play.numberLine')}
        >
          <line
            x1={12}
            y1={70}
            x2={width - 12}
            y2={70}
            stroke="#2b2540"
            strokeWidth={4}
            strokeLinecap="round"
          />
          {values.map((v, i) => {
            const x = 12 + step / 2 + i * step;
            const isStart = v === it.start;
            const isMark = v === mark;
            return (
              <g
                key={v}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={String(v)}
                aria-pressed={isMark}
                className="nl-tick"
                onClick={() => !disabled && setSel(v)}
                onKeyDown={(e) => {
                  if (!disabled && (e.key === 'Enter' || e.key === ' ')) setSel(v);
                }}
              >
                <rect x={x - step / 2} y={20} width={step} height={104} fill="transparent" />
                <line x1={x} y1={58} x2={x} y2={82} stroke="#2b2540" strokeWidth={3} />
                <circle
                  cx={x}
                  cy={70}
                  r={isMark ? 16 : 0}
                  fill="#f7c948"
                  stroke="#2b2540"
                  strokeWidth={3}
                />
                <text
                  x={x}
                  y={112}
                  textAnchor="middle"
                  fontSize={22}
                  fontWeight={700}
                  fill="#1d1a2e"
                >
                  {v}
                </text>
                {isStart && (
                  <g transform={`translate(${x - 14} 16)`}>
                    <rect
                      width={28}
                      height={30}
                      rx={9}
                      fill="#8a6cf0"
                      stroke="#2b2540"
                      strokeWidth={3}
                    />
                    <circle cx={9} cy={13} r={3} fill="#1d1a2e" />
                    <circle cx={19} cy={13} r={3} fill="#1d1a2e" />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <CheckButton
        disabled={disabled || sel === undefined}
        onClick={() => sel !== undefined && onSubmit(sel)}
      />
    </>
  );
}

/**
 * Lihat sekilas (P-MA-02, D-081): gambar soal tampil `item.peek` ms lalu ditutup kartu "?". Tombol "Lihat lagi"
 * membukanya lagi sebentar, berapa kali pun — tidak ada batas waktu menjawab.
 */
function PeekStimulus({
  item,
  active,
  children,
}: {
  item: Item;
  active: boolean;
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    setHidden(false);
    if (!active) return;
    const id = window.setTimeout(() => setHidden(true), item.peek);
    return () => window.clearTimeout(id);
  }, [item, active, round]);
  return (
    <div className={`item-stimulus${active ? ' is-peek' : ''}${hidden ? ' is-hidden' : ''}`}>
      <div className="peek-content" aria-hidden={hidden}>
        {children}
      </div>
      {hidden && (
        <div className="peek-cover">
          <span className="peek-mark" aria-hidden>
            ?
          </span>
          <button
            type="button"
            className="kid-btn secondary peek-again"
            onClick={() => {
              speak(t('play.peek.again'));
              setRound((r) => r + 1);
            }}
          >
            {t('play.peek.button')}
          </button>
        </div>
      )}
    </div>
  );
}
