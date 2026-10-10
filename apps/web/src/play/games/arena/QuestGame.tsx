import { useEffect, useRef, useState } from 'react';
import {
  dotted,
  gameOver,
  numberWord,
  questReplay,
  type Interaction,
  type QuestRound,
} from '@little-coder/engine';
import { speak } from '../../../audio/speech';
import { VisualView } from '../../../components/visuals';
import { t } from '../../../i18n';
import { useSayChoice } from '../../itemVoice';
import { ARENA_COLORS, Burst, Die, Domino, Speaker } from './parts';
import './arena.css';

type Quest = Extract<Interaction, { type: 'quest' }>;

/** Kartu angka dikelompokkan per tiga dari kanan: 2847387 → [2][847][387]. */
function groupsOf3<T>(xs: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let end = xs.length; end > 0; end -= 3) out.unshift(xs.slice(Math.max(0, end - 3), end));
  return out;
}

/** Lintasan balap: mobil atau perahu Momo maju satu petak setiap jawaban tepat. */
function Track({ theme, at, total }: { theme: 'race' | 'boat'; at: number; total: number }) {
  const W = 340;
  const x = 34 + (at / total) * (W - 96);
  return (
    <svg viewBox={`0 0 ${W} 96`} className="quest-track" aria-hidden>
      {theme === 'race' ? (
        <>
          <rect x="2" y="18" width={W - 4} height="62" rx="18" fill="#6c757d" />
          <line
            x1="12"
            y1="49"
            x2={W - 12}
            y2="49"
            stroke="#fff"
            strokeWidth="4"
            strokeDasharray="14 12"
          />
        </>
      ) : (
        <>
          <rect x="2" y="18" width={W - 4} height="62" rx="18" fill="#7fd1f5" />
          {[30, 120, 210].map((wx) => (
            <path
              key={wx}
              d={`M${wx} 66 q10 -8 20 0 t20 0`}
              stroke="#fff"
              strokeWidth="3"
              fill="none"
            />
          ))}
        </>
      )}
      {Array.from({ length: total + 1 }, (_, i) => (
        <circle
          key={i}
          cx={34 + (i / total) * (W - 96)}
          cy="86"
          r="5"
          fill={i <= at ? '#ffd166' : '#fff'}
          stroke="#2b2540"
          strokeWidth="2"
        />
      ))}
      {/* Bendera finis kotak-kotak. */}
      <g transform={`translate(${W - 44} 8)`}>
        <rect x="0" y="0" width="4" height="74" fill="#2b2540" />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}${c}`}
              x={4 + c * 9}
              y={r * 9}
              width="9"
              height="9"
              fill={(r + c) % 2 ? '#2b2540' : '#fff'}
            />
          )),
        )}
      </g>
      <g className="quest-runner" style={{ transform: `translate(${x}px, 48px)` }}>
        {theme === 'race' ? (
          <>
            <rect
              x="-26"
              y="-16"
              width="52"
              height="22"
              rx="8"
              fill="#ff6b9a"
              stroke="#2b2540"
              strokeWidth="3"
            />
            <path
              d="M-14 -16 L-6 -28 H12 L20 -16 Z"
              fill="#bfeaff"
              stroke="#2b2540"
              strokeWidth="3"
            />
            <circle cx="-14" cy="8" r="8" fill="#2b2540" />
            <circle cx="16" cy="8" r="8" fill="#2b2540" />
          </>
        ) : (
          <>
            <path d="M-28 -2 H28 L18 14 H-18 Z" fill="#ff8a3d" stroke="#2b2540" strokeWidth="3" />
            <path d="M0 -36 V-2 M0 -34 L20 -8 H0" fill="#fff" stroke="#2b2540" strokeWidth="3" />
          </>
        )}
      </g>
    </svg>
  );
}

/** Papan bidak dadu: petak berwarna menuju bintang. */
function DiceBoard({ at, total }: { at: number; total: number }) {
  const W = 340;
  // Petak 0..total + bintang di ujung kanan (tidak bertumpuk).
  const step = (W - 64) / (total + 1);
  return (
    <svg viewBox={`0 0 ${W} 70`} className="quest-track" aria-hidden>
      {Array.from({ length: total + 1 }, (_, i) => (
        <rect
          key={i}
          x={14 + i * step}
          y={i % 2 ? 26 : 16}
          width={step - 6}
          height="30"
          rx="8"
          fill={ARENA_COLORS[i % ARENA_COLORS.length]}
          stroke="#2b2540"
          strokeWidth="3"
          opacity={i <= at ? 1 : 0.45}
        />
      ))}
      <path
        transform={`translate(${W - 30} 34)`}
        d="M0 -16l4.6 9.6 10.4 1.3-7.6 7.2 2 10.4L0 7.3l-9.4 5.2 2-10.4-7.6-7.2 10.4-1.3z"
        fill="#ffd166"
        stroke="#2b2540"
        strokeWidth="2.5"
      />
      <circle
        className="quest-runner"
        style={{
          transform: `translate(${14 + at * step + (step - 6) / 2}px, ${at % 2 ? 41 : 31}px)`,
        }}
        r="11"
        fill="#fff"
        stroke="#2b2540"
        strokeWidth="4"
      />
    </svg>
  );
}

/** Garis bilangan pembulatan: bilangan ditandai bola di antara dua gawang. */
function KickLine({ line, kicked }: { line: NonNullable<QuestRound['line']>; kicked?: number }) {
  const W = 320;
  const pos = (v: number) => 24 + ((v - line.lo) / (line.hi - line.lo)) * (W - 48);
  const ballX = kicked === undefined ? pos(line.value) : pos(kicked);
  return (
    <svg viewBox={`0 0 ${W} 80`} className="quest-track kick-line" aria-hidden>
      <rect x="0" y="0" width={W} height="80" rx="16" fill="#8fd694" />
      <line x1="24" y1="56" x2={W - 24} y2="56" stroke="#fff" strokeWidth="4" />
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={i}
          x1={24 + (i * (W - 48)) / 10}
          y1={i === 5 ? 44 : 50}
          x2={24 + (i * (W - 48)) / 10}
          y2="62"
          stroke="#fff"
          strokeWidth={i === 5 ? 4 : 2}
        />
      ))}
      <g className="quest-runner" style={{ transform: `translate(${ballX}px, 34px)` }}>
        <circle r="12" fill="#fff" stroke="#2b2540" strokeWidth="3" />
        <path d="M0 -6 l5 4 -2 6 h-6 l-2 -6z" fill="#2b2540" />
      </g>
      <text x={pos(line.value)} y="76" textAnchor="middle" className="kick-value">
        {dotted(line.value)}
      </text>
    </svg>
  );
}

function Balloon({ color, popped }: { color: string; popped: boolean }) {
  return (
    <svg viewBox="0 0 48 72" width="56" height="84" aria-hidden>
      {popped ? (
        <>
          <path
            d="M14 18 l6 6 M34 18 l-6 6 M24 10 v8 M10 30 h8 M30 30 h8"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M24 34 q-4 14 2 34" stroke="#2b2540" strokeWidth="2" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="24" cy="24" rx="18" ry="22" fill={color} stroke="#2b2540" strokeWidth="3" />
          <ellipse cx="17" cy="15" rx="5" ry="7" fill="#fff" opacity="0.5" />
          <path d="M21 46 h6 l-3 4 z" fill={color} stroke="#2b2540" strokeWidth="2" />
          <path d="M24 50 q-4 10 2 20" stroke="#2b2540" strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  );
}

/**
 * Ronde bertema Arena game Momo (D-115): balap mobil/perahu, dadu & domino, tendang penalti pembulatan, hoki nilai
 * tempat, dan pecahkan balon. Satu ronde satu pertanyaan (dibacakan Momo); jawaban tepat memajukan adegan. Tanpa
 * hitung mundur; ketukan keliru dihitung engine (`questReplay`).
 */
export function QuestGame({
  interaction: it,
  disabled,
  showAnswer,
  onDone,
}: {
  interaction: Quest;
  disabled: boolean;
  showAnswer: boolean;
  onDone: (taps: string[]) => void;
}) {
  const taps = useRef<string[]>([]);
  const [, setTick] = useState(0);
  const [wobble, setWobble] = useState<string>();
  /** Dadu/domino sudah dilempar; balon yang sudah dipecahkan (per ronde). */
  const [rolled, setRolled] = useState(false);
  const [popped, setPopped] = useState<number[]>([]);
  const [cheer, setCheer] = useState(0);
  const sayChoice = useSayChoice();
  useEffect(() => {
    taps.current = [];
    setTick((n) => n + 1);
  }, [it]);
  const r = questReplay(it.rounds, taps.current);
  const k = showAnswer ? it.rounds.length - 1 : Math.min(r.solved, it.rounds.length - 1);
  const round = it.rounds[k]!;
  const say = () => sayChoice({ id: round.id, say: round.say });

  useEffect(() => {
    setRolled(false);
    setPopped([]);
    setWobble(undefined);
    if (!r.done && !disabled) say();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]);

  const isDice = it.theme === 'dice' || it.theme === 'domino';
  const needPop = it.theme === 'balloon' && round.balloons ? round.balloons.pop : 0;
  const ready =
    showAnswer || ((!isDice || rolled) && (it.theme !== 'balloon' || popped.length >= needPop));

  const tap = (choiceId: string) => {
    if (disabled || r.done || showAnswer || !ready) return;
    const c = round.choices.find((x) => x.id === choiceId);
    if (c && it.theme !== 'kick') sayChoice(c);
    taps.current = [...taps.current, `${round.id}:${choiceId}`];
    const next = questReplay(it.rounds, taps.current);
    setTick((n) => n + 1);
    if (next.solved > r.solved) setCheer((n) => n + 1);
    if (next.done) {
      speak(t(`play.quest.done.${it.theme}`));
      return onDone(taps.current);
    }
    if (next.slips > r.slips) {
      setWobble(choiceId);
      if (gameOver(it, taps.current)) return onDone(taps.current);
      speak(t('play.quest.again'));
    }
  };

  const popBalloon = (i: number) => {
    if (disabled || showAnswer || popped.includes(i) || popped.length >= needPop) return;
    const next = [...popped, i];
    setPopped(next);
    speak(numberWord(next.length));
  };

  const solved = showAnswer ? it.rounds.length : r.solved;
  const scene = (() => {
    switch (it.theme) {
      case 'race':
      case 'boat':
        return <Track theme={it.theme} at={solved} total={it.rounds.length} />;
      case 'dice':
      case 'domino':
        return (
          <>
            <DiceBoard at={solved} total={it.rounds.length} />
            <button
              type="button"
              className={`quest-roll${ready ? ' is-rolled' : ''}`}
              disabled={disabled || r.done || ready}
              aria-label={t(it.theme === 'domino' ? 'play.quest.flip' : 'play.quest.roll')}
              onClick={() => {
                setRolled(true);
                speak(t(it.theme === 'domino' ? 'play.quest.flipped' : 'play.quest.rolled'));
              }}
            >
              {it.theme === 'domino' ? (
                ready ? (
                  <Domino a={round.dice![0]!} b={round.dice![1]!} />
                ) : (
                  <svg viewBox="0 0 128 64" width="120" height="60" aria-hidden>
                    <rect
                      x="3"
                      y="3"
                      width="122"
                      height="58"
                      rx="12"
                      fill="#b388ff"
                      stroke="#2b2540"
                      strokeWidth="4"
                    />
                    <text x="64" y="46" textAnchor="middle" className="domino-back">
                      ?
                    </text>
                  </svg>
                )
              ) : (
                round.dice!.map((d, i) =>
                  ready ? (
                    <Die key={i} value={d} color={ARENA_COLORS[i % ARENA_COLORS.length]!} />
                  ) : (
                    <Die key={i} value={0} color={ARENA_COLORS[(i + 3) % ARENA_COLORS.length]!} />
                  ),
                )
              )}
            </button>
          </>
        );
      case 'kick':
        return <KickLine line={round.line!} />;
      case 'hockey':
        return (
          <svg viewBox="0 0 320 54" className="quest-track" aria-hidden>
            <rect
              x="0"
              y="0"
              width="320"
              height="54"
              rx="16"
              fill="#e8f6ff"
              stroke="#2b2540"
              strokeWidth="3"
            />
            <line x1="160" y1="4" x2="160" y2="50" stroke="#ef476f" strokeWidth="3" />
            <circle cx="160" cy="27" r="12" fill="none" stroke="#4361ee" strokeWidth="3" />
            <rect
              x="286"
              y="12"
              width="26"
              height="30"
              rx="4"
              fill="none"
              stroke="#2b2540"
              strokeWidth="3"
            />
            <ellipse
              className="quest-runner"
              style={{ transform: `translate(${40 + (solved / it.rounds.length) * 250}px, 27px)` }}
              rx="12"
              ry="7"
              fill="#2b2540"
            />
          </svg>
        );
      case 'balloon':
        return (
          <div className="quest-balloons" role="group" aria-label={t('play.quest.balloons')}>
            {Array.from({ length: round.balloons!.n }, (_, i) => {
              const isPopped = showAnswer ? i < needPop : popped.includes(i);
              return (
                <button
                  key={`${round.id}-${i}`}
                  type="button"
                  className={`quest-balloon${isPopped ? ' is-popped' : ''}`}
                  disabled={disabled || isPopped || popped.length >= needPop}
                  aria-label={t('play.quest.pop')}
                  onClick={() => popBalloon(i)}
                >
                  <Balloon color={ARENA_COLORS[i % ARENA_COLORS.length]!} popped={isPopped} />
                </button>
              );
            })}
          </div>
        );
    }
  })();

  return (
    <div className={`arena-board quest-board is-${it.theme}`}>
      <div className="arena-call">
        <span className="kid-note">
          {t('play.quest.round', { n: k + 1, total: it.rounds.length })}
        </span>
        <p aria-live="polite">{round.text || t('play.bingo.listenFirst')}</p>
        <button type="button" className="g4-step" aria-label={t('play.bingo.listen')} onClick={say}>
          <Speaker />
        </button>
      </div>
      {scene}
      {cheer > 0 && !showAnswer && (
        <span key={cheer} className="arena-cheer" aria-hidden>
          <Burst />
        </span>
      )}
      {it.theme === 'balloon' && !showAnswer && (
        <p className="kid-note" aria-live="polite">
          {popped.length < needPop
            ? t('play.quest.popped', { n: popped.length })
            : t('play.quest.nowCount')}
        </p>
      )}
      {it.theme === 'hockey' ? (
        <div className="hockey-digits" role="group" aria-label={dotted(Number(round.digits))}>
          {/* Dikelompokkan per tiga angka (ribuan) agar bilangan panjang terlipat di titiknya. */}
          {groupsOf3(round.choices).map((group, gi, all) => (
            <span key={gi} className="hockey-group">
              {group.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`hockey-digit${wobble === c.id ? ' is-wobble' : ''}${showAnswer && c.id === round.answer ? ' is-answer' : ''}`}
                  disabled={disabled || r.done || showAnswer}
                  aria-label={c.say}
                  onClick={() => tap(c.id)}
                >
                  {c.visual.kind === 'numeral' ? c.visual.value : ''}
                </button>
              ))}
              {gi < all.length - 1 && (
                <span className="hockey-dot" aria-hidden>
                  .
                </span>
              )}
            </span>
          ))}
        </div>
      ) : (
        <div className={`quest-choices${it.theme === 'kick' ? ' is-goals' : ''}`}>
          {round.choices.map((c) => (
            <button
              key={`${round.id}${c.id}`}
              type="button"
              className={`paud-bubble quest-choice${wobble === c.id ? ' is-wobble' : ''}${showAnswer && c.id === round.answer ? ' is-answer' : ''}`}
              disabled={disabled || r.done || showAnswer || !ready}
              aria-label={it.theme === 'kick' ? t('play.quest.goal', { n: c.say ?? '' }) : c.say}
              onClick={() => tap(c.id)}
            >
              {it.theme === 'kick' && (
                <svg viewBox="0 0 60 34" width="60" height="34" aria-hidden className="kick-goal">
                  <path d="M4 32 V4 H56 V32" fill="none" stroke="#2b2540" strokeWidth="4" />
                  <path
                    d="M12 6 V32 M22 6 V32 M32 6 V32 M42 6 V32 M6 14 H54 M6 24 H54"
                    stroke="#9aa0a6"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
              {c.visual.kind === 'numeral' ? (
                <span className="quest-num">{dotted(c.visual.value)}</span>
              ) : (
                <VisualView
                  visual={c.visual}
                  size={it.theme === 'race' || it.theme === 'boat' ? 96 : 56}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
