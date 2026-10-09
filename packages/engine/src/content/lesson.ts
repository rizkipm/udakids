import { z } from 'zod';
import {
  BODY_PART_IDS,
  OBJECT_IDS,
  SENSE_IDS,
  type BodyPart,
  type ObjectId,
  type SenseId,
} from '../generator/assets.js';
import { specSchema } from '../generator/families/fun.js';
import { LETTER_GLYPH_IDS, STROKE_GLYPH_IDS } from '../generator/glyphs.js';
import { visualSchema } from '../generator/visual-schema.js';

/**
 * Pelajaran (Belajar) sebelum latihan, menempel di kategori katalog (D-068): 3–6 layar pendek, semua
 * dibacakan, tanpa nilai. Jenis layar tetap (rencana Studio Soal 2A) — tampilan & animasinya dibuat sekali
 * di web, konten cukup mengisi data.
 */
export const LESSON_SCREENS = [
  'kenalan',
  'bunyi',
  'kata',
  'gabung',
  'cerita',
  'coba',
  'ingat',
  // D-089: video Momo (adegan bergerak + narasi), jelajah gambar (ketuk bagiannya), dan bacaan interaktif.
  'tonton',
  'jelajah',
  'baca',
  // D-088: simulasi interaktif bergambar foto realistis (sentuh untuk menjelajah + kegiatan → bagian yang dipakai).
  'simulasi',
] as const;
export type LessonScreenKind = (typeof LESSON_SCREENS)[number];

const objectId = z.enum(OBJECT_IDS as [ObjectId, ...ObjectId[]]);
const digit = z.number().int().min(0).max(10);
/** Suku kata dipisah tanda hubung: "sa-tu", "de-la-pan". */
const syllables = z
  .string()
  .regex(/^[a-z]+(-[a-z]+)*$/, 'suku kata huruf kecil dipisah "-", mis. "sa-tu"');

/** Satu huruf (a–z / A–Z). */
const letter = z.string().regex(/^[a-zA-Z]$/, 'satu huruf');

/**
 * Kartu kata: dengan angka (P-MA-01), huruf depan (huruf vokal, D-075), atau hanya gambar + kata (D-079, mis.
 * "pa-gi"). Gambarnya benda (`gambar`) atau gambar bebas `visual` (bentuk, koin, jari, …).
 */
export const lessonCardSchema = z
  .strictObject({
    angka: digit.optional(),
    huruf: letter.optional(),
    kata: z.string().trim().min(2).max(20),
    sukuKata: syllables,
    gambar: objectId.optional(),
    visual: specSchema.optional(),
  })
  .refine((c) => c.angka === undefined || c.huruf === undefined, {
    message: 'kartu memakai angka ATAU huruf, tidak keduanya',
  })
  .refine((c) => (c.gambar === undefined) !== (c.visual === undefined), {
    message: 'kartu butuh gambar atau visual (salah satu)',
  })
  .refine((c) => c.huruf === undefined || c.kata.toLowerCase().startsWith(c.huruf.toLowerCase()), {
    message: 'kata harus dimulai dengan hurufnya',
  });
export type LessonCard = z.infer<typeof lessonCardSchema>;

const senseId = z.enum(SENSE_IDS as [SenseId, ...SenseId[]]);
const shortText = z.string().trim().min(2).max(120);
const sayText = z.string().trim().min(2).max(400);

/** Satu adegan "Video Momo" (D-089): gambar bergerak + teks + narasi; berpindah otomatis setelah narasi. */
/** Contoh soal dari level topik ini (D-090): `level` = urutan level, `seed` = soal ke berapa. */
export const lessonExampleSchema = z.strictObject({
  level: z.number().int().min(1).max(20),
  seed: z.number().int().min(0).max(100000),
});
export type LessonExample = z.infer<typeof lessonExampleSchema>;

export const lessonSceneSchema = z.strictObject({
  teks: shortText,
  suara: sayText,
  /** Gambar dari spec JSON; tanpa gambar, Momo yang tampil besar. */
  gambar: z.array(specSchema).min(1).max(3).optional(),
  /** Gambar bebas (visual soal), dipakai pelajaran otomatis (D-090). */
  visual: z.array(visualSchema).min(1).max(3).optional(),
  /** Momo mengerjakan contoh soal: soal tampil, dibacakan, lalu jawabannya disorot dan dijelaskan (D-090). */
  contoh: lessonExampleSchema.optional(),
  /** Gerak gambar: muncul (pop), zoom, goyang, geser (masuk dari samping), denyut. */
  gerak: z.enum(['muncul', 'zoom', 'goyang', 'geser', 'denyut']).optional(),
});
export type LessonScene = z.infer<typeof lessonSceneSchema>;

/** Titik yang bisa diketuk pada gambar jelajah (D-089). */
export const lessonSpotSchema = z.strictObject({
  bagian: senseId,
  teks: shortText,
  suara: sayText,
  /** Contoh benda yang terkait (mis. mata → pelangi, buku). */
  gambar: z.array(objectId).max(3).optional(),
});
export type LessonSpot = z.infer<typeof lessonSpotSchema>;

/** Satu kalimat bacaan interaktif (D-089): diketuk untuk didengar, boleh bergambar. */
export const lessonSentenceSchema = z.strictObject({
  teks: shortText,
  suara: sayText.optional(),
  gambar: specSchema.optional(),
});
export type LessonSentence = z.infer<typeof lessonSentenceSchema>;

/**
 * Simulasi (D-088). Foto realistis dari AI Gambar (subjek yang sudah disetujui admin, `/pictures/subject/:id`);
 * selama fotonya belum ada, gambar SVG yang sudah ada dipakai sebagai cadangan, jadi layar tetap berjalan offline.
 */
const photoSubject = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,39}$/, 'subjek foto huruf kecil/angka/tanda hubung (id AI Gambar)');
const bodyPart = z.enum(BODY_PART_IDS as [BodyPart, ...BodyPart[]]);
const percent = z.number().min(0).max(100);

/** Bagian tubuh yang bisa disentuh: titik di foto (persen) + kartu foto close-up. */
export const simPartSchema = z.strictObject({
  id: bodyPart,
  teks: shortText,
  suara: sayText,
  /** Titik sentuh di foto utama (persen dari kiri/atas); disetel setelah foto jadi. */
  x: percent,
  y: percent,
  /** Foto close-up bagian ini (kartu). */
  foto: photoSubject.optional(),
  /** Foto benda nyata yang terkait (mis. telinga → lonceng). */
  contoh: photoSubject.optional(),
  /** Cadangan benda SVG bila foto contoh belum ada. */
  contohGambar: objectId.optional(),
});
export type SimPart = z.infer<typeof simPartSchema>;

/** Kegiatan: foto kegiatan, bagian tubuh yang dipakai (≥ 1), kalimat saat semua ditemukan. */
export const simActivitySchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/),
  teks: shortText,
  suara: sayText,
  foto: photoSubject.optional(),
  gambar: objectId.optional(),
  bagian: z.array(bodyPart).min(1).max(4),
  /** Dibacakan saat semua bagian ditemukan. */
  selesai: sayText,
});
export type SimActivity = z.infer<typeof simActivitySchema>;

export const lessonSimSchema = z
  .strictObject({
    /** Foto utama (mis. anak berdiri, tampak depan). */
    foto: photoSubject,
    /** Kalimat pembuka eksplorasi & pembuka kegiatan. */
    jelajahSuara: sayText,
    kegiatanSuara: sayText,
    bagian: z.array(simPartSchema).min(3).max(8),
    kegiatan: z.array(simActivitySchema).min(2).max(6),
    /** Momen "aha": dibacakan saat anak menemukan kegiatan yang memakai > 1 bagian. */
    aha: sayText,
    /** Penutup setelah semua kegiatan dicoba. */
    tutup: sayText,
  })
  .superRefine((m, ctx) => {
    const ids = new Set(m.bagian.map((b) => b.id));
    if (ids.size !== m.bagian.length)
      ctx.addIssue({ code: 'custom', message: 'simulasi: bagian tidak boleh kembar' });
    for (const k of m.kegiatan)
      for (const b of k.bagian)
        if (!ids.has(b))
          ctx.addIssue({
            code: 'custom',
            message: `simulasi: kegiatan ${k.id} memakai bagian ${b} yang tidak ada`,
          });
    if (!m.kegiatan.some((k) => k.bagian.length > 1))
      ctx.addIssue({
        code: 'custom',
        message: 'simulasi: butuh kegiatan yang memakai > 1 bagian (momen aha)',
      });
  });
export type LessonSim = z.infer<typeof lessonSimSchema>;

export const lessonScreenSchema = z
  .strictObject({
    jenis: z.enum(LESSON_SCREENS),
    /** Teks di layar (≤ 120 huruf). */
    teks: z.string().trim().min(2).max(120),
    /** Kalimat yang dibacakan Momo. */
    suara: z.string().trim().min(2).max(400),
    gambar: z.array(objectId).max(6).optional(),
    /** Angka yang tampil besar (kenalan, coba, ingat). */
    angka: z.array(digit).min(1).max(11).optional(),
    /** Huruf yang tampil besar (kenalan, bunyi, coba, ingat), mis. ["a", "i"]. */
    huruf: z.array(letter).min(1).max(10).optional(),
    /** Untuk layar `kata` dengan satu kata. */
    sukuKata: syllables.optional(),
    /** Untuk layar `kata`: kartu angka-kata-gambar (1–5 kartu). */
    kartu: z.array(lessonCardSchema).min(1).max(5).optional(),
    /**
     * Untuk layar `coba` (tidak dinilai): `tebal` = tebalkan angka/huruf; `hitung` = ketuk benda satu per satu;
     * `cari` = ketuk semua huruf yang sama di antara huruf lain; `pilih` = pilih satu kartu yang tepat
     * (`pilihan` + `jawaban`); `urut` = ketuk kartu berurutan (`pilihan` sudah dalam urutan benar), D-079.
     */
    mode: z.enum(['tebal', 'hitung', 'cari', 'pilih', 'urut', 'soal']).optional(),
    /** `coba` soal (D-090): satu soal dari level topik ini, dicoba tanpa nilai. */
    contoh: lessonExampleSchema.optional(),
    /** Kartu gambar yang bisa diketuk (dibacakan), mis. dua kelompok buah, pola, koin, jari (D-079). */
    kartuGambar: z.array(specSchema).min(1).max(6).optional(),
    /** `kartuGambar` tampil sebagai antrean (bendera di depan, nomor urut muncul saat diketuk). */
    antrean: z.boolean().optional(),
    /** `coba` tebal: garis pramenulis yang ditebalkan (P-BT-02/03, D-081). */
    garis: z.array(z.enum(STROKE_GLYPH_IDS)).min(1).max(6).optional(),
    /** Layar angka (`kenalan`/`ingat`): tampilkan jari tangan, bukan benda (P-MA-04). */
    jari: z.boolean().optional(),
    /** `coba` pilih/urut: kartu pilihan. */
    pilihan: z.array(specSchema).min(2).max(4).optional(),
    /** `coba` pilih: indeks kartu yang tepat (0 = pertama). */
    jawaban: z.number().int().min(0).max(3).optional(),
    /** `tonton`: adegan video Momo (D-089). */
    adegan: z.array(lessonSceneSchema).min(2).max(8).optional(),
    /** `jelajah`: gambar yang dijelajahi (D-089). */
    figur: z.enum(['pancaindra']).optional(),
    /** `jelajah`: titik yang bisa diketuk. */
    titik: z.array(lessonSpotSchema).min(2).max(6).optional(),
    /** `baca`: kalimat bacaan interaktif. */
    kalimat: z.array(lessonSentenceSchema).min(2).max(6).optional(),
    /** `simulasi`: data simulasi interaktif (D-088). */
    simulasi: lessonSimSchema.optional(),
  })
  .superRefine((s, ctx) => {
    const need = (ok: boolean, message: string) => {
      if (!ok) ctx.addIssue({ code: 'custom', message: `${s.jenis}: ${message}` });
    };
    if (s.jenis === 'kata') need(!!s.sukuKata || !!s.kartu, 'butuh sukuKata atau kartu');
    if (s.jenis === 'coba') {
      need(!!s.mode, 'butuh mode (tebal/hitung/cari/pilih/urut/soal)');
      if (s.mode === 'soal') need(!!s.contoh, 'mode soal butuh contoh');
      if (s.mode === 'pilih' || s.mode === 'urut') need(!!s.pilihan, 'butuh pilihan');
      if (s.mode === 'pilih')
        need(
          s.jawaban !== undefined && s.jawaban < (s.pilihan?.length ?? 0),
          'jawaban harus indeks pilihan',
        );
      if (s.mode !== 'pilih' && s.mode !== 'urut' && s.mode !== 'soal')
        need(
          s.mode === 'cari'
            ? !!s.huruf
            : !!s.angka || !!s.huruf || (s.mode === 'tebal' && !!s.garis),
          'butuh angka, huruf, atau garis',
        );
      if (s.mode === 'tebal')
        need(
          (s.huruf ?? []).every((h) => (LETTER_GLYPH_IDS as readonly string[]).includes(h)),
          `huruf untuk ditebalkan hanya ${LETTER_GLYPH_IDS.join(' ')}`,
        );
      if (s.mode === 'hitung') {
        need(!!s.angka, 'mode hitung butuh angka');
        need(!!s.gambar?.length, 'mode hitung butuh gambar');
        need(!s.angka?.includes(0), 'mode hitung tidak bisa angka 0');
      }
    }
    if (s.jenis === 'kenalan')
      need(!!s.angka || !!s.huruf || !!s.kartuGambar, 'butuh angka, huruf, atau kartuGambar');
    if (s.garis) need(s.jenis === 'coba' && s.mode === 'tebal', 'garis hanya untuk coba tebal');
    if (s.antrean) need(!!s.kartuGambar, 'antrean butuh kartuGambar');
    if (s.jari) need(!!s.angka && !s.angka.includes(0), 'jari butuh angka 1–10');
    if (s.jenis === 'tonton') need(!!s.adegan, 'butuh adegan');
    if (s.jenis === 'jelajah') need(!!s.titik && !!s.figur, 'butuh figur dan titik');
    if (s.jenis === 'baca') need(!!s.kalimat, 'butuh kalimat');
    if (s.adegan) need(s.jenis === 'tonton', 'adegan hanya untuk tonton');
    if (s.titik) {
      need(s.jenis === 'jelajah', 'titik hanya untuk jelajah');
      need(
        new Set(s.titik.map((x) => x.bagian)).size === s.titik.length,
        'bagian titik tidak boleh kembar',
      );
    }
    if (s.kalimat) need(s.jenis === 'baca', 'kalimat hanya untuk baca');
    if (s.jenis === 'simulasi') need(!!s.simulasi, 'butuh simulasi');
    if (s.simulasi) need(s.jenis === 'simulasi', 'simulasi hanya untuk layar simulasi');
    if (s.jenis === 'bunyi') {
      // Bunyi huruf (D-075) atau bunyi benda/hewan lewat kartu gambar (P-BT-01, D-081).
      need(!!s.huruf || !!s.kartuGambar, 'butuh huruf atau kartuGambar');
      if (s.huruf) need(!!s.gambar?.length, 'butuh gambar benda berawalan huruf itu');
    }
  });
export type LessonScreen = z.infer<typeof lessonScreenSchema>;

export const lessonSchema = z
  .strictObject({
    /** Kode unit Menu Belajar, mis. "P-MA-01" (docs/blueprint/menu-belajar.csv). */
    kode: z.string().regex(/^[PK1]-[A-Z]{2}-\d{2}$/),
    version: z.number().int().positive(),
    judul: z.string().trim().min(3).max(60),
    layar: z.array(lessonScreenSchema).min(3).max(6),
  })
  .superRefine((l, ctx) => {
    if (l.layar.at(-1)?.jenis !== 'ingat')
      ctx.addIssue({ code: 'custom', path: ['layar'], message: 'layar terakhir harus "ingat"' });
  });
export type Lesson = z.infer<typeof lessonSchema>;

/**
 * Semua kalimat yang dibacakan dari satu pelajaran, dengan kunci stabil (D-088): server membuat suara Chirp
 * hanya untuk teks yang ada di sini (bukan teks bebas dari perangkat), perangkat meminta lewat kuncinya.
 */
export function lessonVoiceLines(l: Lesson): Record<string, string> {
  const out: Record<string, string> = {};
  l.layar.forEach((s, i) => {
    out[`${i}`] = s.suara;
    s.adegan?.forEach((a, j) => (out[`${i}.a${j}`] = a.suara));
    s.titik?.forEach((t, j) => (out[`${i}.t${j}`] = t.suara));
    s.kalimat?.forEach((k, j) => (out[`${i}.k${j}`] = k.suara ?? k.teks));
    const m = s.simulasi;
    if (m) {
      out[`${i}.sj`] = m.jelajahSuara;
      out[`${i}.sk`] = m.kegiatanSuara;
      out[`${i}.aha`] = m.aha;
      out[`${i}.tutup`] = m.tutup;
      m.bagian.forEach((b) => (out[`${i}.b.${b.id}`] = b.suara));
      m.kegiatan.forEach((k) => {
        out[`${i}.k.${k.id}`] = k.suara;
        out[`${i}.k.${k.id}.ok`] = k.selesai;
      });
    }
  });
  return out;
}
