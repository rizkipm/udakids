import { z } from 'zod';
import { OBJECTS, type ObjectId } from '../assets.js';
import type { Choice } from '../item.js';
import { between, defineFamily, range, reject } from './common.js';

/**
 * Dengar bunyi di sekitarku (P-BT-01, D-081): membedakan bunyi hewan, kendaraan, dan alat musik/benda. Bunyi
 * ditirukan suara Momo (onomatope Indonesia, keputusan pemilik produk) — belum ada file efek suara.
 */

export const SOUND_GROUPS = ['hewan', 'kendaraan', 'benda'] as const;
export type SoundGroup = (typeof SOUND_GROUPS)[number];
export type SoundMaker = { object: ObjectId; sound: string; group: SoundGroup };

/** Bunyi tiap benda (ditulis seperti diucapkan, diulang agar jelas). */
export const SOUND_MAKERS: readonly SoundMaker[] = [
  { object: 'ayam', sound: 'kukuruyuk', group: 'hewan' },
  { object: 'kucing', sound: 'meong meong', group: 'hewan' },
  { object: 'anjing', sound: 'guk guk', group: 'hewan' },
  { object: 'bebek', sound: 'kwek kwek', group: 'hewan' },
  { object: 'sapi', sound: 'mooo', group: 'hewan' },
  { object: 'kambing', sound: 'embeek', group: 'hewan' },
  { object: 'burung', sound: 'cuit cuit', group: 'hewan' },
  { object: 'katak', sound: 'kwok kwok', group: 'hewan' },
  { object: 'lebah', sound: 'nguuung', group: 'hewan' },
  { object: 'mobil', sound: 'tin tin', group: 'kendaraan' },
  { object: 'kereta', sound: 'tut tut, jes jes', group: 'kendaraan' },
  { object: 'motor', sound: 'brem brem', group: 'kendaraan' },
  { object: 'sepeda', sound: 'kring kring', group: 'kendaraan' },
  { object: 'kapal', sound: 'tuuut', group: 'kendaraan' },
  { object: 'helikopter', sound: 'tak tak tak', group: 'kendaraan' },
  { object: 'drum', sound: 'dung dung dung', group: 'benda' },
  { object: 'xilofon', sound: 'ting ting ting', group: 'benda' },
  { object: 'jam-dinding', sound: 'tik tok tik tok', group: 'benda' },
  { object: 'keran', sound: 'tes tes tes', group: 'benda' },
  { object: 'pintu', sound: 'tok tok tok', group: 'benda' },
];
/** Benda yang tidak berbunyi sendiri (pengecoh "mana yang berbunyi"). */
export const SILENT: readonly ObjectId[] = [
  'batu',
  'buku',
  'bunga',
  'kursi',
  'daun',
  'pohon',
  'apel',
  'topi',
];

const GROUP_NAME: Record<SoundGroup, string> = {
  hewan: 'hewan',
  kendaraan: 'kendaraan',
  benda: 'alat musik atau benda',
};
const say = (m: SoundMaker) => `${OBJECTS[m.object].say}: ${m.sound}`;
const pic = (m: SoundMaker, id: string, tag?: string): Choice => ({
  id,
  visual: { kind: 'object', object: m.object },
  say: say(m),
  ...(tag && { tag }),
});

export const soundFamily = defineFamily({
  description:
    'Dengar bunyi (ditirukan Momo): tebak hewan/kendaraan/benda dari bunyinya, cocokkan gambar dengan bunyi, sama atau beda, mana yang berbunyi.',
  params: z.strictObject({
    mode: z.enum(['listen', 'match', 'same', 'makes-sound']).default('listen'),
    /** Kelompok yang dipakai (listen: pilihan dari kelompok yang sama bila hanya satu). */
    groups: z.array(z.enum(SOUND_GROUPS)).min(1).max(3).default(['hewan']),
    choices: range(2, 4).default([3, 3]),
    /** match: banyak pasangan; makes-sound: banyak kartu. */
    items: range(2, 6).default([3, 3]),
  }),
  generate(p, rng) {
    const pool = SOUND_MAKERS.filter((m) => p.groups.includes(m.group));
    const k = between(rng, p.choices);
    switch (p.mode) {
      case 'match': {
        const n = Math.min(between(rng, p.items), pool.length);
        const picked = rng.sample(pool, n);
        const left = picked.map((m, i) => pic(m, `p${i}`));
        const right = rng.shuffle(
          picked.map((m, i): Choice => ({
            id: `s${i}`,
            visual: { kind: 'word', text: m.sound.split(',')[0]! },
            say: m.sound,
          })),
        );
        return {
          prompt: 'Cocokkan gambar dengan bunyinya.',
          say: 'Ketuk kartu bunyi untuk mendengarnya, lalu pasangkan dengan gambar yang berbunyi seperti itu.',
          stimulus: [],
          interaction: {
            type: 'match',
            left,
            right,
            answer: Object.fromEntries(picked.map((_, i) => [`p${i}`, `s${i}`])),
          },
          reteach: { say: picked.map(say).join('. ') + '.' },
        };
      }
      case 'same': {
        const a = rng.pick(pool);
        const same = rng.chance(0.5);
        const b = same ? a : rng.pick(pool.filter((m) => m.sound !== a.sound));
        return {
          prompt: 'Dengarkan dua bunyi. Sama atau beda?',
          say: `Dengarkan baik-baik. Bunyi pertama: ${a.sound}. Bunyi kedua: ${b.sound}. Sama atau beda?`,
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices: [
              {
                id: 'ya',
                visual: { kind: 'yesno', value: true },
                say: 'sama',
                ...(same ? {} : { tag: 'kira-sama' }),
              },
              {
                id: 'tidak',
                visual: { kind: 'yesno', value: false },
                say: 'beda',
                ...(same ? { tag: 'kira-beda' } : {}),
              },
            ],
            answer: same ? 'ya' : 'tidak',
            arrangement: 'row',
          },
          reteach: {
            say: same
              ? `Keduanya ${a.sound}. Jadi sama.`
              : `Yang pertama ${a.sound}, yang kedua ${b.sound}. Jadi beda.`,
          },
        };
      }
      case 'makes-sound': {
        const n = between(rng, p.items);
        const hits = rng.int(1, Math.max(1, Math.floor(n / 2)));
        const loud = rng.sample(pool, Math.min(hits, pool.length));
        const quiet = rng.sample(SILENT, Math.min(n - loud.length, SILENT.length));
        if (!quiet.length) reject('butuh benda yang tidak berbunyi');
        const cards = rng
          .shuffle([
            ...loud.map((m) => ({ c: pic(m, ''), ok: true })),
            ...quiet.map((o) => ({
              c: { id: '', visual: { kind: 'object', object: o }, say: OBJECTS[o].say } as Choice,
              ok: false,
            })),
          ])
          .map((x, i) => ({ ...x, c: { ...x.c, id: `c${i}` } }));
        return {
          prompt: 'Ketuk semua yang bisa berbunyi.',
          say: 'Ketuk semua yang bisa berbunyi, lalu tekan Periksa. Ketuk gambarnya untuk mendengar.',
          stimulus: [],
          interaction: {
            type: 'tap-all',
            choices: cards.map((x) => x.c),
            answer: cards.filter((x) => x.ok).map((x) => x.c.id),
          },
          reteach: { say: `${loud.map(say).join('. ')}. Yang lain diam, tidak berbunyi sendiri.` },
        };
      }
      default: {
        const m = rng.pick(pool);
        // Satu kelompok: pengecoh dari kelompok yang sama (lebih teliti); campuran: dari kelompok lain juga.
        const others = SOUND_MAKERS.filter(
          (x) =>
            x.object !== m.object &&
            x.sound !== m.sound &&
            (p.groups.length === 1 ? x.group === m.group : p.groups.includes(x.group)),
        );
        if (others.length < k - 1) reject('pengecoh kurang');
        const wrong = rng
          .sample(others, k - 1)
          .map((x, i) =>
            pic(x, `w${i}`, x.group === m.group ? 'bunyi-mirip-kelompok' : 'kelompok-lain'),
          );
        return {
          prompt: `Dengarkan bunyinya. Bunyi ${GROUP_NAME[m.group]} apa?`,
          say: `Dengarkan. ${m.sound}! ${m.sound}! Siapa yang berbunyi seperti itu?`,
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([pic(m, 'ans'), ...wrong]),
            answer: 'ans',
          },
          reteach: {
            say: `${say(m)}. Dengarkan lagi: ${m.sound}.`,
            show: [{ kind: 'object', object: m.object }],
          },
        };
      }
    }
  },
});
