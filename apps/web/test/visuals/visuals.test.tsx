import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  COINS,
  OBJECT_IDS,
  OBJECTS,
  POSITION_REFERENCES,
  POSITION_SUBJECTS,
  SHAPE_IDS,
  SIZES,
  SOLID_IDS,
  type Layout,
  type Visual,
} from '@little-coder/engine';
import {
  OBJECT_ART,
  RELATIONS,
  SAMPLE_VISUALS,
  VisualGallery,
  VisualView,
  layoutCells,
} from '../../src/components/visuals';

const svgOf = (visual: Visual, countStep?: number) => {
  const { container, unmount } = render(<VisualView visual={visual} countStep={countStep} />);
  const svg = container.querySelector('svg[role="img"]');
  return { svg, container, unmount };
};

describe('OBJECT_ART', () => {
  it.each(OBJECT_IDS)('%s dirender tanpa error', (id) => {
    const Art = OBJECT_ART[id];
    const { container } = render(
      <svg viewBox="0 0 100 100">
        <Art />
        <Art color="hijau" />
      </svg>,
    );
    expect(container.querySelectorAll('svg *').length).toBeGreaterThan(1);
  });

  it('setiap id punya label aria dengan namanya', () => {
    for (const id of OBJECT_IDS) {
      const { svg, unmount } = svgOf({ kind: 'object', object: id });
      expect(svg).toHaveAttribute('aria-label', OBJECTS[id].say);
      unmount();
    }
  });

  it('tanpa emoji di markup', () => {
    const { container } = render(<VisualGallery />);
    expect(container.innerHTML).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('VisualView', () => {
  it.each(Object.entries(SAMPLE_VISUALS))('jenis %s merender svg berlabel', (_kind, visual) => {
    const { svg } = svgOf(visual);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-label')?.length).toBeGreaterThan(0);
  });

  it('label Indonesia yang umum', () => {
    expect(svgOf({ kind: 'objects', object: 'apel', count: 3, layout: 'row' }).svg).toHaveAttribute(
      'aria-label',
      '3 apel',
    );
    expect(svgOf({ kind: 'numeral', value: 4 }).svg).toHaveAttribute('aria-label', 'angka 4');
    expect(
      svgOf({ kind: 'scene', relation: 'inside', subject: 'kucing', reference: 'kotak' }).svg,
    ).toHaveAttribute('aria-label', 'kucing di dalam kotak');
  });

  it('crossed memudarkan dan mencoret N item terakhir', () => {
    const { container } = svgOf({
      kind: 'objects',
      object: 'bebek',
      count: 5,
      layout: 'row',
      crossed: 2,
    });
    expect(container.querySelectorAll('[data-crossed]')).toHaveLength(2);
    const cubes = svgOf({ kind: 'cubes', counts: [6], colors: ['merah'], crossed: 4 });
    expect(cubes.container.querySelectorAll('[data-crossed]')).toHaveLength(4);
  });

  it.each<Visual>([
    { kind: 'objects', object: 'apel', count: 6, layout: 'scatter' },
    { kind: 'dots', count: 6, layout: 'ring' },
    { kind: 'cubes', counts: [3, 3], colors: ['merah', 'biru'], separated: true },
    { kind: 'frame', filled: 6, size: 10 },
    {
      kind: 'shapes',
      items: SHAPE_IDS.map((shape) => ({ shape, color: 'biru' as const })),
      layout: 'grid',
    },
  ])('countStep menyorot item untuk $kind', (visual) => {
    const { container } = svgOf(visual, 3);
    expect(container.querySelectorAll('[data-counted]')).toHaveLength(3);
    expect(container.querySelector('[data-count-badge]')?.textContent).toBe('3');
  });

  it('countStep 0 tidak menyorot apa pun', () => {
    const { container } = svgOf({ kind: 'dots', count: 4, layout: 'row' }, 0);
    expect(container.querySelectorAll('[data-counted]')).toHaveLength(0);
    expect(container.querySelector('[data-count-badge]')).toBeNull();
  });

  it('scatter deterministik', () => {
    const v: Visual = { kind: 'objects', object: 'kucing', count: 9, layout: 'scatter' };
    const a = svgOf(v).container.innerHTML;
    const b = svgOf(v).container.innerHTML;
    expect(a).toBe(b);
    const m: Visual = {
      kind: 'mixed',
      parts: [
        { object: 'apel', count: 4 },
        { object: 'jeruk', count: 3 },
      ],
    };
    expect(svgOf(m).container.innerHTML).toBe(svgOf(m).container.innerHTML);
  });

  it.each<Layout>(['row', 'rows', 'scatter', 'ring', 'grid'])('layout %s tidak bertumpuk', (l) => {
    for (let n = 1; n <= 30; n++) {
      const { pts } = layoutCells(n, l, 'apel');
      expect(pts).toHaveLength(n);
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const d = Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y);
          expect(d).toBeGreaterThanOrEqual(0.85);
        }
    }
  });

  it('semua adegan posisi punya label berbeda', () => {
    for (const reference of POSITION_REFERENCES)
      for (const subject of POSITION_SUBJECTS) {
        const labels = RELATIONS.map((relation) => {
          const { svg, unmount } = svgOf({ kind: 'scene', relation, subject, reference });
          const label = svg?.getAttribute('aria-label');
          unmount();
          return label;
        });
        expect(new Set(labels).size).toBe(RELATIONS.length);
      }
  });

  it('equation tanpa hasil menampilkan kotak kosong dan tanda minus', () => {
    const { container, svg } = svgOf({ kind: 'equation', left: 5, op: '-', right: 2 });
    expect(container.querySelector('[data-blank]')).not.toBeNull();
    expect(container.textContent).toContain('−');
    expect(svg).toHaveAttribute('aria-label', '5 kurang 2 sama dengan berapa');
  });

  it('bangun, bangun ruang, koin, dan objek yang diregangkan', () => {
    for (const shape of SHAPE_IDS)
      for (const size of SIZES)
        expect(svgOf({ kind: 'shape', shape, color: 'merah', size }).svg).not.toBeNull();
    for (const solid of SOLID_IDS)
      expect(svgOf({ kind: 'solid', solid, color: 'biru' }).svg).not.toBeNull();
    for (const value of COINS)
      expect(svgOf({ kind: 'coin', value }).container.textContent).toContain(String(value));
    for (const id of OBJECT_IDS)
      expect(svgOf({ kind: 'object', object: id, scaleX: 0.45, scaleY: 1.1 }).svg).not.toBeNull();
  });
});

describe('visual kelas 3+', () => {
  it('teks panjang dibungkus; niceStep rapi', async () => {
    const { wrapText, niceStep } = await import('../../src/components/visuals/extra');
    expect(
      wrapText('satu dua tiga empat lima enam tujuh delapan sembilan sepuluh', 20).length,
    ).toBeGreaterThan(1);
    expect(niceStep(37)).toBe(10);
    expect(niceStep(4)).toBe(1);
    expect(niceStep(900)).toBe(200);
  });
});
