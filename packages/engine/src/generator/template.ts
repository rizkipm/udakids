import { z } from 'zod';
import { lessonSchema } from '../content/lesson.js';
import { OBJECTS } from './assets.js';
import { FAMILIES, FAMILY_NAMES, Reject, type FamilyName } from './families/index.js';
import { allVisuals, type Choice, type Item, type ItemCore } from './item.js';
import { countWord, mazePath } from './games.js';
import { crosswordLetters, fewestTokens, sumOf } from './play.js';
import { BINGO_LINES, guessSolution, linesCounts, stackSolution } from './play-g4.js';
import { GLYPHS } from './glyphs.js';
import { createRng } from './rng.js';

// `worksheet` (D-068): buku lembar kerja interaktif per jenjang (tebalkan, sambung titik, …) dengan pelajaran.
export const DOMAINS = [
  'math',
  'literasi',
  'sains',
  'english',
  'logika',
  'spasial',
  'worksheet',
] as const;
// Urutan = urutan tampil buku (per mata pelajaran). Buku per kelas (sd1–sd4, D-032) berdampingan dengan
// buku gabungan lama (sd12, sd34) yang tetap dipertahankan; sd56 = OSN Kategori C (D-048); smp79 = OSN SMP Kategori D (D-049);
// tkosn = olimpiade TK, Math & Sains (D-050).
export const GRADES = [
  'prek',
  'tk',
  'tkosn',
  'sd1',
  'sd2',
  'sd12',
  'sd3',
  'sd4',
  'sd34',
  'sd56',
  'smp79',
] as const;
export const GRADE_LABEL: Record<(typeof GRADES)[number], string> = {
  prek: 'PAUD',
  tk: 'Kindergarten (TK)',
  tkosn: 'TK (Olimpiade)',
  sd1: 'Kelas 1',
  sd2: 'Kelas 2',
  sd12: 'Grade 1-2 (Kategori A)',
  sd3: 'Kelas 3',
  sd4: 'Kelas 4',
  sd34: 'Grade 3-4 (Kategori B)',
  sd56: 'Grade 5-6 (Kategori C)',
  smp79: 'SMP Kelas 7-9 (Kategori D)',
};

export const skillIdSchema = z
  .string()
  .regex(/^[a-z]+(\.[a-z0-9-]+)+$/, 'format id: domain.bagian-bagian');

export const skillTemplateSchema = z
  .strictObject({
    id: skillIdSchema,
    version: z.number().int().positive(),
    domain: z.enum(DOMAINS),
    grade: z.enum(GRADES),
    /** Kode kategori di katalog (A, B, ... Z, AA). */
    category: z.string().regex(/^[A-Z]{1,2}$/),
    order: z.number().int().positive(),
    title: z.string().min(3).max(80),
    tier: z.enum(['basic', 'intermediate', 'advanced']),
    status: z.enum(['active', 'draft']).default('active'),
    tags: z.record(z.string(), z.string()).default({}),
    family: z.enum(FAMILY_NAMES as [FamilyName, ...FamilyName[]]),
    params: z.record(z.string(), z.unknown()).default({}),
    /** Override params untuk band kesulitan 0 (mudah), 1, 2 — dipakai Skor Jago. */
    bands: z.array(z.record(z.string(), z.unknown())).length(3).optional(),
  })
  .superRefine((t, ctx) => {
    const family = FAMILIES[t.family];
    for (let band = 0; band < 3; band++) {
      const r = family.params.safeParse({ ...t.params, ...(t.bands?.[band] ?? {}) });
      if (!r.success) {
        for (const issue of r.error.issues) {
          ctx.addIssue({
            code: 'custom',
            path: ['params', ...issue.path.map(String)],
            message: `band ${band}: ${issue.message}`,
          });
        }
        return;
      }
    }
  });

export type SkillTemplate = z.infer<typeof skillTemplateSchema>;

export const catalogSchema = z.strictObject({
  domain: z.enum(DOMAINS),
  grade: z.enum(GRADES),
  title: z.string().min(3),
  categories: z
    .array(
      z.strictObject({
        code: z.string().regex(/^[A-Z]{1,2}$/),
        title: z.string().min(3),
        /**
         * Bagian di dalam buku (D-069), mis. "EMC · Eduversal Mathematics Competition — Penyisihan Final
         * Provinsi 2026" (singkatan · nama — keterangan; dipecah saat tampil). Materi dengan `group` yang sama tampil di bawah satu
         * judul bagian; materi tanpa `group` tampil lebih dulu tanpa judul.
         */
        group: z.string().trim().min(2).max(100).optional(),
        /** Materi singkat untuk dibacakan ke anak sebelum bermain (D-026). */
        intro: z.string().trim().min(10).max(300).optional(),
        /** 1–3 hal penting ("Ingat!") dari topik ini. */
        tips: z.array(z.string().trim().min(3).max(120)).min(1).max(3).optional(),
        /**
         * Topik mandiri (D-068): levelnya terbuka sejak awal dan tidak ikut mengunci topik sesudahnya —
         * untuk topik tambahan yang disisipkan ke buku yang sudah dimainkan anak.
         */
        standalone: z.boolean().optional(),
        /**
         * Mock test lomba (D-076): tampil di dalam bagian lombanya (`group` sama dengan kisi-kisinya, mis. EMC),
         * di bawah subjudul "Mock test", sesudah materi kisi-kisi.
         */
        mock: z.boolean().optional(),
        /** Pelajaran sebelum latihan (Menu Belajar, D-068). */
        lesson: lessonSchema.optional(),
      }),
    )
    .min(1),
});
export type Catalog = z.infer<typeof catalogSchema>;

export const MAX_ATTEMPTS = 100;
/** Batas titik sambung titik (target sentuh ≥ 64 px tetap muat di layar HP). */
export const MAX_DOTS = 12;
/** Batas panjang kalimat soal (D-049): soal cerita/olimpiade boleh panjang, maksimal 500 karakter. */
export const MAX_PROMPT_LENGTH = 500;

export class GeneratorError extends Error {}

/** Huruf kapital di awal kalimat (bilangan dalam kata sering mengawali kalimat). */
export const sentenceCase = (text: string) =>
  text.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre: string, c: string) => pre + c.toUpperCase());

/** Buat satu soal dari template (deterministik untuk seed + band yang sama). */
export function generateItem(template: SkillTemplate, opts: { seed: number; band: number }): Item {
  const band = Math.max(0, Math.min(2, Math.trunc(opts.band)));
  const family = FAMILIES[template.family];
  const params = family.params.parse({ ...template.params, ...(template.bands?.[band] ?? {}) });
  const rng = createRng(`${template.id}@${template.version}#${opts.seed}/${band}`);
  let lastReason = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const ctx = { seed: opts.seed, band, templateId: template.id };
      const core = (family.generate as (p: unknown, r: typeof rng, c: typeof ctx) => ItemCore)(
        params,
        rng,
        ctx,
      );
      const problems = itemProblems(core);
      if (problems.length > 0) throw new Reject(problems.join('; '));
      return {
        ...core,
        prompt: sentenceCase(core.prompt),
        ...(core.say && { say: sentenceCase(core.say) }),
        reteach: { ...core.reteach, say: sentenceCase(core.reteach.say) },
        skillId: template.id,
        version: template.version,
        seed: opts.seed,
        band,
      };
    } catch (err) {
      if (!(err instanceof Reject)) throw err;
      lastReason = err.message;
    }
  }
  throw new GeneratorError(
    `${template.id}: gagal membuat soal setelah ${MAX_ATTEMPTS} percobaan (${lastReason})`,
  );
}

const visualKey = (c: Choice) => JSON.stringify(c.visual);

/** Aturan kualitas soal (PRD A7 no. 7 + A10). Kosong = soal baik. */
export function itemProblems(item: ItemCore): string[] {
  const out: string[] = [];
  const it = item.interaction;
  const checkChoices = (choices: Choice[], label: string, allowSameVisual = false) => {
    const ids = new Set(choices.map((c) => c.id));
    if (ids.size !== choices.length) out.push(`${label}: id pilihan kembar`);
    if (!allowSameVisual && new Set(choices.map(visualKey)).size !== choices.length)
      out.push(`${label}: gambar pilihan kembar`);
    return ids;
  };
  switch (it.type) {
    case 'pick-one': {
      // Gambar kembar boleh (mis. "mana yang berbeda"), asal tidak ada yang identik dengan jawaban.
      const ids = checkChoices(it.choices, 'pick-one', true);
      if (!ids.has(it.answer)) out.push('jawaban tidak ada di pilihan');
      if (it.choices.length < 2) out.push('pilihan kurang dari 2');
      const answer = it.choices.find((c) => c.id === it.answer);
      if (answer && it.choices.some((c) => c !== answer && visualKey(c) === visualKey(answer))) {
        out.push('pengecoh sama dengan jawaban');
      }
      break;
    }
    case 'tap-all': {
      const ids = checkChoices(it.choices, 'tap-all', true);
      if (it.answer.length === 0) out.push('tap-all tanpa jawaban');
      if (it.answer.length === it.choices.length) out.push('tap-all: semua pilihan benar');
      if (it.answer.some((a) => !ids.has(a))) out.push('jawaban tap-all tidak ada di pilihan');
      break;
    }
    case 'order': {
      const ids = checkChoices(it.choices, 'order');
      if (it.answer.length !== it.choices.length || it.answer.some((a) => !ids.has(a)))
        out.push('urutan jawaban tidak cocok');
      break;
    }
    case 'group':
    case 'match': {
      const groups = it.type === 'group' ? it.groups : it.right;
      const items = it.type === 'group' ? it.items : it.left;
      const gIds = checkChoices(groups, 'kelompok');
      const iIds = checkChoices(items, 'benda', true);
      if (Object.keys(it.answer).length !== items.length)
        out.push('tidak semua benda punya kelompok');
      for (const [k, v] of Object.entries(it.answer)) {
        if (!iIds.has(k) || !gIds.has(v)) out.push(`pasangan ${k}→${v} tidak valid`);
      }
      break;
    }
    case 'spell': {
      checkChoices(it.letters, 'spell', true);
      const blanks = it.slots.filter((x) => x === null).length;
      if (blanks === 0) out.push('spell: tidak ada kotak kosong');
      if (it.answer.length !== blanks) out.push('spell: jawaban ≠ banyak kotak kosong');
      const pool = it.letters.map((c) =>
        c.visual.kind === 'word' ? c.visual.text.toUpperCase() : '',
      );
      for (const a of it.answer) {
        const k = pool.indexOf(a);
        if (k < 0) out.push(`spell: huruf "${a}" tidak ada di kartu`);
        else pool.splice(k, 1);
      }
      if (it.letters.length < 2) out.push('spell: butuh minimal 2 kartu huruf');
      break;
    }
    case 'build':
      if (it.target < 1 || it.target > it.max) out.push('target build di luar batas');
      break;
    case 'number-line':
      if (it.answer < it.min || it.answer > it.max) out.push('jawaban di luar garis bilangan');
      break;
    case 'number-input':
      if (!Number.isFinite(it.answer)) out.push('jawaban isian bukan angka');
      break;
    case 'trace':
      if (!(it.glyph in GLYPHS)) out.push(`goresan angka "${it.glyph}" tidak ada`);
      if (it.tolerance < 6 || it.tolerance > 24) out.push('toleransi menebalkan di luar 6–24');
      break;
    case 'connect': {
      const ids = new Set(it.dots.map((d) => d.id));
      if (ids.size !== it.dots.length) out.push('connect: id titik kembar');
      if (it.answer.length !== it.dots.length || it.answer.some((a) => !ids.has(a)))
        out.push('connect: urutan tidak mencakup semua titik');
      if (it.dots.length < 3 || it.dots.length > MAX_DOTS) out.push(`connect: titik 3–${MAX_DOTS}`);
      break;
    }
    case 'maze': {
      const n = it.cols * it.rows;
      if (it.cols < 2 || it.rows < 2 || it.cols > 6 || it.rows > 6) out.push('maze: ukuran 2–6');
      if (it.walls.length !== n) out.push('maze: dinding ≠ banyak kotak');
      const path = mazePath(it, it.start, it.goal);
      if (path.length < 2) out.push('maze: pintu keluar tidak tersambung');
      const onPath = it.marks.filter((m) => !m.decoy).map((m) => path.indexOf(m.cell));
      if (onPath.some((i) => i < 0)) out.push('maze: tanda jalan tidak di jalan keluar');
      if (onPath.some((v, i) => i > 0 && v <= onPath[i - 1]!))
        out.push('maze: tanda jalan tidak urut');
      if (it.marks.some((m) => m.decoy && path.includes(m.cell)))
        out.push('maze: pengecoh di jalan keluar');
      if (new Set(it.marks.map((m) => m.cell)).size !== it.marks.length)
        out.push('maze: tanda kembar');
      break;
    }
    case 'word-search': {
      if (it.letters.length !== it.cols * it.rows) out.push('cari kata: huruf ≠ banyak kotak');
      if (it.words.length < 1) out.push('cari kata: tanpa kata');
      for (const w of it.words) {
        if (w.cells.length !== w.text.length || w.cells.some((c, k) => it.letters[c] !== w.text[k]))
          out.push(`cari kata: "${w.text}" tidak cocok dengan kotak`);
        if (countWord(it.letters, it.cols, it.rows, w.text) !== 1)
          out.push(`cari kata: "${w.text}" muncul ≠ 1 kali`);
      }
      break;
    }
    case 'memory': {
      checkChoices(it.cards, 'memory', true);
      const pairs = new Map<string, number>();
      for (const c of it.cards) pairs.set(c.pair, (pairs.get(c.pair) ?? 0) + 1);
      if ([...pairs.values()].some((v) => v !== 2))
        out.push('memory: setiap pasangan harus 2 kartu');
      if (pairs.size < 2 || pairs.size > 6) out.push('memory: 2–6 pasangan');
      break;
    }
    case 'catch': {
      const ids = checkChoices(it.choices, 'catch', true);
      if (it.answer.length === 0) out.push('catch tanpa jawaban');
      if (it.answer.length === it.choices.length) out.push('catch: semua benda benar');
      if (it.answer.some((a) => !ids.has(a))) out.push('jawaban catch tidak ada di pilihan');
      break;
    }
    case 'sum': {
      checkChoices(it.tokens, 'sum');
      if (it.tokens.length < 1 || it.tokens.length > 4) out.push('sum: 1–4 jenis token');
      if (it.tokens.some((t) => !(t.value > 0) || !Number.isInteger(t.value)))
        out.push('sum: nilai token harus bilangan bulat positif');
      const need = it.target - it.given;
      if (need < 1) out.push('sum: tidak ada yang perlu ditambahkan');
      else if (
        fewestTokens(
          it.tokens.map((t) => t.value),
          need,
        ) > it.maxTokens
      )
        out.push('sum: target tidak bisa dicapai dalam batas token');
      if (it.maxTokens > 12) out.push('sum: maks. 12 token');
      if (sumOf(it.tokens, []) !== 0) out.push('sum: token tidak valid');
      break;
    }
    case 'guess': {
      if (it.secret < it.min || it.secret > it.max) out.push('guess: rahasia di luar rentang');
      if (guessSolution(it).length > it.maxGuesses)
        out.push('guess: tidak bisa ditebak dalam batas');
      break;
    }
    case 'chart': {
      checkChoices(it.bars, 'chart');
      if (it.bars.length < 3 || it.bars.length > 5) out.push('chart: 3–5 batang');
      if (it.bars.some((b) => b.value % it.scale !== 0 || b.value / it.scale > it.steps))
        out.push('chart: nilai batang tidak sesuai skala');
      if (it.steps > 10) out.push('chart: maks. 10 kotak');
      break;
    }
    case 'magic': {
      if (it.facts.length < 3) out.push('magic: minimal 3 fakta');
      for (const f of it.facts) {
        const ids = checkChoices(f.choices, 'magic');
        if (!ids.has(f.answer)) out.push('magic: jawaban tidak ada di pilihan');
      }
      if (new Set(it.facts.map((f) => f.text)).size !== it.facts.length)
        out.push('magic: fakta kembar');
      break;
    }
    case 'stack': {
      checkChoices(it.blocks, 'stack');
      if (!stackSolution(it.op, it.blocks, it.target, it.maxBlocks))
        out.push('stack: target tidak bisa dicapai');
      break;
    }
    case 'lines': {
      const c = linesCounts(it.a, it.b);
      if (c.ratusan > 9 || c.puluhan > 9 || c.satuan > 9) out.push('lines: ada kelompok ≥ 10');
      if (c.ratusan * 100 + c.puluhan * 10 + c.satuan !== it.a * it.b)
        out.push('lines: hasil tidak cocok');
      break;
    }
    case 'bingo': {
      checkChoices(it.cells, 'bingo');
      if (it.cells.length !== 9) out.push('bingo: kartu harus 3×3');
      if (new Set(it.cells.map((c) => c.value)).size !== it.cells.length)
        out.push('bingo: nominal kembar');
      const idx = it.calls.map((c) => it.cells.findIndex((x) => x.id === c.answer));
      if (idx.some((i) => i < 0)) out.push('bingo: jawaban tidak ada di kartu');
      const sorted = [...idx].sort((a, b) => a - b).join(',');
      if (!BINGO_LINES.some((l) => [...l].sort((a, b) => a - b).join(',') === sorted))
        out.push('bingo: jawaban bukan satu garis');
      break;
    }
    case 'coord': {
      const keys = it.steps.map((st) => `${st.x},${st.y}`);
      if (new Set(keys).size !== keys.length) out.push('coord: titik target kembar');
      if (
        it.steps.some(
          (st) =>
            st.x < it.xMin ||
            st.x > it.xMax ||
            st.y < it.yMin ||
            st.y > it.yMax ||
            st.marks.some((m) => m.x < it.xMin || m.x > it.xMax || m.y < it.yMin || m.y > it.yMax),
        )
      )
        out.push('coord: titik di luar bidang');
      if (it.xMax - it.xMin > 20 || it.yMax - it.yMin > 20)
        out.push('coord: bidang maks. 20 petak');
      break;
    }
    case 'chance': {
      const ids = checkChoices(it.outcomes, 'chance');
      const fr = checkChoices(it.fractions, 'chance');
      if (!it.answer.length || it.answer.length === it.outcomes.length)
        out.push('chance: kejadian kosong / semua hasil');
      if (it.answer.some((a) => !ids.has(a))) out.push('chance: jawaban bukan hasil percobaan');
      if (!fr.has(it.fraction)) out.push('chance: peluang tidak ada di pilihan');
      const f = it.fractions.find((c) => c.id === it.fraction)?.visual;
      if (
        f?.kind !== 'fraction' ||
        Math.abs(f.num / f.den - it.answer.length / it.outcomes.length) > 1e-9
      )
        out.push('chance: pecahan peluang tidak cocok');
      const values = it.fractions.map((c) =>
        c.visual.kind === 'fraction' ? c.visual.num / c.visual.den : NaN,
      );
      if (new Set(values).size !== values.length) out.push('chance: pilihan peluang bernilai sama');
      break;
    }
    case 'hop': {
      const stones = new Set(it.stones);
      if (stones.size !== it.stones.length) out.push('hop: batu kembar');
      if (it.stones.length < 3 || it.stones.length > 21) out.push('hop: 3–21 batu');
      if (!stones.has(it.start)) out.push('hop: awal tidak di papan');
      if (it.answer.length < 1) out.push('hop: tanpa lompatan');
      if (it.answer.some((a) => !stones.has(a))) out.push('hop: tujuan tidak di papan');
      if (it.answer.some((a, i) => a === (i === 0 ? it.start : it.answer[i - 1])))
        out.push('hop: lompatan di tempat');
      break;
    }
    case 'sort': {
      const bins = checkChoices(it.bins, 'keranjang');
      const items = checkChoices(it.items, 'benda', true);
      if (it.bins.length < 2 || it.bins.length > 3) out.push('sort: 2–3 keranjang');
      if (it.items.length < 3 || it.items.length > 10) out.push('sort: 3–10 benda');
      if (Object.keys(it.answer).length !== it.items.length)
        out.push('sort: benda tanpa keranjang');
      for (const [k, v] of Object.entries(it.answer))
        if (!items.has(k) || !bins.has(v)) out.push(`sort: ${k}→${v} tidak valid`);
      if (new Set(Object.values(it.answer)).size < 2) out.push('sort: semua benda satu keranjang');
      break;
    }
    case 'crossword': {
      const n = it.cols * it.rows;
      if (it.cols < 2 || it.rows < 2 || it.cols > 7 || it.rows > 7)
        out.push('crossword: ukuran 2–7');
      if (it.words.length < 2 || it.words.length > 5) out.push('crossword: 2–5 kata');
      const letters = crosswordLetters(it);
      for (const w of it.words) {
        if (w.cells.length !== w.text.length || w.cells.some((c) => c < 0 || c >= n))
          out.push(`crossword: "${w.text}" tidak cocok dengan kotak`);
        if (w.cells.some((c, k) => letters[c] !== w.text[k]))
          out.push(`crossword: "${w.text}" bertabrakan`);
      }
      const tiles = new Set(it.letters.map((c) => (c.visual.kind === 'word' ? c.visual.text : '')));
      for (const w of it.words)
        for (const ch of w.text)
          if (!tiles.has(ch)) out.push(`crossword: kartu huruf "${ch}" tidak ada`);
      checkChoices(it.letters, 'crossword');
      if (it.letters.length > 10) out.push('crossword: maks. 10 kartu huruf');
      const all = new Set(it.words.flatMap((w) => w.cells));
      if (it.prefill.some((c) => !all.has(c))) out.push('crossword: kotak terbuka di luar kata');
      if (it.prefill.length >= all.size) out.push('crossword: semua kotak sudah terbuka');
      break;
    }
    case 'jigsaw': {
      if (it.cols < 2 || it.rows < 2 || it.cols > 3 || it.rows > 3) out.push('jigsaw: ukuran 2–3');
      const total = it.cols * it.rows;
      if (it.pieces.length !== total || new Set(it.pieces).size !== total)
        out.push('jigsaw: kepingan ≠ banyak kotak');
      if (it.pieces.some((p) => !/^p\d+$/.test(p) || Number(p.slice(1)) >= total))
        out.push('jigsaw: id kepingan tidak valid');
      if (it.fixed.length >= total) out.push('jigsaw: semua kepingan sudah terpasang');
      break;
    }
  }
  if (item.prompt.length > MAX_PROMPT_LENGTH)
    out.push(`kalimat soal > ${MAX_PROMPT_LENGTH} karakter`);
  for (const v of allVisuals(item)) {
    const ids =
      v.kind === 'objects' || v.kind === 'object'
        ? [v.object]
        : v.kind === 'scene'
          ? [v.subject, v.reference]
          : v.kind === 'mixed'
            ? v.parts.map((x) => x.object)
            : [];
    for (const id of ids) if (!(id in OBJECTS)) out.push(`gambar "${id}" tidak ada`);
    if ((v.kind === 'objects' || v.kind === 'dots') && v.count < 0) out.push('jumlah negatif');
    if (v.kind === 'frame' && v.filled > v.size) out.push('bingkai terlalu penuh');
    if (v.kind === 'fraction' && (v.den <= 0 || v.num < 0)) out.push('pecahan tidak valid');
    if (v.kind === 'bar-chart' && v.labels.length !== v.values.length)
      out.push('diagram: label ≠ nilai');
    if (v.kind === 'table' && v.rows.some((r) => r.length !== v.headers.length))
      out.push('tabel: kolom tidak sama');
    if (v.kind === 'puzzle' && v.index >= v.cols * v.rows)
      out.push('puzzle: kepingan di luar gambar');
  }
  return out;
}

export const TEMPLATE_SAMPLE_SIZE = 200;

/** PRD A7 no. 7 — hasilkan N soal (seed tetap) dan kumpulkan masalahnya. */
export function validateTemplate(template: SkillTemplate, n = TEMPLATE_SAMPLE_SIZE): string[] {
  // Mock test (D-072) tidak membuat soal sendiri; isinya diperiksa lewat level sumbernya.
  if (template.family === 'mock') return [];
  const problems = new Set<string>();
  for (let i = 0; i < n; i++) {
    try {
      generateItem(template, { seed: i, band: i % 3 });
    } catch (err) {
      problems.add((err as Error).message);
      if (problems.size >= 5) break;
    }
  }
  return [...problems];
}
