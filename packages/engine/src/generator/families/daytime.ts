import { z } from 'zod';
import type { ObjectId } from '../assets.js';
import type { Choice, Visual } from '../item.js';
import { between, defineFamily, range, reject } from './common.js';

/**
 * Pagi, siang, malam (P-MA-14, D-079): kesadaran waktu lewat kegiatan sehari-hari dan benda langit. Hanya
 * kegiatan yang waktunya jelas bagi anak (bangun tidur = pagi, tidur = malam), supaya tidak ada jawaban ganda.
 */

export const TIMES = ['pagi', 'siang', 'malam'] as const;
export type TimeOfDay = (typeof TIMES)[number];

type Activity = { object: ObjectId; say: string; time: TimeOfDay };
/** Kegiatan & benda yang jelas waktunya. */
export const ACTIVITIES: readonly Activity[] = [
  { object: 'anak-bangun', say: 'bangun tidur', time: 'pagi' },
  { object: 'anak-sekolah', say: 'berangkat sekolah', time: 'pagi' },
  { object: 'ayam', say: 'ayam berkokok', time: 'pagi' },
  { object: 'roti-lapis', say: 'sarapan', time: 'pagi' },
  { object: 'anak-berenang', say: 'berenang di bawah terik matahari', time: 'siang' },
  { object: 'topi', say: 'memakai topi saat panas terik', time: 'siang' },
  { object: 'anak-menyiram', say: 'menyiram tanaman yang kepanasan', time: 'siang' },
  { object: 'anak-tidur', say: 'tidur lelap', time: 'malam' },
  { object: 'ranjang', say: 'naik ke tempat tidur', time: 'malam' },
  { object: 'lilin', say: 'menyalakan lilin saat gelap', time: 'malam' },
];
/** Benda langit: matahari siang, bulan & bintang malam. */
const SKY: readonly Activity[] = [
  { object: 'matahari', say: 'matahari', time: 'siang' },
  { object: 'pelangi', say: 'pelangi', time: 'siang' },
  { object: 'bulan', say: 'bulan', time: 'malam' },
  { object: 'bintang', say: 'bintang', time: 'malam' },
];
/** Rutinitas berurutan (pagi dan malam). */
export const ROUTINES: Record<'pagi' | 'malam', readonly Activity[]> = {
  pagi: [
    { object: 'anak-bangun', say: 'bangun tidur', time: 'pagi' },
    { object: 'anak-mandi', say: 'mandi', time: 'pagi' },
    { object: 'roti-lapis', say: 'sarapan', time: 'pagi' },
    { object: 'anak-sekolah', say: 'berangkat sekolah', time: 'pagi' },
  ],
  malam: [
    { object: 'anak-makan', say: 'makan malam', time: 'malam' },
    { object: 'sikat-gigi', say: 'sikat gigi', time: 'malam' },
    { object: 'anak-membaca', say: 'membaca cerita', time: 'malam' },
    { object: 'anak-tidur', say: 'tidur', time: 'malam' },
  ],
};

const scene = (t: TimeOfDay): Visual => ({ kind: 'object', object: t });
const timeChoice = (t: TimeOfDay, id: string, tag?: string): Choice => ({
  id,
  visual: scene(t),
  say: t,
  ...(tag && { tag }),
});
const actChoice = (a: Activity, id: string, tag?: string): Choice => ({
  id,
  visual: { kind: 'object', object: a.object },
  say: a.say,
  ...(tag && { tag }),
});
const next: Record<TimeOfDay, TimeOfDay> = { pagi: 'siang', siang: 'malam', malam: 'pagi' };
const prev: Record<TimeOfDay, TimeOfDay> = { pagi: 'malam', siang: 'pagi', malam: 'siang' };

export const dayTimeFamily = defineFamily({
  description:
    'Pagi, siang, malam: kapan kegiatan terjadi, kegiatan di waktu tertentu, benda langit, urutkan waktu & rutinitas, sesudah/sebelum.',
  params: z.strictObject({
    mode: z
      .enum(['when', 'which', 'sky', 'order-times', 'routine', 'order-day', 'after'])
      .default('when'),
    /** when/which: banyak pilihan (2 atau 3 waktu). */
    choices: range(2, 3).default([3, 3]),
    /** routine/order-day: banyak kartu yang diurutkan. */
    steps: range(2, 4).default([3, 3]),
  }),
  generate(p, rng) {
    switch (p.mode) {
      case 'which': {
        const t = rng.pick(TIMES);
        const right = rng.pick(ACTIVITIES.filter((a) => a.time === t));
        const k = between(rng, p.choices);
        const wrong = rng
          .shuffle(TIMES.filter((x) => x !== t))
          .slice(0, k - 1)
          .map((x, i) =>
            actChoice(rng.pick(ACTIVITIES.filter((a) => a.time === x)), `a${i}`, `waktu-${x}`),
          );
        return {
          prompt: `Kegiatan mana yang biasanya ${t} hari?`,
          say: `Lihat gambarnya. Ini ${t} hari. Kegiatan mana yang biasanya kita lakukan ${t} hari?`,
          stimulus: [scene(t)],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([actChoice(right, 'ans'), ...wrong]),
            answer: 'ans',
          },
          reteach: {
            say: `${right.say} biasanya ${t} hari.`,
            show: [scene(t), { kind: 'object', object: right.object }],
          },
        };
      }
      case 'sky': {
        const s = rng.pick(SKY);
        if (rng.chance(0.5)) {
          // Sebaliknya: waktu → benda langitnya.
          const others = rng.shuffle(SKY.filter((x) => x.time !== s.time));
          const wrong = others[0]!;
          const extra = rng.chance(0.5) ? others.slice(1, 2) : [];
          return {
            prompt: `Benda apa yang terlihat di langit ${s.time} hari?`,
            say: `Lihat langitnya. Ini ${s.time} hari. Benda apa yang terlihat di langit?`,
            stimulus: [scene(s.time)],
            interaction: {
              type: 'pick-one',
              choices: rng.shuffle([
                actChoice(s, 'ans'),
                actChoice(wrong, 'w0', 'tertukar-siang-malam'),
                ...extra.map((x, i) => actChoice(x, `w${i + 1}`, 'tertukar-siang-malam')),
              ]),
              answer: 'ans',
              arrangement: 'row',
            },
            reteach: {
              say: `${s.say} terlihat ${s.time} hari. ${wrong.say} terlihat ${wrong.time} hari.`,
            },
          };
        }
        return {
          prompt: `Kapan ${s.say} terlihat di langit?`,
          say: `Kapan ${s.say} terlihat di langit? Siang atau malam?`,
          stimulus: [{ kind: 'object', object: s.object }],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([
              timeChoice(s.time, 'ans'),
              timeChoice(s.time === 'siang' ? 'malam' : 'siang', 'w0', 'tertukar-siang-malam'),
            ]),
            answer: 'ans',
            arrangement: 'row',
          },
          reteach: {
            say:
              s.time === 'siang'
                ? 'Matahari bersinar terang pada siang hari.'
                : `${s.say} terlihat pada malam hari, saat langit gelap.`,
          },
        };
      }
      case 'order-times': {
        // Urutan satu hari: pagi → siang → malam (kadang mulai dari siang/malam: … → pagi esok).
        const startAt: TimeOfDay = rng.chance(0.6) ? 'pagi' : rng.pick(['siang', 'malam'] as const);
        const order: TimeOfDay[] = [startAt, next[startAt], next[next[startAt]]];
        return {
          prompt: `Urutkan waktunya, mulai dari ${startAt}.`,
          say: `Urutkan waktunya. Mulai dari ${startAt}, lalu apa, lalu apa? Ketuk satu per satu.`,
          stimulus: [],
          interaction: {
            type: 'order',
            choices: rng.shuffle(order.map((t) => timeChoice(t, t))),
            answer: [...order],
          },
          reteach: {
            say: 'Setelah pagi datang siang. Setelah siang datang malam. Setelah malam, pagi lagi.',
          },
        };
      }
      case 'routine': {
        const which = rng.pick(['pagi', 'malam'] as const);
        const all = ROUTINES[which];
        const n = Math.min(between(rng, p.steps), all.length);
        const start = rng.int(0, all.length - n);
        const steps = all.slice(start, start + n);
        return {
          prompt: `Urutkan kegiatan ${which} hari.`,
          say: `Urutkan kegiatan ${which} hari. Mana yang dilakukan lebih dulu? Ketuk satu per satu.`,
          stimulus: [],
          interaction: {
            type: 'order',
            choices: rng.shuffle(steps.map((a, i) => actChoice(a, `r${i}`))),
            answer: steps.map((_, i) => `r${i}`),
          },
          reteach: { say: `Urutannya: ${steps.map((a) => a.say).join(', lalu ')}.` },
        };
      }
      case 'order-day': {
        const n = Math.min(between(rng, p.steps), 3);
        const times = TIMES.slice(0, n === 2 ? 2 : 3);
        const picks = (
          n === 2
            ? rng.sample([...TIMES], 2).sort((a, b) => TIMES.indexOf(a) - TIMES.indexOf(b))
            : times
        ).map((t) => rng.pick(ACTIVITIES.filter((a) => a.time === t)));
        if (new Set(picks.map((a) => a.object)).size !== picks.length) reject('kegiatan kembar');
        return {
          prompt: 'Urutkan kegiatan dari pagi sampai malam.',
          say: 'Urutkan kegiatannya dari pagi sampai malam. Ketuk yang paling dulu.',
          stimulus: [],
          interaction: {
            type: 'order',
            choices: rng.shuffle(picks.map((a, i) => actChoice(a, `d${i}`))),
            answer: picks.map((_, i) => `d${i}`),
          },
          reteach: { say: `${picks.map((a) => `${a.say}, ${a.time} hari`).join('. ')}.` },
        };
      }
      case 'after': {
        // Kadang lewat kegiatan: "Sesudah sarapan (pagi), datang waktu apa?"
        const act = rng.chance(0.6) ? rng.pick(ACTIVITIES) : undefined;
        const t = act?.time ?? rng.pick(TIMES);
        // Lewat kegiatan hanya "sesudah" (mis. sesudah sarapan pagi → siang), supaya kalimatnya wajar.
        const isAfter = act ? true : rng.chance(0.5);
        const answer = isAfter ? next[t] : prev[t];
        const what = act ? `${act.say} di waktu ${t}` : t;
        return {
          prompt: `${isAfter ? 'Sesudah' : 'Sebelum'} ${what}, waktu apa?`,
          say: `${isAfter ? 'Sesudah' : 'Sebelum'} ${what}, datang waktu apa?`,
          stimulus: [act ? { kind: 'object', object: act.object } : scene(t)],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([
              timeChoice(answer, 'ans'),
              timeChoice(isAfter ? prev[t] : next[t], 'w0', 'sesudah-sebelum-tertukar'),
              // Kadang 3 pilihan: waktu yang sama ikut jadi pengecoh.
              ...(rng.chance(0.5) ? [timeChoice(t, 'w1', 'waktu-yang-sama')] : []),
            ]),
            answer: 'ans',
            arrangement: 'row',
          },
          reteach: { say: 'Pagi, lalu siang, lalu malam, lalu pagi lagi.', show: TIMES.map(scene) },
        };
      }
      default: {
        const a = rng.pick(ACTIVITIES);
        const k = between(rng, p.choices);
        const wrong = rng
          .shuffle(TIMES.filter((x) => x !== a.time))
          .slice(0, k - 1)
          .map((x, i) => timeChoice(x, `t${i}`, `waktu-${x}`));
        return {
          prompt: `${a.say[0]!.toUpperCase()}${a.say.slice(1)}. Biasanya kapan?`,
          say: `Lihat gambarnya: ${a.say}. Biasanya pagi, siang, atau malam?`,
          stimulus: [{ kind: 'object', object: a.object }],
          interaction: {
            type: 'pick-one',
            choices: rng.shuffle([timeChoice(a.time, 'ans'), ...wrong]),
            answer: 'ans',
            arrangement: 'row',
          },
          reteach: { say: `${a.say} biasanya ${a.time} hari.`, show: [scene(a.time)] },
        };
      }
    }
  },
});
