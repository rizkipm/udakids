import type { Color, CoinValue, ObjectId, ShapeId, Size, SolidId } from './assets.js';

export type Layout = 'row' | 'rows' | 'scatter' | 'ring' | 'grid';
export type Relation = 'in-front' | 'behind' | 'inside' | 'outside' | 'above' | 'below' | 'beside';

/** Satu gambar dalam soal. Web merender setiap `kind` dengan SVG sendiri (tanpa emoji). */
export type Visual =
  | {
      kind: 'objects';
      object: ObjectId;
      count: number;
      layout: Layout;
      color?: Color;
      crossed?: number;
      countAlong?: boolean;
    }
  | { kind: 'mixed'; parts: { object: ObjectId; count: number }[] }
  | { kind: 'dots'; count: number; layout: Layout; countAlong?: boolean }
  | {
      kind: 'cubes';
      counts: number[];
      colors: Color[];
      crossed?: number;
      separated?: boolean;
      countAlong?: boolean;
    }
  | { kind: 'frame'; filled: number; size: 5 | 10 | 20; countAlong?: boolean }
  | { kind: 'numeral'; value: number }
  | { kind: 'blank' }
  | { kind: 'shape'; shape: ShapeId; color: Color; size: Size; rotate?: number }
  | {
      kind: 'shapes';
      items: { shape: ShapeId; color: Color }[];
      layout: Layout;
      countAlong?: boolean;
    }
  | { kind: 'solid'; solid: SolidId; color: Color }
  | { kind: 'coin'; value: CoinValue }
  | { kind: 'object'; object: ObjectId; color?: Color; scaleX?: number; scaleY?: number }
  | { kind: 'scene'; relation: Relation; subject: ObjectId; reference: ObjectId }
  | { kind: 'equation'; left: number; op: '+' | '-'; right: number; result?: number }
  | { kind: 'swatch'; color: Color }
  | { kind: 'word'; text: string }
  | { kind: 'yesno'; value: boolean }
  | { kind: 'row'; items: Visual[] }
  /** Teks panjang (soal cerita / pilihan untuk kelas 3+). */
  | { kind: 'text'; text: string }
  /** Pecahan: `num/den`; `model` menambah gambar batang/lingkaran yang diarsir. */
  | {
      kind: 'fraction';
      num: number;
      den: number;
      whole?: number;
      model?: 'bar' | 'circle';
      hideNumber?: boolean;
    }
  | { kind: 'table'; headers: string[]; rows: (string | number)[][]; caption?: string }
  | {
      kind: 'bar-chart';
      labels: string[];
      values: number[];
      unit?: string;
      caption?: string;
      pictogram?: ObjectId;
    }
  /** Persegi panjang berukuran (keliling/luas); `grid` = tampilkan petak satuan. */
  | { kind: 'rect'; w: number; h: number; unit: string; grid?: boolean }
  | { kind: 'cuboid'; p: number; l: number; t: number; unit: string; cubes?: boolean }
  /** Sudut dalam derajat; `protractor` = tampilkan busur derajat, `showValue` = tulis besarnya. */
  | { kind: 'angle'; degrees: number; protractor?: boolean; showValue?: boolean }
  /** Jam analog. */
  | { kind: 'clock'; hour: number; minute: number }
  /** Teks jam digital, mis. 07.30. */
  | { kind: 'digital'; hour: number; minute: number }
  /** Balok puluhan (batang isi 10) dan satuan. */
  | { kind: 'tens'; tens: number; ones: number }
  /** Papan bilangan (mis. 1–100) dengan kotak kosong dan sorotan. */
  | {
      kind: 'number-chart';
      start: number;
      end: number;
      columns: number;
      blanks?: number[];
      highlight?: number[];
    }
  /** Diagram Venn dua kelompok: jumlah benda di A saja, B saja, dan keduanya. */
  | {
      kind: 'venn';
      a: string;
      b: string;
      onlyA: number;
      onlyB: number;
      both: number;
      object: ObjectId;
    }
  /** Benda diukur dengan kubus satuan (panjang/tinggi). */
  | {
      kind: 'measure';
      object: ObjectId;
      length: number;
      direction: 'horizontal' | 'vertical';
      showCubes: boolean;
    };

export type Choice = {
  id: string;
  visual: Visual;
  /** Diucapkan saat kartu diketuk. */
  say?: string;
  /** Label miskonsepsi untuk pengecoh (event `chosenDistractor`). */
  tag?: string;
};

export type Interaction =
  | { type: 'pick-one'; choices: Choice[]; answer: string; arrangement?: 'row' | 'column' | 'grid' }
  | { type: 'tap-all'; choices: Choice[]; answer: string[] }
  | { type: 'order'; choices: Choice[]; answer: string[] }
  | { type: 'group'; groups: Choice[]; items: Choice[]; answer: Record<string, string> }
  | { type: 'match'; left: Choice[]; right: Choice[]; answer: Record<string, string> }
  | {
      type: 'build';
      target: number;
      unit: 'cube' | 'frame' | 'sticker' | 'object';
      object?: ObjectId;
      max: number;
      frameSize?: 5 | 10 | 20;
    }
  | { type: 'number-line'; min: number; max: number; start?: number; answer: number }
  /** Isian singkat angka (kelas 3+, format isian OSN). `decimals` = jumlah angka di belakang koma. */
  | { type: 'number-input'; answer: number; unit?: string; decimals?: number };

export type InteractionType = Interaction['type'];

/** Penjelasan Momo setelah jawaban keliru (reteach) — ditampilkan lalu diberi soal lebih mudah. */
export type Reteach = { say: string; show?: Visual[] };

export type ItemCore = {
  /** Teks soal (untuk orang dewasa / anak yang sudah bisa membaca). */
  prompt: string;
  /** Kalimat yang dibacakan; default = prompt. Boleh berbeda agar jawaban tidak terlihat di teks. */
  say?: string;
  stimulus: Visual[];
  interaction: Interaction;
  reteach: Reteach;
};

export type Item = ItemCore & { skillId: string; version: number; seed: number; band: number };

export type AnswerValue = string | string[] | Record<string, string> | number;

export type AnswerResult = { correct: boolean; chosenDistractor?: string };

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

const sameRecord = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([k, v]) => b[k] === v);

/** Periksa jawaban anak untuk satu soal. */
export function checkAnswer(item: Pick<Item, 'interaction'>, value: AnswerValue): AnswerResult {
  const it = item.interaction;
  switch (it.type) {
    case 'pick-one': {
      if (value === it.answer) return { correct: true };
      const tag = it.choices.find((c) => c.id === value)?.tag;
      return { correct: false, ...(tag && { chosenDistractor: tag }) };
    }
    case 'tap-all':
      return { correct: Array.isArray(value) && sameSet(value, it.answer) };
    case 'order':
      return {
        correct:
          Array.isArray(value) &&
          value.length === it.answer.length &&
          value.every((v, i) => v === it.answer[i]),
      };
    case 'group':
    case 'match':
      return {
        correct: typeof value === 'object' && !Array.isArray(value) && sameRecord(value, it.answer),
      };
    case 'build':
      return { correct: value === it.target };
    case 'number-line':
      return { correct: value === it.answer };
    case 'number-input':
      return { correct: typeof value === 'number' && Math.abs(value - it.answer) < 1e-9 };
  }
}

/** Semua visual di soal (stimulus, pilihan, reteach), termasuk isi `row`. */
export function allVisuals(item: ItemCore): Visual[] {
  const out: Visual[] = [];
  const push = (v: Visual) => {
    out.push(v);
    if (v.kind === 'row') v.items.forEach(push);
  };
  item.stimulus.forEach(push);
  item.reteach.show?.forEach(push);
  const it = item.interaction;
  const choices =
    it.type === 'group'
      ? [...it.groups, ...it.items]
      : it.type === 'match'
        ? [...it.left, ...it.right]
        : 'choices' in it
          ? it.choices
          : [];
  choices.forEach((c) => push(c.visual));
  return out;
}
