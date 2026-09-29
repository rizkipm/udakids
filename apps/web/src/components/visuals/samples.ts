import type { Relation, Visual } from '@little-coder/engine';

type Kind = Visual['kind'];

/** Satu contoh per jenis Visual — dipakai galeri dev dan test (Record memastikan semua jenis ada). */
export const SAMPLE_VISUALS: { [K in Kind]: Extract<Visual, { kind: K }> } = {
  objects: { kind: 'objects', object: 'apel', count: 7, layout: 'scatter', crossed: 2 },
  mixed: {
    kind: 'mixed',
    parts: [
      { object: 'bebek', count: 3 },
      { object: 'ayam', count: 2 },
    ],
  },
  dots: { kind: 'dots', count: 6, layout: 'ring' },
  cubes: { kind: 'cubes', counts: [3, 4], colors: ['merah', 'biru'], separated: true },
  frame: { kind: 'frame', filled: 7, size: 10 },
  numeral: { kind: 'numeral', value: 14 },
  blank: { kind: 'blank' },
  shape: { kind: 'shape', shape: 'segitiga', color: 'hijau', size: 'l', rotate: 15 },
  shapes: {
    kind: 'shapes',
    items: [
      { shape: 'lingkaran', color: 'merah' },
      { shape: 'persegi', color: 'biru' },
      { shape: 'segi-enam', color: 'kuning' },
    ],
    layout: 'row',
  },
  solid: { kind: 'solid', solid: 'tabung', color: 'ungu' },
  coin: { kind: 'coin', value: 500 },
  object: { kind: 'object', object: 'pensil', scaleX: 0.55, scaleY: 1 },
  scene: { kind: 'scene', relation: 'inside', subject: 'kucing', reference: 'kotak' },
  equation: { kind: 'equation', left: 5, op: '-', right: 2 },
  swatch: { kind: 'swatch', color: 'oranye' },
  word: { kind: 'word', text: 'segitiga' },
  yesno: { kind: 'yesno', value: true },
  row: {
    kind: 'row',
    items: [
      { kind: 'numeral', value: 3 },
      { kind: 'coin', value: 1000 },
      { kind: 'yesno', value: false },
    ],
  },
  text: { kind: 'text', text: 'Ibu membeli 12 apel. Setiap hari dimakan 3 apel.' },
  fraction: { kind: 'fraction', num: 3, den: 4, model: 'circle' },
  table: {
    kind: 'table',
    caption: 'Buah kesukaan',
    headers: ['Buah', 'Siswa'],
    rows: [
      ['Apel', 8],
      ['Jeruk', 5],
    ],
  },
  'bar-chart': {
    kind: 'bar-chart',
    caption: 'Buku dibaca',
    labels: ['Sen', 'Sel', 'Rab'],
    values: [4, 7, 2],
    unit: 'buku',
  },
  rect: { kind: 'rect', w: 6, h: 4, unit: 'cm', grid: true },
  cuboid: { kind: 'cuboid', p: 4, l: 3, t: 2, unit: 'cm', cubes: true },
  angle: { kind: 'angle', degrees: 60, protractor: true, showValue: true },
  clock: { kind: 'clock', hour: 3, minute: 30 },
  digital: { kind: 'digital', hour: 7, minute: 15 },
  tens: { kind: 'tens', tens: 1, ones: 4 },
  'number-chart': {
    kind: 'number-chart',
    start: 1,
    end: 30,
    columns: 10,
    blanks: [14],
    highlight: [10, 20, 30],
  },
  venn: { kind: 'venn', a: 'Merah', b: 'Bulat', onlyA: 2, onlyB: 3, both: 1, object: 'apel' },
  measure: {
    kind: 'measure',
    object: 'pensil',
    length: 5,
    direction: 'horizontal',
    showCubes: true,
  },
};

export const RELATIONS: Relation[] = [
  'in-front',
  'behind',
  'inside',
  'outside',
  'above',
  'below',
  'beside',
];
