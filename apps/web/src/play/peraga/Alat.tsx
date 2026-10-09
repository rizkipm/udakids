import { useEffect, useMemo, useState } from 'react';
import {
  numberWord,
  OBJECTS,
  peragaSteps,
  rupiahWord,
  SHAPES,
  SOLIDS,
  specSay,
  specVisual,
  type Peraga,
  type PeragaAlat,
  type ShapeId,
  type SolidId,
  type Spec,
} from '@little-coder/engine';
import { speak } from '../../audio/speech';
import { VisualView } from '../../components/visuals';
import { t } from '../../i18n';
import { PeragaEnd } from './Peraga';
import { PeragaPicture } from './photo';

/**
 * Alat peraga matematika (D-093): setiap langkah punya target; anak mencapainya dengan mengetuk (tanpa seret).
 * Saat target tercapai Momo membacakan `selesai`; langkah berikutnya terbuka. Tanpa nilai.
 */
type AlatData = Extract<Peraga, { tipe: 'alat' }>;

export function AlatPeraga({ data }: { data: AlatData }) {
  const steps = useMemo(
    () => peragaSteps(data.alat, data.langkah) as Record<string, unknown>[],
    [data.alat, data.langkah],
  );
  const [i, setI] = useState(-1);
  const [solved, setSolved] = useState(false);
  const step = i >= 0 ? steps[i] : undefined;
  const done = i >= steps.length;

  useEffect(() => speak(data.pengantar), [data.pengantar]);
  useEffect(() => {
    if (step) speak(step.suara as string);
  }, [step]);

  const onSolved = () => {
    if (solved) return;
    setSolved(true);
    speak(step!.selesai as string);
  };
  const next = () => {
    setSolved(false);
    setI(i + 1);
  };

  return (
    <div className="peraga">
      {data.foto && (
        <PeragaPicture foto={data.foto} alt={data.foto.label} className="peraga-hero" />
      )}
      {i < 0 && (
        <button type="button" className="kid-btn peraga-next" onClick={next}>
          {t('play.peraga.start')}
        </button>
      )}
      {step && (
        <div className="peraga-step" key={i}>
          <p className="peraga-hint">
            <span className="peraga-stepno">
              {t('play.peraga.step', { n: i + 1, of: steps.length })}
            </span>{' '}
            {step.teks as string}
          </p>
          <Tool alat={data.alat} step={step} solved={solved} onSolved={onSolved} />
          {solved && (
            <button type="button" className="kid-btn peraga-next" onClick={next}>
              {i === steps.length - 1 ? t('play.peraga.finish') : t('play.peraga.next')}
            </button>
          )}
        </div>
      )}
      {done && <PeragaEnd aha={data.aha} tutup={data.tutup} />}
    </div>
  );
}

type ToolProps<S> = { step: S; solved: boolean; onSolved: () => void };

function Tool({ alat, ...p }: { alat: PeragaAlat } & ToolProps<Record<string, unknown>>) {
  const props = p as ToolProps<never>;
  switch (alat) {
    case 'garis-bilangan':
      return <NumberLine {...props} />;
    case 'blok-puluhan':
      return <Blocks {...props} />;
    case 'benda':
      return <Things {...props} />;
    case 'uang':
      return <Money {...props} />;
    case 'jam':
      return <ClockTool {...props} />;
    case 'ukur':
      return <Ruler {...props} />;
    case 'timbangan':
      return <Balance {...props} />;
    case 'bangun':
      return <ShapeCount {...props} />;
    case 'pecahan':
      return <FractionTool {...props} />;
    default:
      return <PatternTool {...props} />;
  }
}

/** Tombol bulat besar (≥ 64 px). */
function Btn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="peraga-btn" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ------------------------------------------------------------ garis bilangan

function NumberLine({
  step,
  solved,
  onSolved,
}: ToolProps<{ min: number; max: number; dari: number; ubah: number; loncat: number }>) {
  const [at, setAt] = useState(step.dari);
  const target = step.dari + step.ubah;
  const span = step.max - step.min;
  // Tanda setiap `loncat`; label paling banyak ±11 supaya tetap terbaca di HP.
  const every = Math.max(step.loncat, Math.ceil(span / 10 / step.loncat) * step.loncat);
  const ticks: number[] = [];
  for (let v = step.min; v <= step.max; v += step.loncat) ticks.push(v);
  const x = (v: number) => 20 + ((v - step.min) / span) * 560;
  const move = (d: number) => {
    const n = Math.min(step.max, Math.max(step.min, at + d));
    setAt(n);
    speak(numberWord(n));
    if (n === target) onSolved();
  };
  return (
    <div className="peraga-tool">
      <svg
        viewBox="0 0 600 120"
        className="peraga-line"
        role="img"
        aria-label={`garis bilangan, di ${at}`}
      >
        <line
          x1={20}
          x2={580}
          y1={70}
          y2={70}
          stroke="#2b2540"
          strokeWidth={4}
          strokeLinecap="round"
        />
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={60} y2={80} stroke="#2b2540" strokeWidth={3} />
            {(v - step.min) % every === 0 || v === target ? (
              <text
                x={x(v)}
                y={106}
                textAnchor="middle"
                fontSize={18}
                fontWeight={800}
                fill={v === target && solved ? '#2e9e5b' : '#2b2540'}
              >
                {v}
              </text>
            ) : null}
          </g>
        ))}
        <circle cx={x(step.dari)} cy={70} r={7} fill="#f7c948" />
        <g style={{ transform: `translateX(${x(at)}px)`, transition: 'transform 0.35s ease' }}>
          <circle cx={0} cy={36} r={16} fill={solved ? '#2e9e5b' : '#5b3fd6'} />
          <text x={0} y={42} textAnchor="middle" fontSize={16} fontWeight={900} fill="#fff">
            {at}
          </text>
        </g>
      </svg>
      <div className="peraga-row">
        <Btn label={`− ${step.loncat}`} onClick={() => move(-step.loncat)} disabled={solved} />
        <span className="peraga-big">{at}</span>
        <Btn label={`+ ${step.loncat}`} onClick={() => move(step.loncat)} disabled={solved} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------ blok puluhan

function Blocks({ step, solved, onSolved }: ToolProps<{ target: number }>) {
  const [h, setH] = useState(0);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);
  const value = h * 100 + tens * 10 + ones;
  const change = (nh: number, nt: number, no: number) => {
    setH(nh);
    setTens(nt);
    setOnes(no);
    const v = nh * 100 + nt * 10 + no;
    speak(numberWord(v));
    if (v === step.target) onSolved();
  };
  return (
    <div className="peraga-tool">
      <div className="peraga-blocks" aria-label={`${h} ratusan, ${tens} puluhan, ${ones} satuan`}>
        {Array.from({ length: h }, (_, k) => (
          <span key={`h${k}`} className="pb-flat" />
        ))}
        <VisualView
          visual={{ kind: 'tens', tens: Math.min(tens, 10), ones: Math.min(ones, 19) }}
          size={160}
        />
      </div>
      <p className="peraga-big">{value}</p>
      <div className="peraga-row is-wrap">
        {step.target > 99 && (
          <>
            <Btn
              label={t('play.peraga.addHundred')}
              onClick={() => change(h + 1, tens, ones)}
              disabled={solved || h >= 9}
            />
            <Btn
              label={t('play.peraga.removeHundred')}
              onClick={() => change(h - 1, tens, ones)}
              disabled={solved || h === 0}
            />
          </>
        )}
        <Btn
          label={t('play.peraga.addTen')}
          onClick={() => change(h, tens + 1, ones)}
          disabled={solved || tens >= 10}
        />
        <Btn
          label={t('play.peraga.removeTen')}
          onClick={() => change(h, tens - 1, ones)}
          disabled={solved || tens === 0}
        />
        <Btn
          label={t('play.peraga.addOne')}
          onClick={() => change(h, tens, ones + 1)}
          disabled={solved || ones >= 19}
        />
        <Btn
          label={t('play.peraga.removeOne')}
          onClick={() => change(h, tens, ones - 1)}
          disabled={solved || ones === 0}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------ benda: hitung, tambah, kurang

function Things({
  step,
  solved,
  onSolved,
}: ToolProps<{ benda: string; a: number; b: number; op: '+' | '-' | '=' }>) {
  const [added, setAdded] = useState(0);
  const [gone, setGone] = useState<number[]>([]);
  const [counted, setCounted] = useState<number[]>([]);
  const name = OBJECTS[step.benda as keyof typeof OBJECTS].say;
  const total = step.op === '+' ? step.a + added : step.a;
  const result = step.op === '+' ? step.a + step.b : step.op === '-' ? step.a - step.b : step.a;
  const tapItem = (k: number) => {
    if (solved) return;
    if (step.op === '-') {
      if (gone.includes(k) || gone.length >= step.b) return;
      const g = [...gone, k];
      setGone(g);
      speak(t('play.peraga.taken', { n: numberWord(g.length) }));
      if (g.length === step.b) onSolved();
    } else if (step.op === '=') {
      if (counted.includes(k)) return;
      const c = [...counted, k];
      setCounted(c);
      speak(numberWord(c.length));
      if (c.length === step.a) onSolved();
    }
  };
  return (
    <div className="peraga-tool">
      <div className="peraga-things">
        {Array.from({ length: total }, (_, k) => (
          <button
            key={k}
            type="button"
            className={`peraga-thing${gone.includes(k) ? ' is-gone' : ''}${counted.includes(k) ? ' is-counted' : ''}${k >= step.a ? ' is-new' : ''}`}
            onClick={() => tapItem(k)}
            aria-label={name}
          >
            <VisualView visual={{ kind: 'object', object: step.benda as never }} size={56} />
            {counted.includes(k) && <span className="peraga-badge">{counted.indexOf(k) + 1}</span>}
          </button>
        ))}
      </div>
      {step.op === '+' && (
        <div className="peraga-row">
          <Btn
            label={t('play.peraga.addThing', { name })}
            onClick={() => {
              const n = added + 1;
              setAdded(n);
              speak(numberWord(step.a + n));
              if (n === step.b) onSolved();
            }}
            disabled={solved || added >= step.b}
          />
        </div>
      )}
      {solved && (
        <p className="peraga-big">
          {step.op === '='
            ? step.a
            : `${step.a} ${step.op === '+' ? '+' : '−'} ${step.b} = ${result}`}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------ uang

function Money({ step, solved, onSolved }: ToolProps<{ target: number; pecahan: number[] }>) {
  const [paid, setPaid] = useState<number[]>([]);
  const sum = paid.reduce((a, b) => a + b, 0);
  const pay = (next: number[]) => {
    setPaid(next);
    const s = next.reduce((a, b) => a + b, 0);
    speak(rupiahWord(s));
    if (s === step.target) onSolved();
  };
  const vis = (v: number) =>
    v >= 1000 && v !== 1000
      ? ({ kind: 'note', value: v } as const)
      : ({ kind: 'coin', value: v } as const);
  return (
    <div className="peraga-tool">
      <p className="peraga-big">
        {`Rp${sum.toLocaleString('id-ID')} / Rp${step.target.toLocaleString('id-ID')}`}
      </p>
      <div className="peraga-tray" aria-label={t('play.peraga.paid')}>
        {paid.map((v, k) => (
          <button
            key={k}
            type="button"
            className="peraga-money is-paid"
            disabled={solved}
            onClick={() => pay(paid.filter((_, j) => j !== k))}
            aria-label={rupiahWord(v)}
          >
            <VisualView visual={vis(v) as never} size={64} />
          </button>
        ))}
      </div>
      <div className="peraga-row is-wrap">
        {step.pecahan.map((v) => (
          <button
            key={v}
            type="button"
            className="peraga-money"
            disabled={solved || sum + v > step.target * 2}
            onClick={() => pay([...paid, v])}
            aria-label={rupiahWord(v)}
          >
            <VisualView visual={vis(v) as never} size={80} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ jam

function ClockTool({ step, solved, onSolved }: ToolProps<{ jam: number; menit: number }>) {
  const [h, setH] = useState(12);
  const [m, setM] = useState(0);
  const set = (nh: number, nm: number) => {
    const hh = ((nh - 1 + 12) % 12) + 1;
    const mm = (nm + 60) % 60;
    setH(hh);
    setM(mm);
    if (hh === step.jam && mm === step.menit) onSolved();
  };
  return (
    <div className="peraga-tool">
      <VisualView visual={{ kind: 'clock', hour: h, minute: m }} size={200} />
      <p className="peraga-big">{`${h}.${String(m).padStart(2, '0')}`}</p>
      <div className="peraga-row is-wrap">
        <Btn label={t('play.peraga.hourMinus')} onClick={() => set(h - 1, m)} disabled={solved} />
        <Btn label={t('play.peraga.hourPlus')} onClick={() => set(h + 1, m)} disabled={solved} />
        <Btn label={t('play.peraga.minuteMinus')} onClick={() => set(h, m - 5)} disabled={solved} />
        <Btn label={t('play.peraga.minutePlus')} onClick={() => set(h, m + 5)} disabled={solved} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------ penggaris

function Ruler({
  step,
  solved,
  onSolved,
}: ToolProps<{ benda: string; panjang: number; satuan: string }>) {
  const [wiggle, setWiggle] = useState<number>();
  const max = Math.max(10, step.panjang + 2);
  const unit = 560 / max;
  return (
    <div className="peraga-tool">
      <svg
        viewBox="0 0 600 150"
        className="peraga-line"
        role="img"
        aria-label={OBJECTS[step.benda as keyof typeof OBJECTS].say}
      >
        <foreignObject x={20} y={0} width={step.panjang * unit} height={70}>
          <div className="peraga-measured">
            <VisualView
              visual={{ kind: 'object', object: step.benda as never, scaleX: 1.6 }}
              size={64}
            />
          </div>
        </foreignObject>
        <rect
          x={20}
          y={80}
          width={max * unit}
          height={34}
          rx={6}
          fill="#fff3c4"
          stroke="#2b2540"
          strokeWidth={3}
        />
        {Array.from({ length: max + 1 }, (_, k) => (
          <line
            key={k}
            x1={20 + k * unit}
            x2={20 + k * unit}
            y1={80}
            y2={98}
            stroke="#2b2540"
            strokeWidth={2}
          />
        ))}
        <line
          x1={20}
          x2={20}
          y1={0}
          y2={80}
          stroke="#5b3fd6"
          strokeDasharray="4 4"
          strokeWidth={2}
        />
      </svg>
      <div className="peraga-row is-wrap">
        {Array.from({ length: max }, (_, k) => k + 1).map((v) => (
          <button
            key={v}
            type="button"
            className={`peraga-num${solved && v === step.panjang ? ' is-right' : ''}${wiggle === v ? ' is-wiggle' : ''}`}
            disabled={solved}
            onClick={() => {
              if (v === step.panjang) {
                speak(`${numberWord(v)} ${step.satuan === 'cm' ? 'sentimeter' : step.satuan}`);
                onSolved();
              } else {
                setWiggle(v);
                setTimeout(() => setWiggle(undefined), 600);
                speak(t('play.peraga.measureHint'));
              }
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ timbangan

function Balance({
  step,
  solved,
  onSolved,
}: ToolProps<{
  kiri: { benda: string; jumlah: number; berat: number };
  kanan: { benda: string; jumlah: number; berat: number };
}>) {
  const [wiggle, setWiggle] = useState<string>();
  const wl = step.kiri.jumlah * step.kiri.berat;
  const wr = step.kanan.jumlah * step.kanan.berat;
  const answer = wl > wr ? 'kiri' : wr > wl ? 'kanan' : 'sama';
  const tilt = solved ? (answer === 'kiri' ? -8 : answer === 'kanan' ? 8 : 0) : 0;
  const pick = (side: string) => {
    if (side === answer) onSolved();
    else {
      setWiggle(side);
      setTimeout(() => setWiggle(undefined), 600);
      speak(t('play.peraga.balanceHint'));
    }
  };
  const pan = (x: { benda: string; jumlah: number }) => (
    <div className="peraga-pan">
      <VisualView
        visual={{
          kind: 'objects',
          object: x.benda as never,
          count: x.jumlah,
          layout: x.jumlah <= 5 ? 'row' : 'rows',
        }}
        size={110}
      />
    </div>
  );
  return (
    <div className="peraga-tool">
      <div className="peraga-balance" style={{ ['--tilt' as string]: `${tilt}deg` }}>
        {pan(step.kiri)}
        {pan(step.kanan)}
      </div>
      <div className="peraga-row is-wrap">
        {(['kiri', 'sama', 'kanan'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`peraga-btn${wiggle === s ? ' is-wiggle' : ''}`}
            disabled={solved}
            onClick={() => pick(s)}
          >
            {t(
              s === 'kiri'
                ? 'play.peraga.heavyLeft'
                : s === 'kanan'
                  ? 'play.peraga.heavyRight'
                  : 'play.peraga.heavySame',
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ bangun: hitung sisi / sudut

/** Sisi (bidang) dan titik sudut bangun ruang. */
const SOLID_COUNT: Record<SolidId, { sisi: number; sudut: number }> = {
  kubus: { sisi: 6, sudut: 8 },
  balok: { sisi: 6, sudut: 8 },
  tabung: { sisi: 3, sudut: 0 },
  kerucut: { sisi: 2, sudut: 1 },
  bola: { sisi: 1, sudut: 0 },
};

function ShapeCount({
  step,
  solved,
  onSolved,
}: ToolProps<{ bangun: string; hitung: 'sisi' | 'sudut' }>) {
  const solid = step.bangun in SOLIDS;
  const total = solid
    ? SOLID_COUNT[step.bangun as SolidId][step.hitung]
    : SHAPES[step.bangun as ShapeId].sides;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (total === 0) onSolved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);
  return (
    <div className="peraga-tool">
      <button
        type="button"
        className="peraga-shape"
        disabled={solved}
        onClick={() => {
          const k = n + 1;
          setN(k);
          speak(numberWord(k));
          if (k === total) onSolved();
        }}
        aria-label={t('play.peraga.countTap')}
      >
        <VisualView
          visual={
            solid
              ? { kind: 'solid', solid: step.bangun as SolidId, color: 'biru' }
              : { kind: 'shape', shape: step.bangun as ShapeId, color: 'oranye', size: 'l' }
          }
          size={200}
        />
      </button>
      <p className="peraga-big">{`${n} ${step.hitung}`}</p>
      <p className="peraga-note">{t('play.peraga.countTap')}</p>
    </div>
  );
}

// ------------------------------------------------------------ pecahan

function FractionTool({
  step,
  solved,
  onSolved,
}: ToolProps<{ penyebut: number; pembilang: number; model: 'bar' | 'circle' }>) {
  const [on, setOn] = useState<number[]>([]);
  const toggle = (k: number) => {
    if (solved) return;
    const next = on.includes(k) ? on.filter((x) => x !== k) : [...on, k];
    setOn(next);
    speak(`${numberWord(next.length)} per ${numberWord(step.penyebut)}`);
    if (next.length === step.pembilang) onSolved();
  };
  const d = step.penyebut;
  return (
    <div className="peraga-tool">
      {step.model === 'bar' ? (
        <div className="peraga-bar" style={{ gridTemplateColumns: `repeat(${d}, 1fr)` }}>
          {Array.from({ length: d }, (_, k) => (
            <button
              key={k}
              type="button"
              className={on.includes(k) ? 'is-on' : undefined}
              onClick={() => toggle(k)}
              aria-label={`bagian ${k + 1}`}
            />
          ))}
        </div>
      ) : (
        <svg
          viewBox="-110 -110 220 220"
          className="peraga-pie"
          role="group"
          aria-label={`lingkaran ${d} bagian`}
        >
          {Array.from({ length: d }, (_, k) => {
            const a0 = (k / d) * 2 * Math.PI - Math.PI / 2;
            const a1 = ((k + 1) / d) * 2 * Math.PI - Math.PI / 2;
            const p = (a: number) => `${100 * Math.cos(a)} ${100 * Math.sin(a)}`;
            return (
              <path
                key={k}
                d={`M0 0 L${p(a0)} A100 100 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`}
                className={on.includes(k) ? 'is-on' : undefined}
                onClick={() => toggle(k)}
                role="button"
                aria-label={`bagian ${k + 1}`}
              />
            );
          })}
        </svg>
      )}
      <p className="peraga-big">{`${on.length}/${d}`}</p>
    </div>
  );
}

// ------------------------------------------------------------ pola

function PatternTool({
  step,
  solved,
  onSolved,
}: ToolProps<{ urutan: Spec[]; pilihan: Spec[]; jawaban: number }>) {
  const [wiggle, setWiggle] = useState<number>();
  return (
    <div className="peraga-tool">
      <div className="peraga-row is-wrap">
        {step.urutan.map((s, k) => (
          <span key={k} className="peraga-patt">
            <VisualView visual={specVisual(s)} size={56} />
          </span>
        ))}
        <span className="peraga-patt is-blank">
          {solved ? <VisualView visual={specVisual(step.pilihan[step.jawaban]!)} size={56} /> : '?'}
        </span>
      </div>
      <div className="peraga-row is-wrap">
        {step.pilihan.map((s, k) => (
          <button
            key={k}
            type="button"
            className={`peraga-choice${wiggle === k ? ' is-wiggle' : ''}`}
            disabled={solved}
            onClick={() => {
              speak(specSay(s));
              if (k === step.jawaban) onSolved();
              else {
                setWiggle(k);
                setTimeout(() => setWiggle(undefined), 600);
              }
            }}
          >
            <VisualView visual={specVisual(s)} size={72} />
          </button>
        ))}
      </div>
    </div>
  );
}
