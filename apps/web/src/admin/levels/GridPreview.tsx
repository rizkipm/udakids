import type { GridMoveLevel } from '@little-coder/engine';
import { t } from '../../i18n';

const CELL = 48;
const ROT = { up: 0, right: 90, down: 180, left: 270 } as const;

function star(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** Pratinjau SVG sederhana level grid-move (x = kolom dari kiri, y = baris dari atas). Warna lewat token (D-110). */
export function GridPreview({ level }: { level: GridMoveLevel }) {
  const { grid, start, goal } = level;
  const w = grid.w * CELL;
  const h = grid.h * CELL;
  const c = (n: number) => n * CELL + CELL / 2;
  const cells = [];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      cells.push(
        <rect
          key={`${x},${y}`}
          x={x * CELL}
          y={y * CELL}
          width={CELL}
          height={CELL}
          style={{ fill: (x + y) % 2 ? 'var(--awan-2)' : 'var(--kertas)', stroke: 'var(--garis)' }}
        />,
      );
    }
  }
  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="adm-grid-svg"
        viewBox={`-2 -2 ${w + 4} ${h + 4}`}
        width={Math.min(w + 4, 420)}
        role="img"
        aria-label={t('admin.level.gridLabel', { w: grid.w, h: grid.h })}
      >
        {cells}
        {grid.walls.map(([x, y]) => (
          <rect
            key={`w${x},${y}`}
            x={x * CELL + 3}
            y={y * CELL + 3}
            width={CELL - 6}
            height={CELL - 6}
            rx={6}
            style={{ fill: 'var(--malam-muted)' }}
          />
        ))}
        {grid.puddles.map(([x, y]) => (
          <ellipse
            key={`p${x},${y}`}
            cx={c(x)}
            cy={c(y)}
            rx={CELL * 0.38}
            ry={CELL * 0.24}
            style={{ fill: 'var(--langit-soft)', stroke: 'var(--langit)' }}
          />
        ))}
        {grid.stars.map(([x, y]) => (
          <polygon
            key={`s${x},${y}`}
            points={star(c(x), c(y), CELL * 0.3)}
            style={{ fill: 'var(--kunyit)', stroke: 'var(--kunyit-tekan)' }}
          />
        ))}
        <g>
          <rect
            x={goal.x * CELL + 6}
            y={goal.y * CELL + 6}
            width={CELL - 12}
            height={CELL - 12}
            rx={8}
            fill="none"
            style={{ stroke: 'var(--sawah)' }}
            strokeWidth={4}
          />
          <text
            x={c(goal.x)}
            y={c(goal.y) + 5}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            style={{ fill: 'var(--sawah-teks)' }}
          >
            {t('admin.level.goalShort')}
          </text>
        </g>
        <g transform={`translate(${c(start.x)} ${c(start.y)}) rotate(${ROT[start.facing]})`}>
          <circle r={CELL * 0.32} style={{ fill: 'var(--gonjong)' }} />
          <polygon
            points={`0,${-CELL * 0.26} ${CELL * 0.16},0 ${-CELL * 0.16},0`}
            style={{ fill: 'var(--on-gonjong)' }}
          />
        </g>
        {grid.numberedPath &&
          Array.from({ length: grid.w }, (_, x) => (
            <text
              key={`n${x}`}
              x={c(x)}
              y={h - 4}
              textAnchor="middle"
              fontSize={10}
              style={{ fill: 'var(--malam-muted)' }}
            >
              {x}
            </text>
          ))}
      </svg>
      <figcaption className="adm-legend">
        <span>{t('admin.level.legendStart', { facing: start.facing })}</span>
        <span>{t('admin.level.legendGoal')}</span>
        <span>{t('admin.level.legendWall', { n: grid.walls.length })}</span>
        <span>{t('admin.level.legendStar', { n: grid.stars.length })}</span>
        <span>{t('admin.level.legendPuddle', { n: grid.puddles.length })}</span>
      </figcaption>
    </figure>
  );
}
