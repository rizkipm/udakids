import { z } from 'zod';
import {
  ALL_SHAPE_IDS,
  COINS,
  NOTES,
  OBJECT_IDS,
  SOLID_IDS,
  type ObjectId,
  type ShapeId,
  type SolidId,
} from '../generator/assets.js';
import { specSchema } from '../generator/families/fun.js';

/**
 * Simulasi pelajaran SD (D-093): satu layar `peraga` dengan empat jenis, semuanya data (tanpa kode per topik):
 * - `jelajah` — kartu foto nyata (bagian tumbuhan, jenis bahan, …): ketuk untuk mendengar penjelasan, lalu
 *   pertanyaan "ketuk yang …" dan momen "aha".
 * - `proses`  — urutan sebab-akibat berfoto (es → air → uap): ketuk "Lanjut" untuk melihat apa yang terjadi.
 * - `alat`    — alat peraga matematika interaktif (garis bilangan, blok puluhan, benda, uang, jam, penggaris,
 *   timbangan, bangun, pecahan, pola) dengan latar foto nyata; setiap langkah punya target yang dicapai anak.
 * - `kata`    — kartu kata English berfoto nyata: lafal British + arti, lalu "dengar lalu ketuk".
 * Foto: subjek AI Gambar gaya `foto` (realistis, D-088) yang dibuat sekali & dipakai ulang; selama belum ada,
 * gambar SVG `gambar` yang tampil. Tanpa nilai dan tanpa kata "salah".
 */

const shortText = z.string().trim().min(2).max(120);
const sayText = z.string().trim().min(2).max(400);
const objectId = z.enum(OBJECT_IDS as [ObjectId, ...ObjectId[]]);
const slug = z.string().regex(/^[a-z][a-z0-9-]{1,30}$/);

/** Foto realistis: subjek AI Gambar (dipakai ulang di mana saja) + deskripsi untuk penulis prompt. */
export const peragaPhotoSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/, 'subjek foto huruf kecil/angka/tanda hubung'),
  /** Deskripsi Indonesia yang difoto, mis. "akar tanaman cabai yang dicabut dari tanah". */
  label: z.string().trim().min(3).max(80),
  /** Deskripsi English singkat (membantu penulis prompt). */
  en: z.string().trim().max(60).optional(),
});
export type PeragaPhoto = z.infer<typeof peragaPhotoSchema>;

/** Kartu bergambar: foto realistis dan/atau cadangan SVG. */
const card = {
  nama: z.string().trim().min(1).max(40),
  teks: shortText,
  suara: sayText,
  foto: peragaPhotoSchema.optional(),
  /** Gambar SVG cadangan (wajib): tampil selama foto belum ada / offline, supaya kartu tidak kosong. */
  gambar: specSchema,
};

// ------------------------------------------------------------ jelajah

export const peragaJelajahSchema = z
  .strictObject({
    tipe: z.literal('jelajah'),
    /** Foto suasana (opsional) di atas kartu. */
    foto: peragaPhotoSchema.optional(),
    jelajahSuara: sayText,
    bagian: z
      .array(z.strictObject({ id: slug, ...card }))
      .min(3)
      .max(8),
    /** "Ketuk semua yang …": jawaban = id bagian (1–4). */
    tanya: z
      .array(
        z.strictObject({
          teks: shortText,
          suara: sayText,
          jawaban: z.array(slug).min(1).max(4),
          selesai: sayText,
        }),
      )
      .min(1)
      .max(5),
    aha: sayText,
    tutup: sayText,
  })
  .superRefine((m, ctx) => {
    const ids = new Set(m.bagian.map((b) => b.id));
    if (ids.size !== m.bagian.length)
      ctx.addIssue({ code: 'custom', message: 'jelajah: id bagian kembar' });
    for (const q of m.tanya)
      for (const j of q.jawaban)
        if (!ids.has(j))
          ctx.addIssue({ code: 'custom', message: `jelajah: jawaban "${j}" bukan bagian` });
  });

// ------------------------------------------------------------ proses

export const peragaProsesSchema = z.strictObject({
  tipe: z.literal('proses'),
  /** Tombol untuk maju ke tahap berikutnya, mis. "Panaskan", "Siram", "Tunggu". */
  tombol: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .refine((t) => !/^(lanjut|kembali|selesai)$/i.test(t), {
      message:
        'tombol proses tidak boleh sama dengan tombol navigasi pelajaran (Lanjut/Kembali/Selesai)',
    }),
  tahap: z.array(z.strictObject(card)).min(2).max(6),
  aha: sayText,
  tutup: sayText,
});

// ------------------------------------------------------------ alat peraga matematika

const n = (min: number, max: number) => z.number().int().min(min).max(max);
const step = { teks: shortText, suara: sayText, selesai: sayText };

/** Satu langkah per alat; setiap langkah punya target yang dicapai anak dengan mengetuk. */
export const PERAGA_ALAT = {
  /** Lompat dari `dari` sebanyak `ubah` (boleh negatif) pada garis bilangan min–max. */
  'garis-bilangan': z.strictObject({
    ...step,
    min: n(0, 1000),
    max: n(1, 1000),
    dari: n(0, 1000),
    ubah: n(-100, 100),
    loncat: n(1, 100).default(1),
  }),
  /** Susun bilangan dengan batang puluhan & kubus satuan (dan papan ratusan bila > 99). */
  'blok-puluhan': z.strictObject({ ...step, target: n(1, 999) }),
  /** Benda nyata: kumpulkan `a`, lalu tambah/ambil `b`. */
  benda: z.strictObject({
    ...step,
    benda: objectId,
    a: n(0, 20),
    b: n(0, 20),
    op: z.enum(['+', '-', '=']),
  }),
  /** Bayar tepat `target` rupiah dengan koin/uang kertas yang tersedia. */
  uang: z.strictObject({
    ...step,
    target: n(100, 200000),
    pecahan: z
      .array(z.union([z.literal([...COINS]), z.literal([...NOTES])]))
      .min(1)
      .max(6),
  }),
  /** Putar jarum jam sampai menunjukkan jam:menit (menit kelipatan 5). */
  jam: z.strictObject({ ...step, jam: n(1, 12), menit: n(0, 55).refine((m) => m % 5 === 0) }),
  /** Ukur panjang benda dengan penggaris/satuan: ketuk angka di ujung benda. */
  ukur: z.strictObject({
    ...step,
    benda: objectId,
    panjang: n(1, 15),
    satuan: z.enum(['cm', 'kotak', 'klip']).default('cm'),
  }),
  /** Timbangan dua sisi: ketuk sisi yang lebih berat (atau "sama"). */
  timbangan: z.strictObject({
    ...step,
    kiri: z.strictObject({ benda: objectId, jumlah: n(1, 10), berat: n(1, 100) }),
    kanan: z.strictObject({ benda: objectId, jumlah: n(1, 10), berat: n(1, 100) }),
  }),
  /** Bangun datar/ruang: ketuk setiap sisi/sudut/titik sudut/rusuk/sisi sampai semua terhitung. */
  bangun: z.strictObject({
    ...step,
    bangun: z.union([
      z.enum(ALL_SHAPE_IDS as [ShapeId, ...ShapeId[]]),
      z.enum(SOLID_IDS as [SolidId, ...SolidId[]]),
    ]),
    hitung: z.enum(['sisi', 'sudut']),
  }),
  /** Warnai `pembilang` dari `penyebut` bagian yang sama besar. */
  pecahan: z.strictObject({
    ...step,
    penyebut: n(2, 12),
    pembilang: n(0, 12),
    model: z.enum(['bar', 'circle']).default('circle'),
  }),
  /** Lanjutkan pola: pilih gambar berikutnya. `jawaban` = indeks di `pilihan`. */
  pola: z.strictObject({
    ...step,
    urutan: z.array(specSchema).min(3).max(10),
    pilihan: z.array(specSchema).min(2).max(4),
    jawaban: n(0, 3),
  }),
} as const;
export type PeragaAlat = keyof typeof PERAGA_ALAT;
export const PERAGA_ALAT_IDS = Object.keys(PERAGA_ALAT) as PeragaAlat[];

export const peragaAlatSchema = z
  .strictObject({
    tipe: z.literal('alat'),
    alat: z.enum(PERAGA_ALAT_IDS as [PeragaAlat, ...PeragaAlat[]]),
    /** Foto konteks nyata (mis. "kelereng di meja kayu"). */
    foto: peragaPhotoSchema.optional(),
    pengantar: sayText,
    langkah: z.array(z.record(z.string(), z.unknown())).min(1).max(5),
    aha: sayText,
    tutup: sayText,
  })
  .superRefine((m, ctx) => {
    const schema = PERAGA_ALAT[m.alat];
    m.langkah.forEach((l, i) => {
      const r = schema.safeParse(l);
      if (!r.success)
        ctx.addIssue({
          code: 'custom',
          path: ['langkah', i],
          message: `alat ${m.alat}: ${r.error.issues[0]?.path.join('.')} ${r.error.issues[0]?.message}`,
        });
      else if (m.alat === 'garis-bilangan') {
        const g = r.data as unknown as { min: number; max: number; dari: number; ubah: number };
        if (g.dari < g.min || g.dari + g.ubah < g.min || g.dari + g.ubah > g.max || g.min >= g.max)
          ctx.addIssue({
            code: 'custom',
            path: ['langkah', i],
            message: 'garis bilangan di luar rentang',
          });
      } else if (m.alat === 'pecahan') {
        const p = r.data as unknown as { penyebut: number; pembilang: number };
        if (p.pembilang > p.penyebut)
          ctx.addIssue({ code: 'custom', path: ['langkah', i], message: 'pembilang > penyebut' });
      } else if (m.alat === 'benda') {
        const b = r.data as unknown as { a: number; b: number; op: string };
        if (b.op === '-' && b.b > b.a)
          ctx.addIssue({ code: 'custom', path: ['langkah', i], message: 'pengurangan negatif' });
      } else if (m.alat === 'uang') {
        const u = r.data as unknown as { target: number; pecahan: number[] };
        if (u.target % Math.min(...u.pecahan) !== 0)
          ctx.addIssue({
            code: 'custom',
            path: ['langkah', i],
            message: 'target tidak bisa dibayar pas',
          });
      } else if (m.alat === 'pola') {
        const p = r.data as unknown as { pilihan: unknown[]; jawaban: number };
        if (p.jawaban >= p.pilihan.length)
          ctx.addIssue({
            code: 'custom',
            path: ['langkah', i],
            message: 'jawaban pola di luar pilihan',
          });
      }
    });
  });

/** Langkah alat yang sudah diperiksa skemanya (untuk web). */
export const peragaSteps = <A extends PeragaAlat>(alat: A, langkah: readonly unknown[]) =>
  langkah.map((l) => PERAGA_ALAT[alat].parse(l)) as z.infer<(typeof PERAGA_ALAT)[A]>[];

// ------------------------------------------------------------ kata (English)

export const peragaKataSchema = z.strictObject({
  tipe: z.literal('kata'),
  pengantar: sayText,
  kata: z
    .array(
      z.strictObject({
        /** Kata/frasa English. */
        en: z.string().trim().min(1).max(40),
        /** Arti Indonesia. */
        id: z.string().trim().min(1).max(40),
        /** Kalimat contoh English (opsional), mis. "The cat is sleeping." */
        kalimat: z.string().trim().max(80).optional(),
        foto: peragaPhotoSchema.optional(),
        gambar: specSchema,
      }),
    )
    .min(3)
    .max(8),
  aha: sayText,
  tutup: sayText,
});

export const peragaSchema = z.discriminatedUnion('tipe', [
  peragaJelajahSchema,
  peragaProsesSchema,
  peragaAlatSchema,
  peragaKataSchema,
]);
export type Peraga = z.infer<typeof peragaSchema>;

/** Semua foto yang dipakai sebuah simulasi (untuk dibuat lebih dulu lewat AI Gambar). */
export function peragaPhotos(p: Peraga): PeragaPhoto[] {
  const out: PeragaPhoto[] = [];
  const add = (f?: PeragaPhoto) => f && out.push(f);
  if (p.tipe === 'jelajah') {
    add(p.foto);
    p.bagian.forEach((b) => add(b.foto));
  } else if (p.tipe === 'proses') p.tahap.forEach((t) => add(t.foto));
  else if (p.tipe === 'alat') add(p.foto);
  else p.kata.forEach((k) => add(k.foto));
  return out;
}

/**
 * Buku SD yang setiap topiknya (kecuali game/mock) WAJIB punya pelajaran dengan simulasi `peraga` (D-093),
 * diperiksa `validate:content`. Ditambah per tahap: Kelas 1 → Kelas 2–4 → Kelas 5–6.
 */
export const PERAGA_BOOKS: readonly string[] = [
  'math/sd1',
  'sains/sd1',
  'math/sd12',
  'sains/sd12',
  'english/sd12',
];
