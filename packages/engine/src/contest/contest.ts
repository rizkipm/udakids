import { GAME_FAMILIES } from '../generator/families/index.js';
import { z } from 'zod';
import {
  checkAnswer,
  type AnswerValue,
  type Arrangement,
  type Choice,
  type Interaction,
  type Item,
  type Visual,
} from '../generator/item.js';
import { createRng } from '../generator/rng.js';
import { DOMAINS, GRADES, generateItem, type SkillTemplate } from '../generator/template.js';
import { QUIZ_LENGTH, quizBand } from '../scoring/quiz.js';
import { itemKey } from '../scoring/round.js';

/**
 * Lomba live (D-042): jadwal serentak, soal dibuat & dinilai di SERVER. Perangkat hanya menerima soal
 * tanpa kunci jawaban, pembahasan, atau label pengecoh. Satu kali ikut per anak; waktu dari jam server.
 */

export const contestInputSchema = z
  .strictObject({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(600).default(''),
    domain: z.enum(DOMAINS),
    grade: z.enum(GRADES),
    /** Kategori (topik) yang dipakai; kosong = semua topik di buku itu. */
    categories: z
      .array(z.string().regex(/^[A-Z]{1,2}$/))
      .max(40)
      .default([]),
    questionCount: z.number().int().min(5).max(50),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    /** Batas waktu per peserta sejak mulai (menit); tetap tidak melewati akhir lomba. */
    durationMinutes: z.number().int().min(1).max(600),
    /** Jumlah pemenang yang diumumkan. */
    winners: z.number().int().min(1).max(100).default(10),
    published: z.boolean().default(false),
  })
  .refine((c) => Date.parse(c.endsAt) > Date.parse(c.startsAt), {
    path: ['endsAt'],
    message: 'waktu selesai harus setelah waktu mulai',
  });
export type ContestInput = z.infer<typeof contestInputSchema>;

export type ContestPhase = 'upcoming' | 'live' | 'ended';
export function contestPhase(c: { startsAt: string; endsAt: string }, now: Date): ContestPhase {
  const t = now.getTime();
  if (t < Date.parse(c.startsAt)) return 'upcoming';
  if (t < Date.parse(c.endsAt)) return 'live';
  return 'ended';
}

/** Batas waktu peserta: min(mulai + durasi, akhir lomba). */
export const entryDeadline = (startedAt: Date, durationMinutes: number, endsAt: string) =>
  new Date(Math.min(startedAt.getTime() + durationMinutes * 60_000, Date.parse(endsAt)));

/** Batas toleransi jaringan untuk jawaban yang dikirim tepat di batas waktu. */
export const CONTEST_GRACE_MS = 5_000;

export type PublicChoice = Omit<Choice, 'tag'>;
export type PublicInteraction =
  | { type: 'pick-one'; choices: PublicChoice[]; arrangement?: Arrangement }
  | { type: 'tap-all'; choices: PublicChoice[]; style?: 'balloons' }
  | { type: 'order'; choices: PublicChoice[] }
  | { type: 'group'; groups: PublicChoice[]; items: PublicChoice[] }
  | { type: 'match'; left: PublicChoice[]; right: PublicChoice[] }
  | { type: 'spell'; slots: (string | null)[]; letters: PublicChoice[] }
  | Extract<Interaction, { type: 'build' }>
  | { type: 'number-line'; min: number; max: number; start?: number }
  | { type: 'number-input'; unit?: string; decimals?: number }
  /** Menebalkan tidak punya kunci rahasia (angkanya memang ditampilkan). */
  | Extract<Interaction, { type: 'trace' }>
  | Omit<Extract<Interaction, { type: 'connect' }>, 'answer'>
  /** Labirin tidak punya kunci rahasia (jalannya memang terlihat). */
  | Extract<Interaction, { type: 'maze' }>
  /** Cari kata tanpa letak kata (perangkat mencocokkan dari hurufnya). */
  | {
      type: 'word-search';
      cols: number;
      rows: number;
      letters: string;
      words: { id: string; text: string; visual: Visual; say: string }[];
      maxSlips: number;
    };
export type PublicItem = {
  prompt: string;
  say?: string;
  stimulus: Item['stimulus'];
  interaction: PublicInteraction;
};

const strip = (cs: readonly Choice[]): PublicChoice[] => cs.map(({ tag: _tag, ...c }) => c);
function shuffle<T>(xs: readonly T[], seed: string): T[] {
  const rng = createRng(seed);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Soal untuk perangkat peserta: tanpa jawaban, pembahasan, dan label pengecoh; urutan kartu diacak. */
export function publicItem(item: Item, seed = `${item.skillId}#${item.seed}`): PublicItem {
  const i = item.interaction;
  let interaction: PublicInteraction;
  switch (i.type) {
    case 'pick-one':
      interaction = {
        type: i.type,
        choices: strip(i.choices),
        ...(i.arrangement && { arrangement: i.arrangement }),
      };
      break;
    case 'tap-all':
      interaction = {
        type: i.type,
        choices: strip(i.choices),
        ...(i.style && { style: i.style }),
      };
      break;
    case 'order':
      // Urutan asli bisa membocorkan jawaban → selalu diacak.
      interaction = { type: i.type, choices: strip(shuffle(i.choices, `${seed}/order`)) };
      break;
    case 'group':
      interaction = {
        type: i.type,
        groups: strip(i.groups),
        items: strip(shuffle(i.items, `${seed}/group`)),
      };
      break;
    case 'match':
      interaction = {
        type: i.type,
        left: strip(i.left),
        right: strip(shuffle(i.right, `${seed}/match`)),
      };
      break;
    case 'spell':
      interaction = { type: i.type, slots: i.slots, letters: strip(i.letters) };
      break;
    case 'build':
      interaction = i;
      break;
    case 'number-line':
      interaction = {
        type: i.type,
        min: i.min,
        max: i.max,
        ...(i.start !== undefined && { start: i.start }),
      };
      break;
    case 'number-input':
      interaction = {
        type: i.type,
        ...(i.unit !== undefined && { unit: i.unit }),
        ...(i.decimals !== undefined && { decimals: i.decimals }),
      };
      break;
    case 'trace':
      interaction = i;
      break;
    case 'connect': {
      const { answer: _answer, ...rest } = i;
      interaction = rest;
      break;
    }
    case 'maze':
      interaction = i;
      break;
    case 'word-search':
      interaction = { ...i, words: i.words.map(({ cells: _cells, ...w }) => w) };
      break;
    case 'memory':
    case 'catch':
    case 'sum':
    case 'hop':
    case 'sort':
    case 'crossword':
    case 'jigsaw':
    case 'guess':
    case 'chart':
    case 'magic':
    case 'stack':
    case 'lines':
    case 'bingo':
    case 'count':
    case 'beads':
    case 'coord':
    case 'chance':
    case 'quest':
    case 'bubbles':
    case 'grid':
    case 'tens':
    case 'clear':
    case 'clock':
    case 'pizza':
      // Pasangan kartu, benda yang harus ditangkap, dan umpan balik tiap ketukan game seru (D-078) butuh kunci
      // jawaban di perangkat; tidak dipakai di lomba (lihat `contestSafeTemplate`).
      throw new Error(`interaksi ${i.type} tidak dipakai di lomba`);
  }
  return {
    prompt: item.prompt,
    ...(item.say !== undefined && { say: item.say }),
    stimulus: item.stimulus,
    interaction,
  };
}

export type ContestEntryResult = {
  id: string;
  correct: number;
  total: number;
  /** Lama pengerjaan (ms) dari mulai sampai selesai/jawaban terakhir. */
  timeMs: number;
  finishedAt: number;
};

/**
 * Peringkat lomba: jawaban benar terbanyak; sama → waktu lebih cepat; sama → selesai lebih dulu.
 * Posisi berurutan. Skor = persen benar (2 desimal).
 */
export function rankContest<T extends ContestEntryResult>(rows: readonly T[]) {
  return [...rows]
    .sort((a, b) => b.correct - a.correct || a.timeMs - b.timeMs || a.finishedAt - b.finishedAt)
    .map((r, i) => ({
      ...r,
      position: i + 1,
      score: r.total ? Math.round((r.correct / r.total) * 10_000) / 100 : 0,
    }));
}

export const contestAnswerSchema = z.strictObject({
  index: z.number().int().min(0).max(49),
  value: z.union([
    z.string().max(60),
    z.array(z.string().max(60)).max(20),
    z.record(z.string().max(60), z.string().max(60)),
    z.number().finite(),
  ]),
});
export type ContestAnswer = z.infer<typeof contestAnswerSchema>;

// ------------------------------------------------------------------ soal lomba (server)

/** Band kesulitan soal ke-`index` dari `total`: mudah → sulit seperti ronde 10 soal (`quizBand`). */
export function contestBand(index: number, total: number): number {
  if (total <= 0) return 0;
  const i = Math.max(0, Math.min(index, total - 1));
  return quizBand(Math.floor((i * QUIZ_LENGTH) / total));
}

export type ContestSkillRef = { id: string; category: string; order: number };

/**
 * Pilih `count` skill tersebar merata ke semua topik (kategori): topik diambil bergiliran, skill di dalam
 * topik diambil acak tanpa pengulangan sampai habis, lalu diulang. Deterministik untuk `seed` yang sama.
 */
export function planContestSkills(
  skills: readonly ContestSkillRef[],
  count: number,
  seed: string,
): string[] {
  if (skills.length === 0 || count <= 0) return [];
  const rng = createRng(`plan/${seed}`);
  const byTopic = new Map<string, ContestSkillRef[]>();
  for (const s of [...skills].sort(
    (a, b) => a.category.localeCompare(b.category) || a.order - b.order || a.id.localeCompare(b.id),
  )) {
    byTopic.set(s.category, [...(byTopic.get(s.category) ?? []), s]);
  }
  const topics = rng.shuffle([...byTopic.keys()]);
  const decks = new Map<string, ContestSkillRef[]>();
  const draw = (topic: string) => {
    let deck = decks.get(topic);
    if (!deck || deck.length === 0) deck = rng.shuffle(byTopic.get(topic)!);
    const next = deck[0]!;
    decks.set(topic, deck.slice(1));
    return next.id;
  };
  return Array.from({ length: count }, (_, i) => draw(topics[i % topics.length]!));
}

/** Family yang soalnya butuh kunci jawaban di perangkat (D-075). */

/** Skill boleh jadi sumber soal lomba: bukan mock test dan tidak (pernah) memakai game berkunci. */
/**
 * Labirin & cari kata Worksheet PAUD boleh di lomba (D-075: letak kata tidak dikirim, dinilai dari huruf di kotak).
 * Game lain (kartu pasangan, tangkap, dan semua game seru D-078) tidak.
 */
const CONTEST_GAME_OK: ReadonlySet<string> = new Set(['maze-path', 'word-search']);
const contestUnsafeGame = (family: string) =>
  GAME_FAMILIES.has(family) && !CONTEST_GAME_OK.has(family);

export function contestSafeTemplate(t: Pick<SkillTemplate, 'family' | 'params'>): boolean {
  if (t.family === 'mock' || contestUnsafeGame(t.family)) return false;
  if (t.family !== 'mix') return true;
  const parts = (t.params as { parts?: { family: string }[] }).parts ?? [];
  return !parts.some((p) => contestUnsafeGame(p.family));
}

/** Soal lomba lengkap (dengan kunci) yang disimpan di server. `key` = rahasia penyamar id pilihan. */
export type ContestItem = Item & { key: string; tier?: SkillTemplate['tier'] };

/**
 * Buat soal lomba (pure & deterministik untuk seed yang sama): skill tersebar ke semua topik, band
 * mudah → sulit, tanpa soal kembar bila variasinya cukup. Seed dibuat acak oleh server per peserta.
 */
export function buildContestItems(
  templates: readonly SkillTemplate[],
  count: number,
  seed: string,
): ContestItem[] {
  // Mock test (D-072) tidak membuat soal sendiri: tidak ikut jadi sumber soal lomba. Game kartu pasangan &
  // tangkap (D-075) butuh kunci jawaban di perangkat, jadi juga tidak ikut.
  templates = templates.filter(contestSafeTemplate);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const plan = planContestSkills(templates, count, seed);
  const rng = createRng(`items/${seed}`);
  const seen = new Set<string>();
  return plan.map((skillId, i) => {
    const tpl = byId.get(skillId)!;
    const band = contestBand(i, count);
    let pick: Item | undefined;
    for (let attempt = 0; attempt < 12; attempt++) {
      const item = generateItem(tpl, { seed: rng.int(1, 2_147_483_646), band });
      pick ??= item;
      const k = itemKey(item);
      if (!seen.has(k)) {
        pick = item;
        break;
      }
    }
    seen.add(itemKey(pick!));
    const key = Math.floor(rng.next() * 36 ** 8).toString(36);
    return { ...pick!, key, tier: tpl.tier };
  });
}

/** Semua id pilihan (kartu, kelompok, pasangan) di satu soal. */
function choiceIds(i: Interaction): string[] {
  switch (i.type) {
    case 'pick-one':
    case 'tap-all':
    case 'order':
      return i.choices.map((c) => c.id);
    case 'group':
      return [...i.groups, ...i.items].map((c) => c.id);
    case 'match':
      return [...i.left, ...i.right].map((c) => c.id);
    default:
      return [];
  }
}

/**
 * Penyamar id pilihan: id asli bisa membocorkan jawaban (mis. `n5`, `v0`), jadi perangkat hanya melihat
 * id acak yang diturunkan dari `key` rahasia soal. Mengembalikan peta asli → samaran.
 */
export function maskIds(item: Pick<ContestItem, 'interaction' | 'key'>): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Set<string>();
  for (const id of choiceIds(item.interaction)) {
    if (out.has(id)) continue;
    const rng = createRng(`${item.key}/${id}`);
    let masked: string;
    do masked = `k${Math.floor(rng.next() * 36 ** 6).toString(36)}`;
    while (used.has(masked));
    used.add(masked);
    out.set(id, masked);
  }
  return out;
}

const remap = (cs: readonly PublicChoice[], m: Map<string, string>) =>
  cs.map((c) => ({ ...c, id: m.get(c.id) ?? c.id }));

/** Soal lomba untuk perangkat: tanpa kunci (`publicItem`) + id pilihan disamarkan + tingkat suara. */
export function contestPublicItem(item: ContestItem): PublicItem & { tier?: string } {
  const m = maskIds(item);
  const p = publicItem(item, item.key);
  const i = p.interaction;
  let interaction: PublicInteraction = i;
  if (i.type === 'pick-one' || i.type === 'tap-all' || i.type === 'order')
    interaction = { ...i, choices: remap(i.choices, m) };
  else if (i.type === 'group')
    interaction = { ...i, groups: remap(i.groups, m), items: remap(i.items, m) };
  else if (i.type === 'match')
    interaction = { ...i, left: remap(i.left, m), right: remap(i.right, m) };
  return { ...p, interaction, ...(item.tier && { tier: item.tier }) };
}

/** Jawaban dari perangkat (id samaran) → id asli, lalu diperiksa dengan `checkAnswer`. */
export function checkContestAnswer(item: ContestItem, value: ContestAnswer['value']): boolean {
  const back = new Map([...maskIds(item)].map(([orig, masked]) => [masked, orig]));
  const un = (s: string) => back.get(s) ?? `?${s}`;
  const plain: AnswerValue =
    typeof value === 'string'
      ? un(value)
      : typeof value === 'number'
        ? value
        : Array.isArray(value)
          ? value.map(un)
          : Object.fromEntries(Object.entries(value).map(([k, v]) => [un(k), un(v)]));
  return checkAnswer(item, plain).correct;
}

/** Jawaban lebih cepat dari ini sejak jawaban sebelumnya (atau mulai) dicatat sebagai kejanggalan. */
export const CONTEST_FAST_MS = 1_500;

/**
 * Lama pengerjaan untuk peringkat: sampai kirim (bila dikirim), atau sampai jawaban terakhir; tidak pernah
 * melewati batas waktu peserta.
 */
export function contestTimeMs(e: {
  startedAt: Date;
  deadlineAt: Date;
  submittedAt: Date | null;
  lastAnswerAt: Date | null;
}): { timeMs: number; finishedAt: number } {
  const end = Math.min(
    (e.submittedAt ?? e.lastAnswerAt ?? e.deadlineAt).getTime(),
    e.deadlineAt.getTime(),
  );
  const finishedAt = Math.max(end, e.startedAt.getTime());
  return { timeMs: finishedAt - e.startedAt.getTime(), finishedAt };
}

/** Status peserta menurut jam server. */
export type ContestEntryStatus = 'none' | 'active' | 'done';
export function contestEntryStatus(
  e: { deadlineAt: Date; submittedAt: Date | null } | null | undefined,
  now: Date,
): ContestEntryStatus {
  if (!e) return 'none';
  if (e.submittedAt || now.getTime() > e.deadlineAt.getTime() + CONTEST_GRACE_MS) return 'done';
  return 'active';
}
