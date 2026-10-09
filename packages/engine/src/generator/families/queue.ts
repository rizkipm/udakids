import { z } from 'zod';
import { OBJECTS, type ObjectId } from '../assets.js';
import type { Choice } from '../item.js';
import { numberWord, ordinalWord } from '../words.js';
import { between, defineFamily, numberChoices, range, reject } from './common.js';

/**
 * Pertama sampai kelima (P-MA-05, D-079): bilangan urutan dalam antrean hewan atau kendaraan. Antrean dibaca
 * dari kiri (paling kiri = pertama), sama seperti soal urutan di buku lain. Pengecoh: kurang/lebih satu posisi
 * dan menghitung dari kanan.
 */

export const QUEUE_THEMES = {
  hewan: ['kucing', 'ayam', 'sapi', 'bebek', 'kelinci', 'gajah', 'kura-kura', 'kambing', 'anjing'],
  kendaraan: ['mobil', 'bus', 'truk', 'motor', 'sepeda', 'kereta', 'van', 'traktor', 'perahu'],
} as const satisfies Record<string, readonly ObjectId[]>;

const say = (o: ObjectId) => OBJECTS[o].say;
const member = (o: ObjectId, i: number, tag?: string): Choice => ({
  id: `q${i + 1}`,
  visual: { kind: 'object', object: o },
  say: say(o),
  ...(tag && { tag }),
});
/** Tanda pengecoh untuk anggota antrean ke-`at` (1 = paling kiri) bila jawabannya urutan ke-`pos`. */
const posTag = (at: number, pos: number, length: number) =>
  at === pos - 1
    ? 'kurang-satu'
    : at === pos + 1
      ? 'lebih-satu'
      : at === length - pos + 1
        ? 'hitung-dari-kanan'
        : 'lain';
const countUp = (n: number) => Array.from({ length: n }, (_, i) => ordinalWord(i + 1)).join(', ');

export const queueFamily = defineFamily({
  description:
    'Antrean hewan/kendaraan: pertama sampai kelima (ketuk urutan ke-n, paling depan/belakang, ke berapa, sebelum/sesudah, berapa di depan, susun antrean).',
  params: z.strictObject({
    theme: z.enum(['hewan', 'kendaraan']).default('hewan'),
    mode: z.enum(['tap', 'ends', 'which', 'tap-two', 'next-to', 'ahead', 'build']).default('tap'),
    /** Panjang antrean. */
    length: range(3, 5).default([3, 5]),
    /** Urutan terbesar yang ditanyakan (pertama … kelima). */
    upTo: z.number().int().min(1).max(5).default(5),
    choices: range(2, 4).default([3, 3]),
  }),
  generate(p, rng) {
    const length = between(rng, p.length);
    const queue = rng.sample(QUEUE_THEMES[p.theme], length) as ObjectId[];
    const pos = rng.int(1, Math.min(p.upTo, length));
    const stimRow = {
      kind: 'row' as const,
      items: queue.map((o) => ({ kind: 'object' as const, object: o })),
    };
    const who = queue[pos - 1]!;
    switch (p.mode) {
      case 'ends': {
        const last = rng.chance(0.5);
        const at = last ? length : 1;
        const word = last ? 'paling belakang (terakhir)' : 'paling depan (pertama)';
        return {
          prompt: `Antrean dari kiri. Siapa yang ${word}?`,
          say: `Antrean dimulai dari kiri. Ketuk yang ${last ? 'paling belakang, yang terakhir' : 'paling depan, yang pertama'}.`,
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices: queue.map((o, i) =>
              member(o, i, i + 1 === at ? undefined : last ? 'pilih-pertama' : 'pilih-terakhir'),
            ),
            answer: `q${at}`,
            arrangement: 'row',
          },
          reteach: {
            say: `Yang paling kiri adalah pertama: ${say(queue[0]!)}. Yang paling kanan adalah terakhir: ${say(queue[length - 1]!)}.`,
          },
        };
      }
      case 'which': {
        const k = between(rng, p.choices);
        const wrong = rng
          .shuffle(
            [pos - 1, pos + 1, length - pos + 1, 1, 2, 3, 4, 5].filter(
              (v) => v >= 1 && v <= Math.min(5, length) && v !== pos,
            ),
          )
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, k - 1);
        if (wrong.length < k - 1) reject('antrean terlalu pendek');
        const card = (v: number, id: string, tag?: string): Choice => ({
          id,
          visual: { kind: 'word', text: ordinalWord(v) },
          say: ordinalWord(v),
          ...(tag && { tag }),
        });
        return {
          prompt: `${say(who)} ada di urutan ke berapa dari kiri?`,
          say: `Lihat antreannya dari kiri. ${say(who)} ada di urutan ke berapa?`,
          stimulus: [stimRow],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([
              card(pos, 'ans'),
              ...wrong.map((v, i) => card(v, `w${i}`, posTag(v, pos, length))),
            ]),
            answer: 'ans',
          },
          reteach: {
            say: `Hitung dari kiri: ${countUp(pos)}. ${say(who)} yang ${ordinalWord(pos)}.`,
          },
        };
      }
      case 'tap-two': {
        if (length < 4) reject('butuh antrean 4–5');
        const [a, b] = rng
          .sample(
            Array.from({ length: Math.min(p.upTo, length) }, (_, i) => i + 1),
            2,
          )
          .sort() as [number, number];
        return {
          prompt: `Ketuk yang ${ordinalWord(a)} dan yang ${ordinalWord(b)} dari kiri.`,
          say: `Hitung dari kiri. Ketuk yang ${ordinalWord(a)} dan yang ${ordinalWord(b)}, lalu tekan Periksa.`,
          stimulus: [],
          interaction: {
            type: 'tap-all',
            choices: queue.map((o, i) => member(o, i)),
            answer: [`q${a}`, `q${b}`],
          },
          reteach: {
            say: `Hitung dari kiri: ${countUp(b)}. Yang ${ordinalWord(a)} ${say(queue[a - 1]!)}, yang ${ordinalWord(b)} ${say(queue[b - 1]!)}.`,
          },
        };
      }
      case 'next-to': {
        const after = rng.chance(0.5);
        const ref = after ? rng.int(1, length - 1) : rng.int(2, length);
        const target = after ? ref + 1 : ref - 1;
        return {
          prompt: `Siapa yang tepat ${after ? 'di belakang' : 'di depan'} ${say(queue[ref - 1]!)}?`,
          say: `Antrean menghadap ke kiri. Siapa yang tepat ${after ? 'di belakang' : 'di depan'} ${say(queue[ref - 1]!)}?`,
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices: queue.map((o, i) =>
              member(
                o,
                i,
                i + 1 === target
                  ? undefined
                  : i + 1 === ref
                    ? 'dirinya-sendiri'
                    : i + 1 === (after ? ref - 1 : ref + 1)
                      ? 'arah-terbalik'
                      : 'lain',
              ),
            ),
            answer: `q${target}`,
            arrangement: 'row',
          },
          reteach: {
            say: `Yang di depan ada di sebelah kiri, yang di belakang ada di sebelah kanan. Jadi jawabannya ${say(queue[target - 1]!)}.`,
          },
        };
      }
      case 'ahead': {
        if (pos < 2) reject('butuh paling sedikit satu di depan');
        const n = pos - 1;
        return {
          prompt: `Ada berapa yang di depan ${say(who)}?`,
          say: `Antrean dari kiri. Ada berapa yang berdiri di depan ${say(who)}?`,
          stimulus: [stimRow],
          interaction: {
            type: 'pick-one',
            choices: numberChoices(rng, n, {
              count: between(rng, p.choices),
              min: 0,
              max: length,
              tagged: [
                { value: pos, tag: 'termasuk-dirinya' },
                { value: length - pos, tag: 'hitung-di-belakang' },
              ],
            }).map((c) => ({ ...c, say: numberWord((c.visual as { value: number }).value) })),
            answer: `n${n}`,
          },
          reteach: {
            say: `${say(who)} yang ${ordinalWord(pos)}. Di depannya ada ${numberWord(n)}.`,
          },
        };
      }
      case 'build': {
        const steps = queue.map((o, i) => `${say(o)} ${ordinalWord(i + 1)}`).join(', ');
        return {
          prompt: `Susun antrean: ${steps}.`,
          say: `Susun antreannya. ${steps}. Ketuk satu per satu dari yang pertama.`,
          stimulus: [],
          interaction: {
            type: 'order',
            choices: rng.shuffle(queue.map((o, i) => member(o, i))),
            answer: queue.map((_, i) => `q${i + 1}`),
          },
          reteach: {
            say: `Mulai dari yang pertama: ${say(queue[0]!)}. Lalu ${queue.slice(1).map(say).join(', lalu ')}.`,
          },
        };
      }
      default:
        return {
          prompt: `Ketuk yang ${ordinalWord(pos)} dari kiri.`,
          say: `Hitung dari kiri. Ketuk ${p.theme === 'hewan' ? 'hewan' : 'kendaraan'} yang ${ordinalWord(pos)}.`,
          stimulus: [],
          interaction: {
            type: 'pick-one',
            choices: queue.map((o, i) =>
              member(o, i, i + 1 === pos ? undefined : posTag(i + 1, pos, length)),
            ),
            answer: `q${pos}`,
            arrangement: 'row',
          },
          reteach: {
            say: `Hitung dari kiri: ${countUp(pos)}. Ini yang ${ordinalWord(pos)}: ${say(who)}.`,
          },
        };
    }
  },
});
