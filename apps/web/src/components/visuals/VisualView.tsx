import type { ReactNode } from 'react';
import { buildExtra } from './extra';
import { buildFigure } from './figure';
import {
  BODY_PARTS,
  OBJECTS,
  SAY_COLOR,
  SENSES,
  SHAPES,
  SOLIDS,
  type Color,
  type ObjectId,
  type Relation,
  type Visual,
} from '@little-coder/engine';
import { Blob, Cuboid, LINE } from './draw';
import { layoutCells, type CellLayout } from './layout';
import { OBJECT_ART, STRETCH_ART, isStretchable, type StretchArt } from './objects';
import { FONT, OUTLINE, PALETTE, TOKENS, shade } from './palette';
import { Coin, FlatShape, SolidShape } from './shapes';
import { BodyFigure } from './objects-esc';
import { Fingers, fingersSize } from './hands';
import { Banknote, GlyphLines, glyphBox } from './notes';
import { FACE_H, FACE_W, FaceFigure, SenseIcon } from './senses';

export type VisualViewProps = {
  visual: Visual;
  /** Tinggi gambar dalam px (lebar mengikuti rasio tiap jenis). Default 160. */
  size?: number;
  /** "Hitung bersama": item berindeks < countStep disorot; item ke-countStep diberi angka. */
  countStep?: number;
};

type Built = { w: number; h: number; body: ReactNode; label: string };

const SIZE_WORD = { s: 'kecil', m: 'sedang', l: 'besar' } as const;
const REL_WORD: Record<Relation, string> = {
  'in-front': 'di depan',
  behind: 'di belakang',
  inside: 'di dalam',
  outside: 'di luar',
  above: 'di atas',
  below: 'di bawah',
  beside: 'di samping',
};

const say = (id: ObjectId) => OBJECTS[id].say;
const range = (n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => i);

const Text = ({
  x,
  y,
  size,
  children,
  fill = OUTLINE,
  weight = 700,
}: {
  x: number;
  y: number;
  size: number;
  children: ReactNode;
  fill?: string;
  weight?: number;
}) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    dominantBaseline="central"
    fontFamily={FONT}
    fontWeight={weight}
    fontSize={size}
    fill={fill}
  >
    {children}
  </text>
);

// ---------------------------------------------------------------------------------------------
// Sel yang bisa dihitung (benda, titik, kubus, bingkai, bangun)

type CellOpts = { crossed?: number; countStep?: number };
const CELL = 100;
const PAD = 22;

function renderCells(items: ReactNode[], L: CellLayout, opts: CellOpts, offset = PAD): ReactNode {
  const n = items.length;
  const crossedFrom = opts.crossed ? n - Math.min(n, opts.crossed) : n;
  const step = opts.countStep;
  const cells = items.map((node, i) => {
    const p = L.pts[i] ?? { x: 0, y: 0 };
    const x = offset + p.x * CELL;
    const y = offset + p.y * CELL;
    const lit = step !== undefined && i < step;
    const faded = i >= crossedFrom;
    return (
      <g
        key={i}
        transform={`translate(${round(x)} ${round(y)})`}
        data-crossed={faded || undefined}
        data-counted={lit || undefined}
      >
        {lit && (
          <circle
            cx={50}
            cy={50}
            r={52}
            fill={TOKENS.glow}
            opacity={0.65}
            stroke={TOKENS.glowEdge}
            strokeWidth={4}
          />
        )}
        <g
          opacity={faded ? 0.35 : 1}
          transform={lit ? 'translate(50 50) scale(1.07) translate(-50 -50)' : undefined}
        >
          {node}
        </g>
        {faded && (
          <line
            x1={10}
            y1={10}
            x2={90}
            y2={90}
            stroke={OUTLINE}
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
      </g>
    );
  });
  let badge: ReactNode = null;
  if (step !== undefined && step >= 1 && step <= n) {
    const p = L.pts[step - 1] ?? { x: 0, y: 0 };
    const bx = offset + p.x * CELL + 88;
    const by = offset + p.y * CELL + 10;
    badge = (
      <g data-count-badge={step}>
        <circle
          cx={round(bx)}
          cy={round(by)}
          r={20}
          fill={OUTLINE}
          stroke="#ffffff"
          strokeWidth={3}
        />
        <Text x={round(bx)} y={round(by) + 1} size={24} fill="#ffffff" weight={800}>
          {step}
        </Text>
      </g>
    );
  }
  return (
    <>
      {cells}
      {badge}
    </>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;

function cellGrid(items: ReactNode[], L: CellLayout, opts: CellOpts, label: string): Built {
  return {
    w: L.w * CELL + PAD * 2,
    h: L.h * CELL + PAD * 2,
    body: renderCells(items, L, opts),
    label,
  };
}

/** Letak mata dadu 1–6 (pola dadu asli) di kotak 100×100. */
const DIE_PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [30, 30],
    [70, 70],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [30, 30],
    [70, 30],
    [30, 70],
    [70, 70],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [30, 26],
    [70, 26],
    [30, 50],
    [70, 50],
    [30, 74],
    [70, 74],
  ],
};

const Dot = () => <circle cx={50} cy={50} r={34} fill={TOKENS.dot} {...LINE} />;

function Cube({ color }: { color: Color }) {
  const c = PALETTE[color];
  return (
    <g>
      <rect x={3} y={3} width={94} height={94} rx={8} fill={c.fill} {...LINE} strokeWidth={3.5} />
      <rect x={14} y={11} width={72} height={10} rx={5} fill={c.light} opacity={0.8} />
      <circle cx={50} cy={57} r={16} fill={c.dark} opacity={0.35} />
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Adegan posisi

const SW = 260;
const SH = 184;
const G = 160;
const CARDBOARD = '#d9a066';
const WOOD = '#c98a4b';

function Placed({ id, cx, bottom, s }: { id: ObjectId; cx: number; bottom: number; s: number }) {
  const Art = OBJECT_ART[id];
  return (
    <g transform={`translate(${round(cx - s / 2)} ${round(bottom - s * 0.94)}) scale(${s / 100})`}>
      <Art />
    </g>
  );
}

const Shadow = ({ cx, s, y = G }: { cx: number; s: number; y?: number }) => (
  <ellipse cx={cx} cy={y} rx={s * 0.34} ry={4} fill={OUTLINE} opacity={0.14} />
);

type SceneRef = { back?: ReactNode; front: ReactNode; cx: number; top: number };

function sceneRef(reference: ObjectId, open: boolean): SceneRef {
  if (reference === 'kotak') {
    const side = shade(CARDBOARD, -0.22);
    if (open) {
      return {
        cx: 137,
        top: 92,
        back: (
          <g>
            <polygon
              points="110,84.6 186,84.6 194,62 118,62"
              fill={shade(CARDBOARD, 0.2)}
              {...LINE}
            />
            <polygon points="88,100 110,84.6 94,70 68,86" fill={shade(CARDBOARD, 0.1)} {...LINE} />
            <polygon
              points="88,100 110,84.6 186,84.6 164,100"
              fill={shade(CARDBOARD, -0.5)}
              {...LINE}
            />
          </g>
        ),
        front: (
          <g>
            <polygon points="164,100 186,84.6 186,144.6 164,160" fill={side} {...LINE} />
            <rect x={88} y={100} width={76} height={60} fill={CARDBOARD} {...LINE} />
            <polygon
              points="88,100 164,100 170,109 82,109"
              fill={shade(CARDBOARD, 0.25)}
              {...LINE}
            />
          </g>
        ),
      };
    }
    return {
      cx: 137,
      top: 92,
      front: (
        <g>
          <Cuboid x={88} y={100} w={76} h={60} d={22} fill={CARDBOARD} />
          <polygon points="122,100 144,84.6 152,84.6 130,100" fill={shade(CARDBOARD, -0.25)} />
          <rect x={122} y={100} width={8} height={18} fill={shade(CARDBOARD, -0.25)} />
        </g>
      ),
    };
  }
  if (reference === 'meja') {
    const leg = shade(WOOD, -0.2);
    return {
      cx: 130,
      top: 91,
      front: (
        <g>
          <rect x={58} y={100} width={11} height={60} rx={2} fill={leg} {...LINE} />
          <rect x={191} y={100} width={11} height={60} rx={2} fill={leg} {...LINE} />
          <rect x={64} y={100} width={132} height={13} fill={shade(WOOD, -0.1)} {...LINE} />
          <rect x={48} y={91} width={164} height={12} rx={3} fill={WOOD} {...LINE} />
        </g>
      ),
    };
  }
  if (reference === 'pohon') {
    const leaf = '#3fae5a';
    return {
      cx: 130,
      top: 44,
      front: (
        <g>
          <rect x={117} y={92} width={26} height={69} rx={4} fill="#9a6232" {...LINE} />
          <Blob
            circles={[
              [130, 76, 32],
              [100, 94, 24],
              [160, 94, 24],
            ]}
            fill={leaf}
          />
          <circle cx={118} cy={64} r={6} fill="#ffffff" opacity={0.3} />
        </g>
      ),
    };
  }
  return { cx: 130, top: G - 98, front: <Placed id={reference} cx={130} bottom={G} s={110} /> };
}

function buildScene(relation: Relation, subject: ObjectId, reference: ObjectId): Built {
  const isBox = reference === 'kotak';
  const tree = reference === 'pohon';
  const table = reference === 'meja';
  const ref = sceneRef(reference, isBox && (relation === 'inside' || relation === 'outside'));
  const subj = (cx: number, bottom: number, s: number, shadow = true) => (
    <g data-role="subject">
      {shadow && <Shadow cx={cx} s={s} y={bottom} />}
      <Placed id={subject} cx={cx} bottom={bottom} s={s} />
    </g>
  );
  const refLayer = (dx = 0, dy = 0) => (
    <g transform={dx || dy ? `translate(${dx} ${dy})` : undefined} data-role="reference">
      {ref.back}
      {ref.front}
    </g>
  );
  let layers: ReactNode;
  switch (relation) {
    case 'in-front':
      layers = (
        <>
          {refLayer()}
          {subj(ref.cx, G + 14, 72)}
        </>
      );
      break;
    case 'behind': {
      const [cx, bottom, s] = isBox
        ? [ref.cx + 34, 104, 62]
        : table
          ? [150, 124, 62]
          : tree
            ? [160, 134, 56]
            : [ref.cx + 36, G - 28, 60];
      layers = (
        <>
          {subj(cx, bottom, s)}
          {refLayer()}
        </>
      );
      break;
    }
    case 'inside':
      layers = isBox ? (
        <>
          <g data-role="reference">{ref.back}</g>
          {subj(134, 112, 58, false)}
          <g data-role="reference">{ref.front}</g>
        </>
      ) : (
        <>
          {refLayer()}
          {subj(ref.cx, G - 20, 46, false)}
        </>
      );
      break;
    case 'outside':
    case 'beside':
      layers = (
        <>
          {refLayer(-36)}
          {subj(224, G, 58)}
        </>
      );
      break;
    case 'above': {
      const s = isBox ? 60 : table ? 62 : tree ? 42 : 50;
      layers = (
        <>
          {refLayer()}
          {subj(ref.cx, ref.top + 1, s, false)}
        </>
      );
      break;
    }
    case 'below':
      if (table)
        layers = (
          <>
            {subj(130, G, 48)}
            {refLayer()}
          </>
        );
      else if (tree)
        layers = (
          <>
            {refLayer()}
            {subj(172, G, 42)}
          </>
        );
      else
        layers = (
          <>
            <g data-role="shelf">
              <rect
                x={80}
                y={100}
                width={9}
                height={60}
                rx={2}
                fill={shade(WOOD, -0.2)}
                {...LINE}
              />
              <rect
                x={188}
                y={100}
                width={9}
                height={60}
                rx={2}
                fill={shade(WOOD, -0.2)}
                {...LINE}
              />
              <rect x={70} y={92} width={138} height={9} rx={3} fill={WOOD} {...LINE} />
            </g>
            {refLayer(0, -68)}
            {subj(137, G, 54)}
          </>
        );
      break;
  }
  return {
    w: SW,
    h: SH,
    label: `${say(subject)} ${REL_WORD[relation]} ${say(reference)}`,
    body: (
      <>
        <rect x={0} y={G} width={SW} height={SH - G} fill={TOKENS.ground} />
        <line x1={0} y1={G} x2={SW} y2={G} stroke={TOKENS.groundLine} strokeWidth={3} />
        {layers}
      </>
    ),
  };
}

// ---------------------------------------------------------------------------------------------

const card = (w: number, h: number, dashed = false) => (
  <rect
    x={4}
    y={4}
    width={w - 8}
    height={h - 8}
    rx={20}
    fill={dashed ? TOKENS.blankFill : TOKENS.card}
    stroke={dashed ? TOKENS.muted : OUTLINE}
    strokeWidth={dashed ? 4 : 3}
    strokeDasharray={dashed ? '12 9' : undefined}
  />
);

const fmt = (n: number) => String(n).replace('-', '−');

function build(v: Visual, countStep?: number): Built {
  switch (v.kind) {
    case 'text':
    case 'fraction':
    case 'table':
    case 'bar-chart':
    case 'rect':
    case 'cuboid':
    case 'angle':
    case 'clock':
    case 'digital':
    case 'tens':
    case 'number-chart':
    case 'venn':
    case 'measure':
      return buildExtra(v);
    case 'figure':
      return buildFigure(v);
    case 'puzzle': {
      // Puzzle (D-078): gambar utuh dengan lubang kepingan, atau satu kepingan saja.
      if (v.picture.kind !== 'object') return build(v.picture, countStep);
      const Art = OBJECT_ART[v.picture.object];
      const name = say(v.picture.object);
      const w = 100 / v.cols;
      const h = 100 / v.rows;
      const x = (v.index % v.cols) * w;
      const y = Math.floor(v.index / v.cols) * h;
      if (v.show === 'holed')
        return {
          w: 100,
          h: 100,
          label: `gambar ${name}, satu kepingan hilang`,
          body: (
            <g>
              <rect
                x={0}
                y={0}
                width={100}
                height={100}
                rx={4}
                fill="#fffaf0"
                stroke={OUTLINE}
                strokeWidth={2}
              />
              <Art color={v.picture.color} />
              <rect
                x={x + 1}
                y={y + 1}
                width={w - 2}
                height={h - 2}
                rx={3}
                fill="#ffffff"
                stroke={TOKENS.muted}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            </g>
          ),
        };
      return {
        w,
        h,
        label: `kepingan gambar ${name}`,
        body: (
          <g>
            <svg x={0} y={0} width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`}>
              <rect x={x} y={y} width={w} height={h} fill="#fffaf0" />
              <Art color={v.picture.color} />
            </svg>
            <rect
              x={0.75}
              y={0.75}
              width={w - 1.5}
              height={h - 1.5}
              rx={2}
              fill="none"
              stroke={OUTLINE}
              strokeWidth={1.5}
            />
          </g>
        ),
      };
    }
    case 'objects': {
      const L = layoutCells(v.count, v.layout, v.object);
      const Art = OBJECT_ART[v.object];
      const items = range(v.count).map((i) => <Art key={i} color={v.color} />);
      const color = v.color ? ` ${SAY_COLOR[v.color]}` : '';
      const crossed = v.crossed ? `, ${v.crossed} dicoret` : '';
      return cellGrid(
        items,
        L,
        { crossed: v.crossed, countStep },
        `${v.count} ${say(v.object)}${color}${crossed}`,
      );
    }
    case 'mixed': {
      const queues = v.parts.map((p) => range(p.count).map(() => p.object));
      const seq: ObjectId[] = [];
      for (let i = 0; queues.some((q) => q.length > 0); i++) {
        const q = queues[i % queues.length];
        const next = q?.shift();
        if (next) seq.push(next);
      }
      const key = v.parts.map((p) => `${p.object}${p.count}`).join('|');
      const L = layoutCells(seq.length, 'scatter', key);
      const items = seq.map((id, i) => {
        const Art = OBJECT_ART[id];
        return <Art key={i} />;
      });
      return cellGrid(
        items,
        L,
        { countStep },
        v.parts.map((p) => `${p.count} ${say(p.object)}`).join(' dan '),
      );
    }
    case 'dots': {
      const L = layoutCells(v.count, v.layout, 'dots');
      return cellGrid(
        range(v.count).map((i) => <Dot key={i} />),
        L,
        { countStep },
        `${v.count} titik`,
      );
    }
    case 'shapes': {
      const L = layoutCells(v.items.length, v.layout, v.items.map((s) => s.shape).join());
      return cellGrid(
        v.items.map((s, i) => <FlatShape key={i} shape={s.shape} color={s.color} size="l" />),
        L,
        { countStep },
        v.items.map((s) => `${SHAPES[s.shape].say} ${SAY_COLOR[s.color]}`).join(', '),
      );
    }
    case 'cubes': {
      const pts: { x: number; y: number }[] = [];
      const items: ReactNode[] = [];
      let k = 0;
      let rowGaps = 0;
      let lastRow = -1;
      v.counts.forEach((count, seg) => {
        const color = v.colors[seg] ?? v.colors[0] ?? 'merah';
        for (let j = 0; j < count; j++, k++) {
          const row = Math.floor(k / 10);
          if (row !== lastRow) {
            lastRow = row;
            rowGaps = 0;
          } else if (j === 0 && v.separated) rowGaps++;
          pts.push({ x: (k % 10) + rowGaps * 0.4, y: row * 1.2 });
          items.push(<Cube key={k} color={color} />);
        }
      });
      const L: CellLayout = {
        pts,
        w: Math.max(1, ...pts.map((p) => p.x + 1)),
        h: Math.max(1, ...pts.map((p) => p.y + 1)),
      };
      const crossed = v.crossed ? `, ${v.crossed} dicoret` : '';
      return cellGrid(items, L, { crossed: v.crossed, countStep }, `${k} kubus${crossed}`);
    }
    case 'frame': {
      const rows = v.size / 5;
      const cellPts = range(v.size).map((i) => {
        const r = Math.floor(i / 5);
        return { x: i % 5, y: r + (r >= 2 ? 0.3 : 0) };
      });
      const filled = Math.min(v.filled, v.size);
      const L: CellLayout = {
        pts: cellPts.slice(0, filled),
        w: 5,
        h: rows + (rows > 2 ? 0.3 : 0),
      };
      const frame = cellPts.map((p, i) => (
        <rect
          key={i}
          x={PAD + p.x * CELL}
          y={round(PAD + p.y * CELL)}
          width={CELL}
          height={CELL}
          fill="#ffffff"
          stroke={OUTLINE}
          strokeWidth={4}
        />
      ));
      return {
        w: L.w * CELL + PAD * 2,
        h: L.h * CELL + PAD * 2,
        label: `bingkai ${v.size} berisi ${v.filled} titik`,
        body: (
          <>
            {frame}
            {renderCells(
              range(filled).map((i) => <Dot key={i} />),
              L,
              { countStep },
            )}
          </>
        ),
      };
    }
    case 'numeral': {
      const text = fmt(v.value);
      const w = Math.max(120, 44 + text.length * 56);
      return {
        w,
        h: 120,
        label: `angka ${v.value}`,
        body: (
          <>
            {card(w, 120)}
            <Text x={w / 2} y={64} size={88} weight={800}>
              {text}
            </Text>
          </>
        ),
      };
    }
    case 'blank':
      return {
        w: 120,
        h: 120,
        label: 'kotak kosong',
        body: (
          <>
            {card(120, 120, true)}
            <Text x={60} y={64} size={76} fill={TOKENS.muted} weight={800}>
              ?
            </Text>
          </>
        ),
      };
    case 'shape':
      return {
        w: 100,
        h: 100,
        label: `${SHAPES[v.shape].say} ${SAY_COLOR[v.color]} ${SIZE_WORD[v.size]}`,
        body: <FlatShape shape={v.shape} color={v.color} size={v.size} rotate={v.rotate} />,
      };
    case 'sense':
      return {
        w: 100,
        h: 100,
        label: `${SENSES[v.sense].say}, ${SENSES[v.sense].indra}`,
        body: <SenseIcon sense={v.sense} />,
      };
    case 'face':
      return {
        w: FACE_W,
        h: FACE_H,
        label: v.sense ? `wajah anak, ${SENSES[v.sense].say} ditandai` : 'wajah anak',
        body: <FaceFigure sense={v.sense} />,
      };
    case 'body':
      return {
        w: 120,
        h: 160,
        label: v.part ? `anak, ${BODY_PARTS[v.part]} ditandai` : 'anak berdiri',
        body: <BodyFigure part={v.part} />,
      };
    case 'fingers':
      return {
        ...fingersSize(v.count),
        label: `${v.count} jari`,
        body: <Fingers count={v.count} tone={v.tone} split={v.split} mirror={v.mirror} />,
      };
    case 'die': {
      const fill = v.color ? PALETTE[v.color].fill : '#ffffff';
      const pip = v.color ? '#ffffff' : OUTLINE;
      return {
        w: 100,
        h: 100,
        label: `dadu bermata ${v.value}`,
        body: (
          <>
            <rect
              x={6}
              y={6}
              width={88}
              height={88}
              rx={18}
              fill={fill}
              {...LINE}
              strokeWidth={4}
            />
            {(DIE_PIPS[v.value] ?? []).map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={8.5} fill={pip} />
            ))}
          </>
        ),
      };
    }
    case 'solid':
      return {
        w: 100,
        h: 100,
        label: `${SOLIDS[v.solid].say} ${SAY_COLOR[v.color]}`,
        body: <SolidShape solid={v.solid} color={v.color} />,
      };
    case 'note':
      return {
        w: 200,
        h: 100,
        label: `uang kertas ${v.value} rupiah`,
        body: <Banknote value={v.value} />,
      };
    case 'glyph':
      return {
        ...glyphBox(v.glyph),
        label: `garis ${v.glyph}`,
        body: <GlyphLines glyph={v.glyph} />,
      };
    case 'coin':
      return { w: 100, h: 100, label: `koin ${v.value} rupiah`, body: <Coin value={v.value} /> };
    case 'swatch':
      return {
        w: 100,
        h: 100,
        label: `warna ${SAY_COLOR[v.color]}`,
        body: (
          <rect
            x={10}
            y={10}
            width={80}
            height={80}
            rx={18}
            fill={PALETTE[v.color].fill}
            {...LINE}
          />
        ),
      };
    case 'object': {
      const label = `${say(v.object)}${v.color ? ` ${SAY_COLOR[v.color]}` : ''}`;
      const Art = OBJECT_ART[v.object];
      if (v.scaleX === undefined && v.scaleY === undefined)
        return { w: 100, h: 100, label, body: <Art color={v.color} /> };
      const sx = v.scaleX ?? 1;
      const sy = v.scaleY ?? 1;
      const box = Math.max(sx, sy) > 1.1 ? 205 : 110;
      const pad = 5;
      let body: ReactNode;
      if (isStretchable(v.object)) {
        const a: StretchArt = STRETCH_ART[v.object];
        const w = a.w * sx;
        const h = a.h * sy;
        body = (
          <g transform={`translate(${pad} ${round(box - pad - h)})`}>{a.draw(w, h, v.color)}</g>
        );
      } else {
        body = (
          <g transform={`translate(${pad} ${round(box - pad - 100 * sy)}) scale(${sx} ${sy})`}>
            <Art color={v.color} />
          </g>
        );
      }
      return { w: box, h: box, label, body };
    }
    case 'scene':
      return buildScene(v.relation, v.subject, v.reference);
    case 'equation': {
      type Tok = { text?: string; w: number };
      const num = (n: number): Tok => ({ text: fmt(n), w: 20 + fmt(n).length * 46 });
      const sym = (s: string): Tok => ({ text: s, w: 58 });
      const toks: Tok[] = [
        num(v.left),
        sym(v.op === '+' ? '+' : '−'),
        num(v.right),
        sym('='),
        v.result === undefined ? { w: 90 } : num(v.result),
      ];
      const w = toks.reduce((s, t) => s + t.w, 0) + 24;
      let x = 12;
      const parts = toks.map((t, i) => {
        const cx = x + t.w / 2;
        x += t.w;
        return t.text === undefined ? (
          <rect
            key={i}
            x={cx - 36}
            y={16}
            width={72}
            height={88}
            rx={14}
            fill={TOKENS.blankFill}
            stroke={TOKENS.muted}
            strokeWidth={4}
            strokeDasharray="12 9"
            data-blank
          />
        ) : (
          <Text key={i} x={cx} y={64} size={80} weight={800}>
            {t.text}
          </Text>
        );
      });
      const opWord = v.op === '+' ? 'tambah' : 'kurang';
      const res = v.result === undefined ? 'berapa' : String(v.result);
      return {
        w,
        h: 120,
        label: `${v.left} ${opWord} ${v.right} sama dengan ${res}`,
        body: <>{parts}</>,
      };
    }
    case 'letters': {
      // Kotak huruf (D-071): huruf yang diketahui tercetak, kotak kosong bergaris putus dan berkedip lembut.
      const box = 62;
      const w = v.letters.length * box + 16;
      return {
        w,
        h: 90,
        label: v.letters.map((l) => l || 'kosong').join(', '),
        body: (
          <>
            {v.letters.map((l, i) => (
              <g key={i} className={l ? undefined : 'va-blank'}>
                <rect
                  x={8 + i * box}
                  y={12}
                  width={box - 4}
                  height={66}
                  rx={8}
                  fill={l ? TOKENS.card : TOKENS.blankFill}
                  stroke={l ? OUTLINE : TOKENS.muted}
                  strokeWidth={3}
                  strokeDasharray={l ? undefined : '8 6'}
                />
                {l && (
                  <Text x={8 + i * box + (box - 4) / 2} y={46} size={36}>
                    {l.toUpperCase()}
                  </Text>
                )}
              </g>
            ))}
          </>
        ),
      };
    }
    case 'word': {
      const w = Math.max(140, 48 + v.text.length * 24);
      return {
        w,
        h: 90,
        label: v.text,
        body: (
          <>
            {card(w, 90)}
            <Text x={w / 2} y={47} size={40}>
              {v.text}
            </Text>
          </>
        ),
      };
    }
    case 'yesno':
      return v.value
        ? {
            w: 100,
            h: 100,
            label: 'ya',
            body: (
              <>
                <circle cx={50} cy={50} r={42} fill={TOKENS.yes} {...LINE} />
                <path
                  d="M29 52 L44 67 L72 36"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={11}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ),
          }
        : {
            w: 100,
            h: 100,
            label: 'tidak',
            body: (
              <>
                <circle cx={50} cy={50} r={42} fill={TOKENS.no} {...LINE} />
                <path
                  d="M35 35 L65 65 M65 35 L35 65"
                  stroke="#ffffff"
                  strokeWidth={10}
                  strokeLinecap="round"
                />
              </>
            ),
          };
    case 'row': {
      const kids = v.items.map((item) => build(item));
      const H = 100;
      const gap = 18;
      const perRow =
        kids.length <= 6 ? kids.length : Math.ceil(kids.length / Math.ceil(kids.length / 6));
      const rows: Built[][] = [];
      for (let i = 0; i < kids.length; i += perRow) rows.push(kids.slice(i, i + perRow));
      const widths = rows.map(
        (r) => r.reduce((s, k) => s + (H * k.w) / k.h, 0) + gap * (r.length - 1),
      );
      const W = Math.max(1, ...widths);
      const nodes: ReactNode[] = [];
      rows.forEach((r, ri) => {
        let x = (W - (widths[ri] ?? 0)) / 2;
        r.forEach((k, ki) => {
          const kw = (H * k.w) / k.h;
          nodes.push(
            <svg
              key={`${ri}-${ki}`}
              x={round(x)}
              y={ri * (H + gap)}
              width={round(kw)}
              height={H}
              viewBox={`0 0 ${k.w} ${k.h}`}
            >
              {k.body}
            </svg>,
          );
          x += kw + gap;
        });
      });
      return {
        w: W,
        h: rows.length * H + (rows.length - 1) * gap,
        label: kids.map((k) => k.label).join(', '),
        body: <>{nodes}</>,
      };
    }
  }
}

/** Label aria Indonesia untuk sebuah Visual (juga dipakai sebagai teks alternatif). */
export const visualLabel = (visual: Visual): string => build(visual).label;

/** Render satu Visual soal sebagai SVG inline (tanpa gambar eksternal, tanpa emoji). */
export function VisualView({ visual, size = 160, countStep }: VisualViewProps) {
  const b = build(visual, countStep);
  const width = Math.round((size * b.w) / b.h);
  return (
    <svg
      role="img"
      aria-label={b.label}
      viewBox={`0 0 ${round(b.w)} ${round(b.h)}`}
      width={width}
      height={size}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', overflow: 'visible' }}
      data-kind={visual.kind}
    >
      {b.body}
    </svg>
  );
}
