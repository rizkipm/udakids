import type { BodyPart, Color, CoinValue, ObjectId, ShapeId, Size, SolidId } from './assets.js';
import type { DotPictureId } from './dot-pictures.js';
import { catchReplay, mazeReplay, memoryReplay, wordSearchReplay } from './games.js';
import { crosswordReplay, hopReplay, jigsawReplay, sortReplay, sumOf } from './play.js';
import type { GlyphId } from './glyphs.js';

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
  /** Satu muka dadu dengan pola mata 1–6 (D-069). */
  | { kind: 'die'; value: number; color?: Color }
  /** Anak berdiri; bagian tubuh `part` ditandai lingkaran + panah (D-070). */
  | { kind: 'body'; part?: BodyPart }
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
  /** Kotak huruf untuk melengkapi kata (D-071); '' = kotak kosong yang harus diisi. */
  | { kind: 'letters'; letters: string[] }
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
  /**
   * Puzzle (D-078): gambar `picture` dibagi `cols` × `rows`. `holed` = gambar utuh dengan satu kepingan
   * (`index`) hilang; `piece` = hanya kepingan `index` (kartu pilihan "kepingan mana yang pas?").
   */
  | {
      kind: 'puzzle';
      picture: Visual;
      cols: number;
      rows: number;
      show: 'holed' | 'piece';
      index: number;
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
  /** `style: 'balloons'` = permainan pecahkan balon (kartu melayang, pecah saat diketuk). */
  | { type: 'tap-all'; choices: Choice[]; answer: string[]; style?: 'balloons' }
  /** `style` (D-078): `ferris` = kabin bianglala, `rocket` = panel hitung mundur roket. Penilaian sama. */
  | { type: 'order'; choices: Choice[]; answer: string[]; style?: 'ferris' | 'rocket' }
  | { type: 'group'; groups: Choice[]; items: Choice[]; answer: Record<string, string> }
  /** `style: 'labels'` (D-078) = tempel kartu kata ke gambarnya. Penilaian sama. */
  | {
      type: 'match';
      left: Choice[];
      right: Choice[];
      answer: Record<string, string>;
      style?: 'labels';
    }
  /**
   * Lengkapi nama (D-070): kotak huruf, `null` = kosong. Anak mengetuk kartu huruf (`letters`) untuk mengisi
   * kotak kosong dari kiri. Nilai jawaban = huruf di kotak kosong berurutan (bukan id kartu).
   */
  | {
      type: 'spell';
      slots: (string | null)[];
      letters: Choice[];
      answer: string[];
      /** `train` (D-078) = gerbong kereta: angka/huruf yang hilang. Penilaian sama. */
      style?: 'train';
    }
  | {
      type: 'build';
      target: number;
      unit: 'cube' | 'frame' | 'sticker' | 'object';
      object?: ObjectId;
      max: number;
      frameSize?: 5 | 10 | 20;
      /** `feed` (D-078) = beri makan hewan: benda masuk ke mangkuk. Penilaian sama. */
      style?: 'feed';
      /** Hewan yang diberi makan (default kucing). */
      eater?: ObjectId;
    }
  | { type: 'number-line'; min: number; max: number; start?: number; answer: number }
  /** Isian singkat angka (kelas 3+, format isian OSN). `decimals` = jumlah angka di belakang koma. */
  | { type: 'number-input'; answer: number; unit?: string; decimals?: number }
  /**
   * Menebalkan angka mengikuti goresan bernomor (D-068). Nilai jawaban = banyak goresan yang keluar jalur
   * sebelum angka selesai; benar bila ≤ `maxSlips`. Tulisan anak tidak disimpan.
   */
  | {
      type: 'trace';
      glyph: GlyphId;
      /** `solid` = angka abu-abu tebal; `dotted` = titik-titik saja (lebih sulit). */
      guide: 'solid' | 'dotted';
      /** Toleransi jarak jari ke jalur (satuan glyph, tinggi 140). */
      tolerance: number;
      maxSlips: number;
    }
  /**
   * Sambung titik bernomor berurutan sampai gambar jadi (D-068). Nilai jawaban = SEMUA ketukan, termasuk
   * yang keliru; benar bila urutannya lengkap dan ketukan keliru ≤ `maxSlips`.
   */
  | {
      type: 'connect';
      picture: DotPictureId;
      dots: { id: string; label: number; x: number; y: number }[];
      answer: string[];
      maxSlips: number;
    }
  /**
   * Labirin (D-075): ketuk kotak sebaris/sekolom untuk berjalan (tidak menembus dinding) dari `start` ke
   * `goal`. `marks` = huruf/angka di kotak (yang bukan `decoy` berada di jalan keluar, berurutan). Nilai
   * jawaban = semua ketukan ("c12"); benar bila sampai di pintu keluar dan ketukan menabrak ≤ `maxSlips`.
   */
  | {
      type: 'maze';
      cols: number;
      rows: number;
      walls: number[];
      start: number;
      goal: number;
      marks: { cell: number; text: string; say: string; decoy?: boolean; visual?: Visual }[];
      maxSlips: number;
      /** Tokoh yang berjalan (D-078); default Momo. `goal` = gambar di pintu keluar. */
      walker?: ObjectId;
      goalVisual?: Visual;
    }
  /**
   * Cari kata (D-075): kotak huruf `letters` (cols × rows); anak mengetuk huruf berurutan dari huruf pertama
   * kata (mendatar/menurun). Nilai jawaban = semua ketukan; benar bila semua kata ketemu dan slip ≤ `maxSlips`.
   */
  | {
      type: 'word-search';
      cols: number;
      rows: number;
      letters: string;
      words: { id: string; text: string; cells: number[]; visual: Visual; say: string }[];
      maxSlips: number;
    }
  /**
   * Kartu pasangan / memori (D-075): kartu tertutup dibalik dua-dua; `pair` sama = pasangan. Nilai jawaban =
   * urutan kartu yang dibalik; benar bila semua berpasangan dan pasangan meleset ≤ `maxSlips`.
   */
  | { type: 'memory'; cards: (Choice & { pair: string })[]; maxSlips: number }
  /**
   * Tangkap (D-075): benda bergerak pelan melintas dan terus berputar sampai ditangkap (tanpa hitung mundur).
   * Nilai jawaban = semua ketukan; benar bila semua `answer` tertangkap dan ketukan meleset ≤ `maxSlips`.
   */
  | {
      type: 'catch';
      choices: Choice[];
      answer: string[];
      maxSlips: number;
      /** Latar (D-078): langit (default), luar angkasa, laut, atau kebun. */
      scene?: 'sky' | 'space' | 'sea' | 'farm';
    }
  /**
   * Jumlahkan sampai pas (D-078): neraca seimbang, Toko Momo (bayar dengan koin), atau truk muatan. Anak
   * mengetuk token (persediaan tak terbatas, bisa dikeluarkan lagi). Nilai jawaban = id token yang terpasang;
   * benar bila jumlah nilainya = `target` dan banyaknya ≤ `maxTokens`. `given` = nilai yang sudah ada di sisi
   * anak sejak awal (mis. 4 + … = 7).
   */
  | {
      type: 'sum';
      style: 'balance' | 'shop' | 'truck';
      target: number;
      given: number;
      tokens: (Choice & { value: number })[];
      /** Yang ditimbang / dibeli / diangkut (ditampilkan di sisi lawan). */
      show: Visual;
      maxTokens: number;
    }
  /**
   * Lompat (D-078): kodok (atau anak berjalan) di papan batu bernomor `stones`. Anak mengetuk batu tempat
   * mendarat satu per satu. Nilai jawaban = semua ketukan (angka batu); benar bila urutan `answer` lengkap dan
   * ketukan keliru ≤ `maxSlips`.
   */
  | {
      type: 'hop';
      style: 'frog' | 'steps';
      stones: number[];
      start: number;
      answer: number[];
      maxSlips: number;
    }
  /**
   * Sortir keranjang (D-078): benda datang satu per satu; anak mengetuk keranjangnya. Nilai jawaban = semua
   * ketukan "benda>keranjang"; benar bila semua benda masuk dan ketukan keliru ≤ `maxSlips`.
   */
  | {
      type: 'sort';
      style: 'baskets' | 'trucks';
      bins: Choice[];
      items: Choice[];
      answer: Record<string, string>;
      maxSlips: number;
    }
  /**
   * Teka-teki silang bergambar (D-078): anak mengetuk gambar petunjuk, lalu kartu huruf untuk mengisi kotak
   * kata itu dari depan. Nilai jawaban = semua ketukan "kata:huruf"; benar bila semua kotak terisi dan
   * ketukan keliru ≤ `maxSlips`. `prefill` = kotak yang sudah terbuka sejak awal.
   */
  | {
      type: 'crossword';
      cols: number;
      rows: number;
      words: {
        id: string;
        text: string;
        cells: number[];
        dir: 'across' | 'down';
        visual: Visual;
        say: string;
      }[];
      letters: Choice[];
      prefill: number[];
      maxSlips: number;
      /** Tokoh tema di atas papan (traktor, truk, ikan, …). */
      mascot?: ObjectId;
    }
  /**
   * Puzzle susun (D-078): gambar dibagi `cols` × `rows`; kepingan `p<k>` milik kotak `k`. Anak mengetuk
   * kepingan lalu kotaknya. Nilai jawaban = ketukan "p<k>@<kotak>"; benar bila semua terpasang dan ketukan
   * keliru ≤ `maxSlips`. `fixed` = kotak yang sudah terpasang sejak awal.
   */
  | {
      type: 'jigsaw';
      picture: Visual;
      cols: number;
      rows: number;
      /** Urutan tampil kepingan (sudah diacak). */
      pieces: string[];
      fixed: number[];
      maxSlips: number;
    };

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
    case 'spell':
      return {
        correct:
          Array.isArray(value) &&
          value.length === it.answer.length &&
          value.every((v, i) => v.toUpperCase() === it.answer[i]),
      };
    case 'build':
      return { correct: value === it.target };
    case 'number-line':
      return { correct: value === it.answer };
    case 'number-input':
      return { correct: typeof value === 'number' && Math.abs(value - it.answer) < 1e-9 };
    case 'trace':
      return { correct: typeof value === 'number' && value >= 0 && value <= it.maxSlips };
    case 'connect':
      return { correct: Array.isArray(value) && connectSlips(it.answer, value) <= it.maxSlips };
    case 'maze': {
      if (!Array.isArray(value)) return { correct: false };
      const r = mazeReplay(it, value);
      return { correct: r.done && r.slips <= it.maxSlips };
    }
    case 'word-search': {
      if (!Array.isArray(value)) return { correct: false };
      const r = wordSearchReplay(
        it,
        it.words.map((w) => w.text),
        value,
      );
      return { correct: r.done && r.slips <= it.maxSlips };
    }
    case 'memory': {
      if (!Array.isArray(value)) return { correct: false };
      const r = memoryReplay(it.cards, value);
      return { correct: r.done && r.misses <= it.maxSlips };
    }
    case 'catch': {
      if (!Array.isArray(value)) return { correct: false };
      const r = catchReplay(it.answer, value);
      return { correct: r.done && r.slips <= it.maxSlips };
    }
    case 'sum':
      return {
        correct:
          Array.isArray(value) &&
          value.length <= it.maxTokens &&
          sumOf(it.tokens, value) !== undefined &&
          it.given + sumOf(it.tokens, value)! === it.target,
      };
    case 'hop': {
      if (!Array.isArray(value)) return { correct: false };
      const r = hopReplay(it.answer, value);
      return { correct: r.done && r.slips <= it.maxSlips };
    }
    case 'sort': {
      if (!Array.isArray(value)) return { correct: false };
      const r = sortReplay(it.items, it.answer, value);
      return { correct: r.done && r.slips <= it.maxSlips };
    }
    case 'crossword': {
      if (!Array.isArray(value)) return { correct: false };
      const r = crosswordReplay(it, value);
      return { correct: r.done && r.slips <= it.maxSlips };
    }
    case 'jigsaw': {
      if (!Array.isArray(value)) return { correct: false };
      const r = jigsawReplay(it, value);
      return { correct: r.done && r.slips <= it.maxSlips };
    }
  }
}

/** Banyak ketukan keliru; `Infinity` bila urutan belum lengkap. */
export function connectSlips(answer: readonly string[], taps: readonly string[]): number {
  let k = 0;
  let wrong = 0;
  for (const tap of taps) {
    if (k < answer.length && tap === answer[k]) k++;
    else wrong++;
  }
  return k === answer.length ? wrong : Infinity;
}

/** Semua visual di soal (stimulus, pilihan, reteach), termasuk isi `row`. */
export function allVisuals(item: ItemCore): Visual[] {
  const out: Visual[] = [];
  const push = (v: Visual) => {
    out.push(v);
    if (v.kind === 'row') v.items.forEach(push);
    if (v.kind === 'puzzle') push(v.picture);
  };
  item.stimulus.forEach(push);
  item.reteach.show?.forEach(push);
  const it = item.interaction;
  const choices =
    it.type === 'group'
      ? [...it.groups, ...it.items]
      : it.type === 'match'
        ? [...it.left, ...it.right]
        : it.type === 'spell'
          ? it.letters
          : it.type === 'memory'
            ? it.cards
            : it.type === 'word-search' || it.type === 'crossword'
              ? it.words
              : it.type === 'sum'
                ? [...it.tokens, { id: 'show', visual: it.show }]
                : it.type === 'sort'
                  ? [...it.bins, ...it.items]
                  : it.type === 'jigsaw'
                    ? [{ id: 'picture', visual: it.picture }]
                    : 'choices' in it
                      ? it.choices
                      : [];
  choices.forEach((c) => push(c.visual));
  if (it.type === 'maze') it.marks.forEach((m) => m.visual && push(m.visual));
  if (it.type === 'maze' && it.goalVisual) push(it.goalVisual);
  return out;
}
