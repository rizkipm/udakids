import { z } from 'zod';
import { OBJECT_IDS, type ObjectId } from '../assets.js';
import type { Choice, Visual } from '../item.js';
import { defineFamily, reject } from './common.js';

/**
 * Soal dari tabel fakta (sains). Fakta ditulis SEKALI per topik lengkap dengan sumbernya, lalu generator
 * membuat variasi soal: tanya nilai (organ → fungsi), tanya nama (fungsi → organ), cari yang bukan
 * anggota kelompok, atau benar/salah. Jawaban selalu tunggal karena pengecoh diambil dari entitas yang
 * TIDAK memiliki nilai tersebut.
 */
const value = z.union([z.string().min(1).max(80), z.array(z.string().min(1).max(80)).min(1)]);
const row = z.strictObject({
  name: z.string().min(1).max(60),
  object: z.enum(OBJECT_IDS as [ObjectId, ...ObjectId[]]).optional(),
  attrs: z.record(z.string(), value),
});
const TEMPLATE_KEYS = /\{(name|value)\}/g;

export const factsFamily = defineFamily({
  description:
    'Soal dari tabel fakta bersumber: tanya nilai, tanya nama, cari yang bukan anggota, atau benar/salah.',
  params: z
    .strictObject({
      table: z.array(row).min(3).max(80),
      attr: z.string().min(1),
      ask: z.enum(['value', 'name', 'odd', 'true-false']).default('name'),
      /** Hanya baris yang atributnya berisi salah satu nilai ini (mis. hanya hewan darat). */
      only: z.array(z.string()).optional(),
      prompt: z.string().min(1).max(500),
      explain: z.string().min(1).max(400),
      choices: z.number().int().min(2).max(4).default(4),
      /** Tampilkan gambar benda (untuk anak yang belum lancar membaca). */
      pictures: z.boolean().default(false),
      source: z.string().min(3).max(300),
    })
    .superRefine((p, ctx) => {
      const have = p.table.filter((r) => r.attrs[p.attr] !== undefined);
      if (have.length < 3)
        ctx.addIssue({ code: 'custom', message: `atribut "${p.attr}" ada di kurang dari 3 baris` });
      for (const m of [...p.prompt.matchAll(/\{(\w+)\}/g), ...p.explain.matchAll(/\{(\w+)\}/g)]) {
        if (m[1] !== 'name' && m[1] !== 'value')
          ctx.addIssue({ code: 'custom', message: `template "{${m[1]}}" tidak dikenal` });
      }
      if (p.pictures && have.some((r) => !r.object))
        ctx.addIssue({ code: 'custom', message: 'pictures: setiap baris butuh `object`' });
    }),
  generate(p, rng) {
    const valuesOf = (r: z.infer<typeof row>): string[] => {
      const v = r.attrs[p.attr];
      return v === undefined ? [] : Array.isArray(v) ? v : [v];
    };
    let rows = p.table.filter((r) => valuesOf(r).length > 0);
    if (p.only) rows = rows.filter((r) => valuesOf(r).some((v) => p.only!.includes(v)));
    const fill = (t: string, name: string, v: string) =>
      t.replace(TEMPLATE_KEYS, (_, k: string) => (k === 'name' ? name : v));
    const entityChoice = (r: z.infer<typeof row>, _i: number, tag?: string): Choice => ({
      id: `e${p.table.indexOf(r)}`,
      visual: (p.pictures && r.object
        ? { kind: 'object', object: r.object }
        : { kind: 'text', text: r.name }) as Visual,
      say: r.name,
      ...(tag && { tag }),
    });
    const textChoice = (text: string, id: string, tag?: string): Choice => ({
      id,
      visual: { kind: 'text', text },
      say: text,
      ...(tag && { tag }),
    });

    if (p.ask === 'value') {
      const target = rng.pick(rows);
      const own = valuesOf(target);
      const answer = rng.pick(own);
      const others = [...new Set(p.table.flatMap(valuesOf))].filter((v) => !own.includes(v));
      if (others.length < p.choices - 1) reject('nilai pengecoh kurang');
      const choices = rng.shuffle([
        textChoice(answer, 'v0'),
        ...rng
          .sample(others, p.choices - 1)
          .map((v, i) => textChoice(v, `v${i + 1}`, 'fakta-tertukar')),
      ]);
      return {
        prompt: fill(p.prompt, target.name, answer),
        stimulus: p.pictures && target.object ? [{ kind: 'object', object: target.object }] : [],
        interaction: { type: 'pick-one', choices, answer: 'v0' },
        reteach: { say: fill(p.explain, target.name, answer) },
      };
    }

    if (p.ask === 'name' || p.ask === 'true-false') {
      const target = rng.pick(rows);
      const v = rng.pick(valuesOf(target));
      const wrong = p.table.filter((r) => valuesOf(r).length > 0 && !valuesOf(r).includes(v));
      if (p.ask === 'true-false') {
        // Pernyataan benar (baris yang punya nilai) atau salah (baris yang tidak punya nilai itu).
        const truth = rng.chance(0.5) || wrong.length === 0;
        const subject = truth ? target : rng.pick(wrong);
        const choices = [
          textChoice('Benar', 'benar', truth ? undefined : 'benar-salah-terbalik'),
          textChoice('Salah', 'salah', truth ? 'benar-salah-terbalik' : undefined),
        ];
        return {
          prompt: fill(p.prompt, subject.name, v),
          stimulus:
            p.pictures && subject.object ? [{ kind: 'object', object: subject.object }] : [],
          interaction: {
            type: 'pick-one',
            choices,
            answer: truth ? 'benar' : 'salah',
            arrangement: 'row',
          },
          // Pernyataan salah: jelaskan fakta yang benar untuk subjek itu sendiri.
          reteach: { say: fill(p.explain, subject.name, truth ? v : valuesOf(subject)[0]!) },
        };
      }
      if (wrong.length < p.choices - 1) reject('entitas pengecoh kurang');
      const choices = rng.shuffle([
        entityChoice(target, 0),
        ...rng.sample(wrong, p.choices - 1).map((r, i) => entityChoice(r, i + 1, 'fakta-tertukar')),
      ]);
      return {
        prompt: fill(p.prompt, target.name, v),
        stimulus: [],
        interaction: {
          type: 'pick-one',
          choices,
          answer: entityChoice(target, 0).id,
          arrangement: p.pictures ? 'row' : 'grid',
        },
        reteach: { say: fill(p.explain, target.name, v) },
      };
    }

    // odd: (choices − 1) anggota kelompok + 1 yang bukan.
    const groups = [...new Set(rows.flatMap(valuesOf))].filter(
      (v) => rows.filter((r) => valuesOf(r).includes(v)).length >= p.choices - 1,
    );
    if (groups.length === 0) reject('kelompok kurang anggota');
    const v = rng.pick(groups);
    const members = rng.sample(
      rows.filter((r) => valuesOf(r).includes(v)),
      p.choices - 1,
    );
    const outsiders = p.table.filter((r) => valuesOf(r).length > 0 && !valuesOf(r).includes(v));
    if (outsiders.length === 0) reject('tidak ada yang bukan anggota');
    const odd = rng.pick(outsiders);
    const choices = rng.shuffle([
      entityChoice(odd, 0),
      ...members.map((r, i) => entityChoice(r, i + 1, 'anggota-kelompok')),
    ]);
    return {
      prompt: fill(p.prompt, odd.name, v),
      stimulus: [],
      interaction: {
        type: 'pick-one',
        choices,
        answer: entityChoice(odd, 0).id,
        arrangement: p.pictures ? 'row' : 'grid',
      },
      reteach: { say: fill(p.explain, odd.name, v) },
    };
  },
});
