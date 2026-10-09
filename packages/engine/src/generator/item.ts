import type {
  BodyPart,
  SenseId,
  Color,
  CoinValue,
  NoteValue,
  ObjectId,
  ShapeId,
  Size,
  SolidId,
} from './assets.js';
import type { DotPictureId } from './dot-pictures.js';
import { catchReplay, mazeReplay, memoryReplay, wordSearchReplay } from './games.js';
import {
  crosswordReplay,
  hopReplay,
  itemPoints,
  jigsawReplay,
  MAX_MISTAKES,
  sortReplay,
  sumOf,
} from './play.js';
import type { GlyphId } from './glyphs.js';
import { bingoReplay, guessReplay, linesCounts, magicReplay, stackValue } from './play-g4.js';
import { chanceReplay, coordReplay } from './play-emc.js';

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
  /** Tangan dengan jari terangkat (1–10; 6–10 = dua tangan), P-MA-04 (D-079). */
  /** `tone` = warna kulit (0–2); `split` = banyak jari di tangan pertama bila dua tangan (mis. 7 = 4 + 3). */
  | { kind: 'fingers'; count: number; tone?: number; split?: number; mirror?: boolean }
  /** Gambar garis/pola pramenulis (P-BT-02/03, D-081). */
  | { kind: 'glyph'; glyph: GlyphId }
  /** Uang kertas Rupiah (gambar sendiri, bukan salinan desain asli), P-MA-13 (D-081). */
  | { kind: 'note'; value: NoteValue }
  /** Anak berdiri; bagian tubuh `part` ditandai lingkaran + panah (D-070). */
  | { kind: 'body'; part?: BodyPart }
  /** Alat indra (mata, telinga, hidung, lidah, kulit/tangan), D-089. */
  | { kind: 'sense'; sense: SenseId }
  /** Wajah anak dengan tangan; alat indra `sense` disorot (D-089). */
  | { kind: 'face'; sense?: SenseId }
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
  /**
   * Gambar geometri olimpiade (EMC, D-101): bidang koordinat (`axes`) atau gambar bebas berkoordinat (y ke atas),
   * berisi segi banyak (boleh diarsir), ruas garis berlabel, titik bernama, lingkaran, tanda siku-siku, dan teks.
   */
  | {
      kind: 'figure';
      axes?: { xMin: number; xMax: number; yMin: number; yMax: number };
      /** Petak bantu tanpa sumbu (gambar bebas). */
      grid?: boolean;
      shapes: FigureShape[];
      caption?: string;
    }
  /** Benda diukur dengan kubus satuan (panjang/tinggi). */
  | {
      kind: 'measure';
      object: ObjectId;
      length: number;
      direction: 'horizontal' | 'vertical';
      showCubes: boolean;
    };

/** Satu bagian gambar `figure` (koordinat dalam satuan gambar, y ke atas). */
export type FigurePoint = [number, number];
export type FigureShape =
  /** Segi banyak; `fill`: `shade` = arsiran abu-abu, `soft` = warna lembut. `open` = garis patah (tidak ditutup). */
  | { t: 'poly'; pts: FigurePoint[]; fill?: 'shade' | 'soft'; open?: boolean; dashed?: boolean }
  /** Ruas garis; `text` = label di tengah (mis. "5 cm"), `ticks` = tanda sama panjang (1–3). */
  | { t: 'seg'; a: FigurePoint; b: FigurePoint; dashed?: boolean; text?: string; ticks?: number }
  /** Titik; `name` = nama (A, B, …), `coord` = tulis koordinatnya. */
  | {
      t: 'point';
      at: FigurePoint;
      name?: string;
      coord?: boolean;
      pos?: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
    }
  | { t: 'circle'; c: FigurePoint; r: number; fill?: 'shade' | 'soft'; center?: boolean }
  /** Tanda siku-siku di titik `at`, di antara arah ke `a` dan `b`. */
  | { t: 'right'; at: FigurePoint; a: FigurePoint; b: FigurePoint }
  | { t: 'label'; at: FigurePoint; text: string };

export type Choice = {
  id: string;
  visual: Visual;
  /** Diucapkan saat kartu diketuk. */
  say?: string;
  /** Label miskonsepsi untuk pengecoh (event `chosenDistractor`). */
  tag?: string;
};

/**
 * Susunan pilihan `pick-one`. `face` (D-089): pilihan berupa alat indra (`sense`) yang tampil sebagai bagian
 * yang bisa diketuk pada gambar wajah besar.
 */
export type Arrangement = 'row' | 'column' | 'grid' | 'face';

export type Interaction =
  | { type: 'pick-one'; choices: Choice[]; answer: string; arrangement?: Arrangement }
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
    }
  /**
   * Tebak Angka Momo (D-096): anak memutar angka per nilai tempat lalu menebak; Momo memberi petunjuk lebih
   * besar/lebih kecil (bilangan utuh) atau per nilai tempat. Nilai jawaban = daftar tebakan; tebakan yang
   * mengabaikan petunjuk atau melebihi `maxGuesses` dihitung keliru.
   */
  | {
      type: 'guess';
      min: number;
      max: number;
      secret: number;
      hint: 'number' | 'digit';
      digits: number;
      maxGuesses: number;
    }
  /**
   * Diagram Ajaib (D-096): atur tinggi setiap batang sesuai tabel. Satu kotak = `scale`. Nilai jawaban =
   * { id batang: nilai }; benar bila semua batang tepat.
   */
  | {
      type: 'chart';
      title: string;
      unit: string;
      scale: number;
      steps: number;
      bars: (Choice & { value: number; label: string })[];
    }
  /**
   * Penyihir Hitung (D-096): rangkaian fakta hitung; ketuk jawaban tiap fakta. Ketukan `"<fakta>:<pilihan>"`.
   * Setiap `starEvery` jawaban tepat, satu bintang mantra menyala. Tanpa batas waktu.
   */
  | {
      type: 'magic';
      facts: { id: string; text: string; say: string; answer: string; choices: Choice[] }[];
      starEvery: number;
    }
  /** Tumpuk Angka (D-096): pilih balok (masing-masing sekali) sampai jumlah/hasil kali = `target`. */
  | {
      type: 'stack';
      op: '+' | '×';
      target: number;
      blocks: (Choice & { value: number })[];
      maxBlocks: number;
    }
  /**
   * Garis Perkalian (D-096): a × b digambar sebagai garis berpotongan; anak mengisi banyak titik potong
   * ratusan, puluhan, satuan. Nilai jawaban = { ratusan, puluhan, satuan }.
   */
  | { type: 'lines'; a: number; b: number }
  /**
   * Bingo Rupiah (D-096): kartu 3×3 berisi nominal; Momo membacakan soal belanja satu per satu, anak mengetuk
   * nominal yang pas. Jawaban semua panggilan membentuk satu garis bingo. Nilai jawaban = ketukan sel.
   */
  | {
      type: 'bingo';
      cells: (Choice & { value: number })[];
      calls: { id: string; text: string; say: string; answer: string }[];
    }
  /**
   * Harta Karun Koordinat (D-101): bidang koordinat xMin..xMax × yMin..yMax; setiap langkah meminta satu titik
   * (koordinat, geser dari titik lain, atau sudut ke-4 persegi panjang). Ketukan `"x,y"`, berurutan.
   */
  | {
      type: 'coord';
      xMin: number;
      xMax: number;
      yMin: number;
      yMax: number;
      /** Setiap langkah: titik target + titik bantu yang tampil selama langkah itu (mis. titik awal). */
      steps: {
        id: string;
        text: string;
        say: string;
        x: number;
        y: number;
        name: string;
        marks: { x: number; y: number; name: string }[];
      }[];
    }
  /**
   * Eksperimen Peluang (D-101): semua hasil percobaan (ruang sampel) tampil sebagai kartu; anak mengetuk semua
   * hasil yang memenuhi kejadian, lalu memilih peluangnya (`"p:<id pecahan>"`).
   */
  | {
      type: 'chance';
      space: 'die' | 'dice2' | 'coins2' | 'coins3' | 'coins4' | 'bag';
      event: string;
      eventSay: string;
      outcomes: Choice[];
      answer: string[];
      fractions: Choice[];
      fraction: string;
    };

export type InteractionType = Interaction['type'];

/** Penjelasan Momo setelah jawaban keliru (reteach) — ditampilkan lalu diberi soal lebih mudah. */
export type Reteach = { say: string; show?: Visual[] };

export type ItemCore = {
  /** Teks soal (untuk orang dewasa / anak yang sudah bisa membaca). */
  prompt: string;
  /**
   * Lihat sekilas (P-MA-02, D-081): gambar soal tampil `peek` ms lalu ditutup; anak boleh membuka lagi kapan saja
   * ("Lihat lagi"), jadi bukan batas waktu menjawab.
   */
  peek?: number;
  /** Kalimat yang dibacakan; default = prompt. Boleh berbeda agar jawaban tidak terlihat di teks. */
  say?: string;
  stimulus: Visual[];
  interaction: Interaction;
  reteach: Reteach;
};

export type Item = ItemCore & { skillId: string; version: number; seed: number; band: number };

export type AnswerValue = string | string[] | Record<string, string> | number;

export type AnswerResult = {
  correct: boolean;
  chosenDistractor?: string;
  /** Poin soal 0–10 (D-078): benar 10, benar setelah keliru sekali 5, salah 0. */
  points?: number;
  /** Kekeliruan yang dihitung di game. */
  mistakes?: number;
};

/** Game ketuk: setiap ketukan keliru dihitung (D-078); kekeliruan ke-2 mengakhiri soal sebagai salah. */
export const TAP_GAMES: ReadonlySet<InteractionType> = new Set([
  'maze',
  'word-search',
  'memory',
  'catch',
  'hop',
  'sort',
  'crossword',
  'jigsaw',
  'connect',
  'guess',
  'magic',
  'bingo',
  'coord',
  'chance',
]);

/**
 * Game dengan tombol Selesai (D-078): jawaban keliru pertama mengurangi 5 poin dan anak boleh membetulkan; keliru
 * ke-2 membuat soal salah. Soal kuis biasa (pilihan, urutkan, pasangkan tanpa gaya game) tetap sekali jawab.
 */
export function isRetryGame(it: Interaction): boolean {
  return (
    it.type === 'sum' ||
    (it.type === 'build' && it.style === 'feed') ||
    (it.type === 'spell' && it.style === 'train') ||
    (it.type === 'order' && it.style !== undefined) ||
    (it.type === 'match' && it.style === 'labels') ||
    it.type === 'chart' ||
    it.type === 'stack' ||
    it.type === 'lines'
  );
}

/**
 * Kekeliruan yang dihitung di game ketuk dan apakah game sudah selesai. Kelonggaran wajar: labirin & cari kata
 * boleh keliru sekali tanpa pengurangan (anak sedang menjelajah); kartu pasangan hanya dihitung keliru bila
 * pasangannya sudah pernah terlihat. `undefined` untuk interaksi yang bukan game ketuk.
 */
export function gameMistakes(
  it: Interaction,
  taps: readonly string[],
): { mistakes: number; done: boolean } | undefined {
  switch (it.type) {
    case 'maze': {
      const r = mazeReplay(it, taps);
      return { mistakes: Math.max(0, r.slips - 1), done: r.done };
    }
    case 'word-search': {
      const r = wordSearchReplay(
        it,
        it.words.map((w) => w.text),
        taps,
      );
      return { mistakes: Math.max(0, r.slips - 1), done: r.done };
    }
    case 'memory': {
      const r = memoryReplay(it.cards, taps);
      return { mistakes: r.errors, done: r.done };
    }
    case 'catch': {
      const r = catchReplay(it.answer, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'hop': {
      const r = hopReplay(it.answer, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'sort': {
      const r = sortReplay(it.items, it.answer, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'crossword': {
      const r = crosswordReplay(it, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'jigsaw': {
      const r = jigsawReplay(it, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'connect': {
      let k = 0;
      let wrong = 0;
      for (const tap of taps) {
        if (k < it.answer.length && tap === it.answer[k]) k++;
        else wrong++;
      }
      return { mistakes: wrong, done: k === it.answer.length };
    }
    case 'guess': {
      const r = guessReplay(it, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'magic': {
      const r = magicReplay(it.facts, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'bingo': {
      const r = bingoReplay(it.calls, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'coord': {
      const r = coordReplay(it.steps, taps);
      return { mistakes: r.slips, done: r.done };
    }
    case 'chance': {
      const r = chanceReplay(it.answer, it.fraction, taps);
      return { mistakes: r.slips, done: r.done };
    }
    default:
      return undefined;
  }
}

/** Soal game ketuk berakhir (kekeliruan mencapai batas) walau belum selesai. */
export const gameOver = (it: Interaction, taps: readonly string[]) =>
  (gameMistakes(it, taps)?.mistakes ?? 0) >= MAX_MISTAKES;

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

const sameRecord = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([k, v]) => b[k] === v);

/**
 * Periksa jawaban anak untuk satu soal, termasuk poinnya (D-078). Game ketuk: benar bila selesai dengan kekeliruan
 * < 2 (keliru sekali = 5 poin). Soal lain: benar 10, salah 0 (kekeliruan game tombol Selesai ditambahkan pemutar).
 */
export function checkAnswer(item: Pick<Item, 'interaction'>, value: AnswerValue): AnswerResult {
  const it = item.interaction;
  if (TAP_GAMES.has(it.type)) {
    const g = Array.isArray(value) ? gameMistakes(it, value) : undefined;
    const correct = !!g && g.done && g.mistakes < MAX_MISTAKES;
    const mistakes = g?.mistakes ?? MAX_MISTAKES;
    return { correct, mistakes, points: itemPoints(correct, mistakes) };
  }
  const r = checkBasic(item, value);
  return { ...r, points: itemPoints(r.correct) };
}

function checkBasic(item: Pick<Item, 'interaction'>, value: AnswerValue): AnswerResult {
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
    case 'guess':
    case 'magic':
    case 'bingo':
    case 'coord':
    case 'chance': {
      const g = Array.isArray(value) ? gameMistakes(it, value) : undefined;
      return { correct: !!g && g.done && g.mistakes < MAX_MISTAKES };
    }
    case 'chart': {
      if (typeof value !== 'object' || Array.isArray(value)) return { correct: false };
      return {
        correct:
          Object.keys(value).length === it.bars.length &&
          it.bars.every((b) => Number(value[b.id]) === b.value),
      };
    }
    case 'stack':
      return {
        correct:
          Array.isArray(value) &&
          value.length <= it.maxBlocks &&
          stackValue(it.op, it.blocks, value) === it.target,
      };
    case 'lines': {
      if (typeof value !== 'object' || Array.isArray(value)) return { correct: false };
      const c = linesCounts(it.a, it.b);
      return {
        correct:
          Number(value.ratusan) === c.ratusan &&
          Number(value.puluhan) === c.puluhan &&
          Number(value.satuan) === c.satuan,
      };
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
                  : it.type === 'chart'
                    ? it.bars
                    : it.type === 'magic'
                      ? it.facts.flatMap((f) => f.choices)
                      : it.type === 'stack'
                        ? it.blocks
                        : it.type === 'bingo'
                          ? it.cells
                          : it.type === 'chance'
                            ? [...it.outcomes, ...it.fractions]
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
