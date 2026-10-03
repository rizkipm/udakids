import { z } from 'zod';
import { evalBool, evalNumber, exprVariables } from '../expr.js';
import type { Choice, Visual } from '../item.js';
import { visualSchema } from '../visual-schema.js';
import { numberWord } from '../words.js';
import { defineFamily, reject } from './common.js';

/**
 * PRD A10 dalam bentuk umum (kelas 3+): kalimat soal ber-template + variabel acak + constraint +
 * ekspresi jawaban/pengecoh, dievaluasi evaluator aman (tanpa eval). Mendukung bilangan cacah,
 * desimal, dan pecahan, pilihan ganda atau isian singkat (format OSN), serta pembahasan.
 *
 * Template teks: `{a}` = nilai variabel (format id-ID: 1.250 / 0,5), `{nama}` = kata dari `words`,
 * `{=a*b}` = ekspresi. Di `stimulus`, string yang diawali "=" dievaluasi menjadi angka.
 */

const exprSchema = z.string().min(1).max(240);
const varSpec = z.union([
  z.tuple([z.number(), z.number()]),
  z.strictObject({ values: z.array(z.number()).min(1).max(50) }),
  z.strictObject({ range: z.tuple([z.number(), z.number()]), step: z.number().positive() }),
]);
const numDistractor = z.union([
  exprSchema,
  z.strictObject({ expr: exprSchema, tag: z.string().min(1).max(40) }),
]);
const fracDistractor = z.strictObject({
  num: exprSchema,
  den: exprSchema,
  tag: z.string().min(1).max(40),
});

const ROUND = 1e6;
const clean = (x: number) => Math.round(x * ROUND) / ROUND;

/** Angka gaya Indonesia: 12.500 dan 0,25. */
export const formatId = (n: number, maxDecimals = 3) =>
  clean(n).toLocaleString('id-ID', { maximumFractionDigits: maxDecimals });

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const simplify = (n: number, d: number): [number, number] => {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};

const TEMPLATE_RE = /\{(=[^}]+|w:[a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*)\}/g;

export const exprFamily = defineFamily({
  description:
    'Soal hitung ber-template (PRD A10): variabel, constraint, jawaban & pengecoh sebagai ekspresi; bilangan, desimal, pecahan; pilihan ganda atau isian.',
  params: z
    .strictObject({
      vars: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), varSpec).default({}),
      /** Variabel turunan, dihitung berurutan setelah `vars`. */
      derived: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), exprSchema).default({}),
      words: z
        .record(z.string().regex(/^[a-z][a-z0-9_]*$/), z.array(z.string().min(1).max(40)).min(1))
        .default({}),
      constraint: exprSchema.optional(),
      prompt: z.string().min(1).max(500),
      say: z.string().max(500).optional(),
      stimulus: z.array(z.unknown()).max(4).default([]),
      format: z.enum(['number', 'decimal', 'fraction']).default('number'),
      answer: exprSchema.optional(),
      fraction: z
        .strictObject({ num: exprSchema, den: exprSchema, simplify: z.boolean().default(true) })
        .optional(),
      unit: z.string().max(12).optional(),
      distractors: z.array(z.union([numDistractor, fracDistractor])).default([]),
      mode: z.enum(['choice', 'input']).default('choice'),
      choices: z.number().int().min(2).max(5).default(4),
      /** Jawaban negatif diizinkan (default tidak). */
      allowNegative: z.boolean().default(false),
      explain: z.string().min(1).max(500),
      /**
       * Jawaban kategori: nilai `answer` (angka) dipetakan ke teks, mis. {"1": ">", "2": "<", "3": "="}.
       * Semua label menjadi pilihan; pengecoh diabaikan.
       */
      labels: z.record(z.string().regex(/^-?\d+$/), z.string().min(1).max(40)).optional(),
    })
    .superRefine((p, ctx) => {
      const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
      if (p.format === 'fraction' && p.mode === 'input')
        issue('isian belum mendukung jawaban pecahan');
      if (p.labels && p.mode === 'input') issue('`labels` hanya untuk mode pilihan');
      if (p.labels && Object.keys(p.labels).length < 2) issue('`labels` butuh minimal 2 kategori');
      if (p.format === 'fraction' ? !p.fraction : !p.answer)
        issue(p.format === 'fraction' ? 'format pecahan butuh `fraction`' : 'butuh `answer`');
      const known = new Set([...Object.keys(p.vars), ...Object.keys(p.derived)]);
      const exprs = [
        p.constraint,
        p.answer,
        p.fraction?.num,
        p.fraction?.den,
        ...Object.values(p.derived),
        ...p.distractors.flatMap((d) =>
          typeof d === 'string' ? [d] : 'expr' in d ? [d.expr] : [d.num, d.den],
        ),
      ];
      for (const src of exprs) {
        if (!src) continue;
        try {
          for (const v of exprVariables(src))
            if (!known.has(v)) issue(`ekspresi "${src}" memakai variabel tak dikenal "${v}"`);
        } catch (err) {
          issue(`ekspresi "${src}" tidak valid: ${(err as Error).message}`);
        }
      }
      for (const text of [p.prompt, p.say ?? '', p.explain]) {
        for (const m of text.matchAll(TEMPLATE_RE)) {
          const name = m[1]!;
          const bare = name.startsWith('w:') ? name.slice(2) : name;
          if (!name.startsWith('=') && !known.has(bare) && !(bare in p.words) && bare !== 'answer')
            issue(`template "{${name}}" tidak dikenal`);
        }
      }
    }),
  generate(p, rng) {
    const vars: Record<string, number> = {};
    for (const [name, spec] of Object.entries(p.vars)) {
      if (Array.isArray(spec)) vars[name] = rng.int(spec[0], spec[1]);
      else if ('values' in spec) vars[name] = rng.pick(spec.values);
      else {
        const steps = Math.floor(clean((spec.range[1] - spec.range[0]) / spec.step));
        vars[name] = clean(spec.range[0] + rng.int(0, steps) * spec.step);
      }
    }
    for (const [name, src] of Object.entries(p.derived)) vars[name] = clean(evalNumber(src, vars));
    const words = Object.fromEntries(
      Object.entries(p.words).map(([k, list]) => [k, rng.pick(list)]),
    );
    if (p.constraint && !evalBool(p.constraint, vars)) reject('constraint');

    // Jawaban.
    let answerText: string;
    let answerKey: string;
    let choices: Choice[] = [];
    let answerValue = 0;
    // Derajat dan persen menempel pada angka (90°, 50%); satuan lain diberi spasi.
    const unit = p.unit ? (/^[°%]/.test(p.unit) ? p.unit : ` ${p.unit}`) : '';
    if (p.format === 'fraction') {
      const rawN = evalNumber(p.fraction!.num, vars);
      const rawD = evalNumber(p.fraction!.den, vars);
      const [n, d] = p.fraction!.simplify ? simplify(rawN, rawD) : [rawN, rawD];
      if (!Number.isInteger(n) || !Number.isInteger(d) || d <= 0 || n < 0)
        reject('pecahan tidak valid');
      answerText = `${n}/${d}`;
      answerKey = `f${n}-${d}`;
      answerValue = n / d;
      const seen = new Set([clean(n / d)]);
      const out: Choice[] = [
        { id: answerKey, visual: { kind: 'fraction', num: n, den: d }, say: `${n} per ${d}` },
      ];
      for (const dist of p.distractors) {
        if (typeof dist === 'string' || !('num' in dist)) continue;
        const dn = evalNumber(dist.num, vars);
        const dd = evalNumber(dist.den, vars);
        if (!Number.isInteger(dn) || !Number.isInteger(dd) || dd <= 0 || dn < 0) continue;
        // Pecahan yang nilainya sama dengan jawaban (mis. 2/4 vs 1/2) bukan pengecoh.
        if (seen.has(clean(dn / dd))) continue;
        seen.add(clean(dn / dd));
        out.push({
          id: `f${dn}-${dd}`,
          visual: { kind: 'fraction', num: dn, den: dd },
          say: `${dn} per ${dd}`,
          tag: dist.tag,
        });
      }
      if (p.mode === 'choice' && out.length < p.choices) reject('pengecoh pecahan kurang');
      choices = rng.shuffle([out[0]!, ...rng.shuffle(out.slice(1)).slice(0, p.choices - 1)]);
    } else if (p.labels) {
      const raw = clean(evalNumber(p.answer!, vars));
      const text = p.labels[String(raw)];
      if (text === undefined) reject(`jawaban ${raw} tidak punya label`);
      answerValue = raw;
      answerText = text!;
      answerKey = `l${raw}`;
      choices = rng.shuffle(
        Object.entries(p.labels).map(([k, t]) => ({
          id: `l${k}`,
          visual: { kind: 'text', text: t } as Visual,
          say: t,
          ...(k !== String(raw) && { tag: 'label-lain' }),
        })),
      );
    } else {
      const raw = clean(evalNumber(p.answer!, vars));
      if (!Number.isFinite(raw)) reject('jawaban tidak hingga');
      if (p.format === 'number' && !Number.isInteger(raw)) reject('jawaban bukan bilangan bulat');
      if (!p.allowNegative && raw < 0) reject('jawaban negatif');
      answerValue = raw;
      answerText = `${formatId(raw)}${unit}`;
      answerKey = `v${raw}`;
      const pool = new Map<number, string>();
      const ok = (v: number) =>
        Number.isFinite(v) &&
        v !== raw &&
        (p.allowNegative || v >= 0) &&
        (p.format !== 'number' || Number.isInteger(v));
      for (const d of p.distractors) {
        if (typeof d !== 'string' && !('expr' in d)) continue;
        let v: number;
        try {
          v = clean(evalNumber(typeof d === 'string' ? d : d.expr, vars));
        } catch {
          continue;
        }
        if (ok(v) && !pool.has(v)) pool.set(v, typeof d === 'string' ? d : d.tag);
      }
      // Isi kekurangan dengan angka dekat (tetap satu jawaban benar).
      const step = p.format === 'decimal' ? 0.1 : Math.max(1, Math.round(Math.abs(raw) / 10));
      for (const k of [1, -1, 2, -2, 3, -3, 5, -5, 10]) {
        if (pool.size >= p.choices - 1) break;
        const v = clean(raw + k * step);
        if (ok(v) && !pool.has(v)) pool.set(v, 'lain');
      }
      if (p.mode === 'choice' && pool.size < p.choices - 1) reject('pengecoh kurang');
      const picked = [...pool].slice(0, p.choices - 1);
      choices = rng.shuffle([
        { id: answerKey, visual: { kind: 'text', text: answerText } as Visual, say: answerText },
        ...picked.map(([v, tag]) => ({
          id: `v${v}`,
          visual: { kind: 'text', text: `${formatId(v)}${unit}` } as Visual,
          say: `${formatId(v)}${unit}`,
          tag,
        })),
      ]);
    }

    // `{answer}` sudah memuat satuan; penulis templat sering menambah satuan lagi ("{answer} cm").
    // Satuan yang tertulis dua kali berturut-turut dirapikan menjadi satu ("20 cm cm" → "20 cm").
    const unitWord = p.unit?.trim();
    const dupUnit = unitWord
      ? new RegExp(
          `(${unitWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(\\s+\\1)+(?![\\p{L}\\d])`,
          'gu',
        )
      : undefined;
    const fill = (text: string) => {
      const out = text.replace(TEMPLATE_RE, (_, name: string) => {
        if (name === 'answer') return answerText;
        if (name.startsWith('=')) return formatId(evalNumber(name.slice(1), vars));
        // {w:a} = bilangan dalam kata ("tujuh"), untuk soal "tulis angka yang kamu dengar".
        if (name.startsWith('w:')) return numberWord(vars[name.slice(2)]!);
        if (name in words) return words[name]!;
        return formatId(vars[name]!);
      });
      return dupUnit ? out.replace(dupUnit, '$1') : out;
    };

    const resolve = (node: unknown): unknown => {
      if (typeof node === 'string')
        return node.startsWith('=') ? clean(evalNumber(node.slice(1), vars)) : fill(node);
      if (Array.isArray(node)) return node.map(resolve);
      if (node && typeof node === 'object')
        return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, resolve(v)]));
      return node;
    };
    const stimulus = p.stimulus.map((s) => {
      const r = visualSchema.safeParse(resolve(s));
      if (!r.success)
        throw new Error(`stimulus tidak valid: ${r.error.issues.map((i) => i.message).join('; ')}`);
      return r.data;
    });

    return {
      prompt: fill(p.prompt),
      ...(p.say && { say: fill(p.say) }),
      stimulus,
      interaction:
        p.mode === 'input'
          ? {
              type: 'number-input',
              answer: answerValue,
              ...(p.unit && { unit: p.unit }),
              decimals: p.format === 'decimal' ? 2 : 0,
            }
          : { type: 'pick-one', choices, answer: answerKey },
      reteach: { say: fill(p.explain) },
    };
  },
});
