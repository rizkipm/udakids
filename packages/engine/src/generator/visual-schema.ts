import { z } from 'zod';
import {
  ALL_SHAPE_IDS,
  BODY_PART_IDS,
  type BodyPart,
  COINS,
  COLORS,
  NOTES,
  OBJECT_IDS,
  SIZES,
  SENSE_IDS,
  SOLID_IDS,
  type ObjectId,
  type SenseId,
  type ShapeId,
  type SolidId,
} from './assets.js';
import { GLYPH_IDS } from './glyphs.js';
import type { Visual } from './item.js';

const objectId = z.enum(OBJECT_IDS as [ObjectId, ...ObjectId[]]);
const color = z.enum(COLORS);
const senseId = z.enum(SENSE_IDS as [SenseId, ...SenseId[]]);
const count = z.number().int().min(0).max(30);
const layout = z.enum(['row', 'rows', 'scatter', 'ring', 'grid']);

/** Skema Zod untuk Visual — dipakai memvalidasi soal manual dari admin. */
export const visualSchema: z.ZodType<Visual> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('objects'),
      object: objectId,
      count,
      layout,
      color: color.optional(),
      crossed: count.optional(),
      countAlong: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('mixed'),
      parts: z.array(z.strictObject({ object: objectId, count })).min(2),
    }),
    z.strictObject({ kind: z.literal('dots'), count, layout, countAlong: z.boolean().optional() }),
    z.strictObject({
      kind: z.literal('body'),
      part: z.enum(BODY_PART_IDS as [BodyPart, ...BodyPart[]]).optional(),
    }),
    z.strictObject({ kind: z.literal('sense'), sense: senseId }),
    z.strictObject({ kind: z.literal('face'), sense: senseId.optional() }),
    z.strictObject({
      kind: z.literal('die'),
      value: z.number().int().min(1).max(6),
      color: color.optional(),
    }),
    z
      .strictObject({
        kind: z.literal('fingers'),
        count: z.number().int().min(1).max(10),
        tone: z.number().int().min(0).max(2).optional(),
        split: z.number().int().min(1).max(5).optional(),
        /** Satu tangan: tangan kiri (dicerminkan). */
        mirror: z.boolean().optional(),
      })
      .refine(
        (v) => v.split === undefined || (v.count - v.split >= 1 && v.count - v.split <= 5),
        'split: tiap tangan 1–5 jari',
      ),
    z.strictObject({
      kind: z.literal('cubes'),
      counts: z.array(count).min(1),
      colors: z.array(color).min(1),
      crossed: count.optional(),
      separated: z.boolean().optional(),
      countAlong: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('frame'),
      filled: count,
      size: z.union([z.literal(5), z.literal(10), z.literal(20)]),
      countAlong: z.boolean().optional(),
    }),
    z.strictObject({ kind: z.literal('numeral'), value: z.number().int().min(0).max(9999) }),
    z.strictObject({ kind: z.literal('blank') }),
    z.strictObject({
      kind: z.literal('shape'),
      shape: z.enum(ALL_SHAPE_IDS as [ShapeId, ...ShapeId[]]),
      color,
      size: z.enum(SIZES),
      rotate: z.number().optional(),
    }),
    z.strictObject({
      kind: z.literal('shapes'),
      items: z
        .array(z.strictObject({ shape: z.enum(ALL_SHAPE_IDS as [ShapeId, ...ShapeId[]]), color }))
        .min(1),
      layout,
      countAlong: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('solid'),
      solid: z.enum(SOLID_IDS as [SolidId, ...SolidId[]]),
      color,
    }),
    z.strictObject({ kind: z.literal('coin'), value: z.literal([...COINS]) }),
    z.strictObject({ kind: z.literal('note'), value: z.literal([...NOTES]) }),
    z.strictObject({ kind: z.literal('glyph'), glyph: z.enum(GLYPH_IDS) }),
    z.strictObject({
      kind: z.literal('object'),
      object: objectId,
      color: color.optional(),
      scaleX: z.number().min(0.2).max(2).optional(),
      scaleY: z.number().min(0.2).max(2).optional(),
    }),
    z.strictObject({
      kind: z.literal('scene'),
      relation: z.enum(['in-front', 'behind', 'inside', 'outside', 'above', 'below', 'beside']),
      subject: objectId,
      reference: objectId,
    }),
    z.strictObject({
      kind: z.literal('equation'),
      left: z.number().int(),
      op: z.enum(['+', '-']),
      right: z.number().int(),
      result: z.number().int().optional(),
    }),
    z.strictObject({ kind: z.literal('swatch'), color }),
    z.strictObject({ kind: z.literal('word'), text: z.string().min(1).max(40) }),
    z.strictObject({
      kind: z.literal('letters'),
      letters: z.array(z.string().max(1)).min(2).max(12),
    }),
    z.strictObject({ kind: z.literal('yesno'), value: z.boolean() }),
    z.strictObject({ kind: z.literal('row'), items: z.array(visualSchema).min(1).max(12) }),
    z.strictObject({ kind: z.literal('text'), text: z.string().min(1).max(200) }),
    z.strictObject({
      kind: z.literal('fraction'),
      num: z.number().int().min(0).max(1000),
      den: z.number().int().min(1).max(1000),
      whole: z.number().int().min(0).max(100).optional(),
      model: z.enum(['bar', 'circle']).optional(),
      hideNumber: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('table'),
      headers: z.array(z.string().max(30)).min(1).max(6),
      rows: z
        .array(
          z
            .array(z.union([z.string().max(30), z.number()]))
            .min(1)
            .max(6),
        )
        .min(1)
        .max(8),
      caption: z.string().max(80).optional(),
    }),
    z.strictObject({
      kind: z.literal('bar-chart'),
      labels: z.array(z.string().max(20)).min(2).max(8),
      values: z.array(z.number().min(0).max(100000)).min(2).max(8),
      unit: z.string().max(20).optional(),
      caption: z.string().max(80).optional(),
      pictogram: objectId.optional(),
    }),
    z.strictObject({
      kind: z.literal('rect'),
      w: z.number().positive().max(10000),
      h: z.number().positive().max(10000),
      unit: z.string().max(6),
      grid: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('cuboid'),
      p: z.number().positive().max(1000),
      l: z.number().positive().max(1000),
      t: z.number().positive().max(1000),
      unit: z.string().max(6),
      cubes: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('angle'),
      degrees: z.number().min(0).max(360),
      protractor: z.boolean().optional(),
      showValue: z.boolean().optional(),
    }),
    z.strictObject({
      kind: z.literal('clock'),
      hour: z.number().int().min(1).max(12),
      minute: z.number().int().min(0).max(59),
    }),
    z.strictObject({
      kind: z.literal('digital'),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
    }),
    z.strictObject({
      kind: z.literal('tens'),
      tens: z.number().int().min(0).max(10),
      ones: z.number().int().min(0).max(19),
    }),
    z.strictObject({
      kind: z.literal('number-chart'),
      start: z.number().int().min(0).max(100),
      end: z.number().int().min(1).max(120),
      columns: z.number().int().min(2).max(10),
      blanks: z.array(z.number().int()).max(20).optional(),
      highlight: z.array(z.number().int()).max(20).optional(),
    }),
    z.strictObject({
      kind: z.literal('venn'),
      a: z.string().min(1).max(20),
      b: z.string().min(1).max(20),
      onlyA: count,
      onlyB: count,
      both: count,
      object: objectId,
    }),
    z.strictObject({
      kind: z.literal('puzzle'),
      picture: visualSchema,
      cols: z.number().int().min(2).max(3),
      rows: z.number().int().min(2).max(3),
      show: z.enum(['holed', 'piece']),
      index: z.number().int().min(0).max(8),
    }),
    z.strictObject({
      kind: z.literal('measure'),
      object: objectId,
      length: z.number().int().min(1).max(12),
      direction: z.enum(['horizontal', 'vertical']),
      showCubes: z.boolean(),
    }),
  ]),
) as z.ZodType<Visual>;
