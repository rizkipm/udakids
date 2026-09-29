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

/** Pratinjau SVG sederhana level grid-move (x = kolom dari kiri, y = baris dari atas). */
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
          fill={(x + y) % 2 ? '#f4f1fb' : '#ffffff'}
          stroke="#dcd6ea"
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
            fill="#5d5873"
          />
        ))}
        {grid.puddles.map(([x, y]) => (
          <ellipse
            key={`p${x},${y}`}
            cx={c(x)}
            cy={c(y)}
            rx={CELL * 0.38}
            ry={CELL * 0.24}
            fill="#94c0f8"
            stroke="#1a5bb8"
          />
        ))}
        {grid.stars.map(([x, y]) => (
          <polygon
            key={`s${x},${y}`}
            points={star(c(x), c(y), CELL * 0.3)}
            fill="#ffcc2e"
            stroke="#9a5b00"
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
            stroke="#0f7b4f"
            strokeWidth={4}
          />
          <text
            x={c(goal.x)}
            y={c(goal.y) + 5}
            textAnchor="middle"
            fontSize={14}
            fontWeight={700}
            fill="#0f7b4f"
          >
            {t('admin.level.goalShort')}
          </text>
        </g>
        <g transform={`translate(${c(start.x)} ${c(start.y)}) rotate(${ROT[start.facing]})`}>
          <circle r={CELL * 0.32} fill="#5b3fd6" />
          <polygon points={`0,${-CELL * 0.26} ${CELL * 0.16},0 ${-CELL * 0.16},0`} fill="#ffffff" />
        </g>
        {grid.numberedPath &&
          Array.from({ length: grid.w }, (_, x) => (
            <text key={`n${x}`} x={c(x)} y={h - 4} textAnchor="middle" fontSize={10} fill="#7a7394">
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
