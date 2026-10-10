import { z } from 'zod';
import {
  ALL_SHAPE_IDS,
  COINS,
  NOTES,
  OBJECT_IDS,
  SENSE_IDS,
  type ObjectId,
  type SenseId,
  type ShapeId,
} from '../generator/assets.js';
import { GLYPH_IDS } from '../generator/glyphs.js';
import { visualSchema } from '../generator/visual-schema.js';
import { infografisPhotos, infografisSchema } from './lesson.js';
import { peragaPhotoSchema, type PeragaPhoto } from './peraga.js';

/**
 * Materi berformat lab (D-109), dua lapis:
 * - **Lab Buku** (`catalog.lab`): ruang lab per buku/jenjang, pos per tema besar; tiap pos punya jelajah, eksperimen
 *   inti, fakta, uji campuran dari topik-topik tema itu, dan tautan ke Materi Topik.
 * - **Materi Topik** (`category.materi`): materi detail satu topik — Pahami (poster + peragaan Momo + jelajah),
 *   Eksperimen, Contoh per level (OTOMATIS dari level topik), Ingat/Jebakan, Uji penguasaan (OTOMATIS dari bank soal).
 *
 * Tampilan & eksperimen dibuat sekali di web (pustaka widget); konten hanya data, jadi semua kalimatnya ikut
 * katalog dan bisa dibuatkan suara Momo. Gambar: foto asli Pexels (D-095) dengan cadangan SVG wajib.
 */

const objectId = z.enum(OBJECT_IDS as [ObjectId, ...ObjectId[]]);
const senseId = z.enum(SENSE_IDS as [SenseId, ...SenseId[]]);
const title = z.string().trim().min(2).max(48);
const text = z.string().trim().min(2).max(160);
const say = z.string().trim().min(2).max(400);
const slug = z.string().regex(/^[a-z][a-z0-9-]{1,30}$/, 'id huruf kecil/angka/tanda hubung');
const code = z.string().regex(/^[A-Z]{1,2}$/);

/* ------------------------------------------------------------------ Gambar */

/**
 * Slot gambar: foto asli (dicari di Pexels lewat `lesson:photos`) DAN cadangan SVG (`benda` atau `visual`) yang
 * dipakai selama foto belum ada / tidak lolos saringan / offline. Tanpa foto pun boleh (SVG saja).
 */
export const labPicSchema = z
  .strictObject({
    foto: peragaPhotoSchema.optional(),
    benda: objectId.optional(),
    visual: visualSchema.optional(),
  })
  .refine((p) => !!p.benda || !!p.visual, {
    message: 'gambar butuh cadangan SVG (benda atau visual), walau ada foto',
  });
export type LabPic = z.infer<typeof labPicSchema>;

/* ------------------------------------------------------------------ Jelajah */

/** Bagian figur SVG berbagian yang bisa diketuk (koordinatnya ada di web). */
export const LAB_FIGURES = {
  mata: ['alis', 'bulu-mata', 'kelopak', 'manik', 'putih', 'air-mata'],
  telinga: ['daun-telinga', 'lubang-telinga', 'gendang-telinga', 'rumah-siput'],
  hidung: ['batang-hidung', 'lubang-hidung', 'bulu-hidung', 'ruang-hidung'],
  lidah: ['ujung-lidah', 'bintil', 'gigi', 'air-liur'],
  kulit: ['ujung-jari', 'kuku', 'telapak', 'rambut-halus'],
  /** Sistem pencernaan (SD): urutan perjalanan makanan. */
  pencernaan: ['mulut', 'kerongkongan', 'lambung', 'hati', 'usus-halus', 'usus-besar'],
  tumbuhan: ['akar', 'batang', 'daun', 'bunga', 'buah', 'biji'],
  tubuh: ['kepala', 'bahu', 'tangan', 'perut', 'lutut', 'kaki'],
} as const satisfies Record<string, readonly string[]>;
export type LabFigure = keyof typeof LAB_FIGURES;
const figureId = z.enum(Object.keys(LAB_FIGURES) as [LabFigure, ...LabFigure[]]);

const spot = z.strictObject({ bagian: slug, judul: title, teks: text, suara: say });
const card = z.strictObject({ judul: title, teks: text, suara: say, gambar: labPicSchema });

export const labExploreSchema = z.discriminatedUnion('jenis', [
  /** Figur SVG berbagian (organ, tumbuhan, …): ketuk nomor → bagian disorot + dijelaskan. */
  z.strictObject({
    jenis: z.literal('figur'),
    figur: figureId,
    titik: z.array(spot).min(3).max(8),
  }),
  /** Kartu bergambar (foto asli/SVG): ketuk kartu → dibacakan. */
  z.strictObject({ jenis: z.literal('kartu'), kartu: z.array(card).min(2).max(8) }),
]);
export type LabExplore = z.infer<typeof labExploreSchema>;

/** Peragaan Momo: adegan bergerak; `hitung` = benda di gambar pertama dihitung satu per satu. */
export const labSceneSchema = z.strictObject({
  teks: text,
  suara: say,
  visual: z.array(visualSchema).min(1).max(3),
  hitung: z.enum(['angka', 'urutan']).optional(),
  selesai: say.optional(),
});
export type LabScene = z.infer<typeof labSceneSchema>;

/* ------------------------------------------------------------------ Eksperimen (pustaka widget) */

export const LAB_SOUNDS = ['drum', 'xilofon', 'biola', 'hujan', 'jam'] as const;
export type LabSound = (typeof LAB_SOUNDS)[number];
export const LAB_TASTES = ['manis', 'asin', 'asam', 'pahit'] as const;
export type LabTaste = (typeof LAB_TASTES)[number];

const base = { judul: title, suara: say };
/** Gambar bernama (pola, dengar-pilih). */
const labItem = z.strictObject({ nama: title, gambar: labPicSchema });
const num = z.number().int().min(0).max(1000);
const choices = z.array(num).min(2).max(4);

export const labExperimentSchema = z.discriminatedUnion('jenis', [
  // ---- Sains
  /** Mata: lampu kamar terang/redup/gelap; manik mata membesar dalam gelap. */
  z.strictObject({
    jenis: z.literal('cahaya'),
    ...base,
    terang: say,
    redup: say,
    gelap: say,
    benda: z.array(objectId).min(2).max(4),
  }),
  /** Kaca pembesar untuk menemukan benda kecil. */
  z.strictObject({
    jenis: z.literal('lup'),
    ...base,
    benda: z
      .array(z.strictObject({ benda: objectId, suara: say }))
      .min(2)
      .max(5),
    selesai: say,
  }),
  /** Panggung bunyi (keras/pelan, tutup telinga). Bunyi dibuat perangkat (sintesis). */
  z.strictObject({
    jenis: z.literal('bunyi'),
    ...base,
    alat: z
      .array(z.strictObject({ benda: objectId, bunyi: z.enum(LAB_SOUNDS), suara: say }))
      .min(2)
      .max(5),
    keras: say,
    pelan: say,
    tutup: say,
  }),
  /** Dengar bunyi tanpa melihat, lalu tebak bendanya. */
  z.strictObject({
    jenis: z.literal('tebak-bunyi'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          bunyi: z.enum(LAB_SOUNDS),
          jawaban: objectId,
          pilihan: z.array(objectId).min(2).max(4),
        }),
      )
      .min(2)
      .max(5),
  }),
  /** Botol bau: dipilah harum / tidak sedap; saat pilek bau tidak tercium. */
  z.strictObject({
    jenis: z.literal('bau'),
    ...base,
    botol: z
      .array(z.strictObject({ benda: objectId, harum: z.boolean(), suara: say }))
      .min(3)
      .max(6),
    pilek: say,
    selesai: say,
  }),
  /** Dapur rasa: makanan dicicipi lalu masuk ke toples rasanya. */
  z.strictObject({
    jenis: z.literal('rasa'),
    ...base,
    makanan: z
      .array(z.strictObject({ benda: objectId, rasa: z.enum(LAB_TASTES), suara: say }))
      .min(4)
      .max(8),
    selesai: say,
  }),
  /** Kotak misteri: raba lalu tebak halus/kasar dan panas/dingin. */
  z.strictObject({
    jenis: z.literal('raba'),
    ...base,
    benda: z
      .array(
        z.strictObject({
          benda: objectId,
          suhu: z.enum(['panas', 'dingin', 'biasa']),
          permukaan: z.enum(['halus', 'kasar']),
          suara: say,
        }),
      )
      .min(3)
      .max(6),
    selesai: say,
  }),
  // ---- Umum (semua mapel)
  /** Pilah ke 2–4 kotak (padat/cair, hewan darat/air, baik/hati-hati, …). */
  z.strictObject({
    jenis: z.literal('pilah'),
    ...base,
    kotak: z
      .array(z.strictObject({ label: title, gambar: labPicSchema.optional() }))
      .min(2)
      .max(4),
    benda: z
      .array(
        z.strictObject({
          nama: title,
          gambar: labPicSchema,
          kotak: z.number().int().min(0).max(3),
          suara: say,
        }),
      )
      .min(3)
      .max(10),
    selesai: say,
  }),
  /** Susun urutan (daur hidup, langkah kegiatan, …); `langkah` sudah dalam urutan benar. */
  z.strictObject({
    jenis: z.literal('urut'),
    ...base,
    langkah: z
      .array(z.strictObject({ nama: title, gambar: labPicSchema, suara: say }))
      .min(3)
      .max(6),
    selesai: say,
  }),
  /** Pasangkan kiri ↔ kanan (benda ↔ gunanya, hewan ↔ makanannya, kata ↔ gambar, …). */
  z.strictObject({
    jenis: z.literal('pasang'),
    ...base,
    pasangan: z
      .array(
        z.strictObject({
          kiri: z.strictObject({ nama: title, gambar: labPicSchema.optional() }),
          kanan: z.strictObject({ nama: title, gambar: labPicSchema.optional() }),
          suara: say,
        }),
      )
      .min(2)
      .max(5),
  }),
  /** Lanjutkan pola: deret gambar, satu tempat kosong di akhir, pilih gambar berikutnya. */
  z.strictObject({
    jenis: z.literal('pola'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          deret: z.array(labItem).min(3).max(8),
          pilihan: z.array(labItem).min(2).max(4),
          jawaban: z.number().int().min(0).max(3),
        }),
      )
      .min(1)
      .max(5),
  }),
  /** Dengar kata (Indonesia/English), lalu ketuk gambarnya. */
  z.strictObject({
    jenis: z.literal('dengar-pilih'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          kata: title,
          pilihan: z.array(labItem).min(2).max(4),
          jawaban: z.number().int().min(0).max(3),
        }),
      )
      .min(2)
      .max(6),
  }),
  /** Simulasi sebab-akibat bertahap (mis. suhu: es → air → uap); geser/ketuk tahap untuk melihat perubahannya. */
  z.strictObject({
    jenis: z.literal('geser'),
    ...base,
    label: title,
    tahap: z
      .array(z.strictObject({ label: title, gambar: labPicSchema, suara: say }))
      .min(2)
      .max(5),
    selesai: say,
  }),
  /** Tebalkan angka, huruf, atau garis pramenulis (papan menebalkan yang sama dengan latihan). */
  z.strictObject({
    jenis: z.literal('tebal'),
    ...base,
    garis: z.array(z.enum(GLYPH_IDS)).min(1).max(6),
  }),
  // ---- Matematika
  /** Atur jarum jam sampai menunjukkan waktu yang diminta (menit kelipatan 5). */
  z.strictObject({
    jenis: z.literal('jam'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          jam: z.number().int().min(1).max(12),
          menit: z.number().int().min(0).max(55).multipleOf(5),
        }),
      )
      .min(1)
      .max(5),
  }),
  /** Bayar tepat: ketuk koin/uang kertas sampai jumlahnya pas. */
  z.strictObject({
    jenis: z.literal('uang'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          harga: z.number().int().min(100).max(100000),
          benda: objectId,
          pecahan: z
            .array(z.union([z.literal([...COINS]), z.literal([...NOTES])]))
            .min(1)
            .max(5),
        }),
      )
      .min(1)
      .max(5),
  }),
  /** Susun bilangan dengan batang puluhan dan kubus satuan. */
  z.strictObject({
    jenis: z.literal('nilai-tempat'),
    ...base,
    ronde: z.array(z.number().int().min(1).max(999)).min(1).max(5),
  }),
  /** Ketuk setiap sisi bangun datar untuk menghitung sisi (dan sudutnya). */
  z.strictObject({
    jenis: z.literal('bangun'),
    ...base,
    ronde: z
      .array(z.enum(ALL_SHAPE_IDS.filter((x) => x !== 'lingkaran') as [ShapeId, ...ShapeId[]]))
      .min(1)
      .max(6),
  }),
  /** Warnai sebagian pizza: `warnai` dari `bagian` sama besar. */
  z.strictObject({
    jenis: z.literal('pecahan'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          bagian: z.number().int().min(2).max(8),
          warnai: z.number().int().min(1).max(8),
        }),
      )
      .min(1)
      .max(5),
  }),
  /** Perkalian sebagai baris yang sama banyak: tambah baris satu per satu, lalu pilih hasilnya. */
  z.strictObject({
    jenis: z.literal('kali'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          baris: z.number().int().min(1).max(6),
          kolom: z.number().int().min(1).max(6),
          benda: objectId,
          pilihan: z.array(z.number().int().min(0).max(100)).min(2).max(4),
        }),
      )
      .min(1)
      .max(5),
  }),
  /** Pembagian sebagai berbagi rata: benda dibagikan satu per satu ke piring, lalu pilih banyak per piring. */
  z.strictObject({
    jenis: z.literal('bagi'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          jumlah: z.number().int().min(2).max(24),
          piring: z.number().int().min(2).max(6),
          benda: objectId,
          pilihan: choices,
        }),
      )
      .min(1)
      .max(5),
  }),
  /** Mengukur dengan penggaris (mulai dari 0): ketuk angka di ujung benda. */
  z.strictObject({
    jenis: z.literal('ukur'),
    ...base,
    satuan: z.enum(['cm', 'kotak']),
    ronde: z
      .array(z.strictObject({ benda: objectId, panjang: z.number().int().min(1).max(12) }))
      .min(1)
      .max(5),
  }),
  /** Luas = banyak petak: warnai semua petak, lalu pilih luasnya. */
  z.strictObject({
    jenis: z.literal('luas'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          baris: z.number().int().min(1).max(6),
          kolom: z.number().int().min(1).max(8),
          pilihan: z.array(z.number().int().min(0).max(100)).min(2).max(4),
        }),
      )
      .min(1)
      .max(5),
  }),
  /** Diagram batang bergambar: ketuk batang yang paling banyak/sedikit. */
  z.strictObject({
    jenis: z.literal('diagram'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          data: z
            .array(
              z.strictObject({ nama: title, benda: objectId, n: z.number().int().min(0).max(10) }),
            )
            .min(2)
            .max(4),
          cari: z.enum(['banyak', 'sedikit']),
        }),
      )
      .min(1)
      .max(5),
  }),
  /** Tambah: gabungkan dua kelompok benda; kurang: ambil sebagian. Lalu hitung hasilnya. */
  z.strictObject({
    jenis: z.literal('tambah-kurang'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          a: z.number().int().min(1).max(20),
          b: z.number().int().min(1).max(20),
          op: z.enum(['tambah', 'kurang']),
          benda: objectId,
          pilihan: choices,
        }),
      )
      .min(1)
      .max(5),
  }),
  z.strictObject({
    jenis: z.literal('kenal-angka'),
    ...base,
    sampai: z.number().int().min(3).max(20),
    benda: objectId,
  }),
  z.strictObject({
    jenis: z.literal('dengar-ketuk'),
    ...base,
    ronde: z
      .array(z.strictObject({ target: num, pilihan: choices }))
      .min(2)
      .max(6),
  }),
  z.strictObject({
    jenis: z.literal('hitung-ketuk'),
    ...base,
    ronde: z
      .array(
        z.strictObject({ n: z.number().int().min(1).max(20), benda: objectId, pilihan: choices }),
      )
      .min(1)
      .max(5),
  }),
  z.strictObject({
    jenis: z.literal('pasang-angka'),
    ...base,
    pasangan: z
      .array(z.strictObject({ n: z.number().int().min(1).max(20), benda: objectId }))
      .min(2)
      .max(4),
  }),
  z.strictObject({
    jenis: z.literal('garis-bilangan'),
    ...base,
    sampai: z.number().int().min(5).max(100),
  }),
  z.strictObject({
    jenis: z.literal('kereta'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          deret: z.array(z.number().int().min(0).max(1000)).min(3).max(6),
          kosong: z.number().int().min(0).max(5),
          pilihan: z.array(z.number().int().min(0).max(1000)).min(2).max(4),
        }),
      )
      .min(1)
      .max(5),
  }),
  z.strictObject({
    jenis: z.literal('urutkan'),
    ...base,
    /** `true` = dari yang paling besar. */
    turun: z.boolean().optional(),
    ronde: z
      .array(z.array(z.number().int().min(0).max(1000)).min(3).max(6))
      .min(1)
      .max(5),
  }),
  z.strictObject({
    jenis: z.literal('antrean'),
    ...base,
    hewan: z.array(objectId).min(3).max(10),
    ronde: z.array(z.number().int().min(1).max(10)).min(1).max(6),
  }),
  z.strictObject({
    jenis: z.literal('banding'),
    ...base,
    ronde: z
      .array(
        z.strictObject({
          angka: z.array(z.number().int().min(0).max(100)).min(2).max(4),
          cari: z.enum(['besar', 'kecil']),
        }),
      )
      .min(1)
      .max(6),
  }),
  z.strictObject({
    jenis: z.literal('bingkai'),
    ...base,
    ronde: z.array(z.number().int().min(1).max(20)).min(1).max(5),
  }),
]);
export type LabExperiment = z.infer<typeof labExperimentSchema>;

/* ------------------------------------------------------------------ Ingat, rawat, uji */

const ingat = z.strictObject({ teks: text, tepat: z.boolean() });
export type LabIngat = z.infer<typeof ingat>;
const habit = z.strictObject({
  teks: text,
  suara: say,
  gambar: labPicSchema.optional(),
  baik: z.boolean(),
});
export type LabHabit = z.infer<typeof habit>;
const rawat = z
  .strictObject({ suara: say, kebiasaan: z.array(habit).min(3).max(6) })
  .refine((r) => r.kebiasaan.some((k) => k.baik) && r.kebiasaan.some((k) => !k.baik), {
    message: 'rawat butuh contoh baik dan tidak baik',
  });

/** Soal asli dari level sebuah topik di buku yang sama. */
export const labLevelRefSchema = z.strictObject({
  topik: code,
  level: z.number().int().min(1).max(20),
});
export type LabLevelRef = z.infer<typeof labLevelRefSchema>;

export const LAB_STATUS = ['draf', 'aktif'] as const;
export type LabStatus = (typeof LAB_STATUS)[number];

/** Pemeriksaan isi eksperimen yang tidak bisa diungkapkan skema per field. */
function checkExperiment(e: LabExperiment, issue: (m: string) => void) {
  if (e.jenis === 'tebak-bunyi')
    for (const r of e.ronde)
      if (!r.pilihan.includes(r.jawaban))
        issue(`tebak-bunyi: jawaban ${r.jawaban} tidak ada di pilihan`);
  if (e.jenis === 'bau' && (!e.botol.some((b) => b.harum) || !e.botol.some((b) => !b.harum)))
    issue('bau: butuh botol harum dan tidak sedap');
  if (e.jenis === 'rasa' && new Set(e.makanan.map((m) => m.rasa)).size < 2)
    issue('rasa: butuh minimal dua rasa berbeda');
  if (e.jenis === 'pilah') {
    for (const b of e.benda)
      if (b.kotak >= e.kotak.length) issue(`pilah: ${b.nama} masuk kotak yang tidak ada`);
    if (new Set(e.benda.map((b) => b.kotak)).size < 2) issue('pilah: benda harus ke ≥ 2 kotak');
  }
  if (e.jenis === 'dengar-ketuk')
    for (const r of e.ronde)
      if (!r.pilihan.includes(r.target)) issue(`dengar-ketuk: ${r.target} tidak ada di pilihan`);
  if (e.jenis === 'hitung-ketuk')
    for (const r of e.ronde)
      if (!r.pilihan.includes(r.n)) issue(`hitung-ketuk: ${r.n} tidak ada di pilihan`);
  if (e.jenis === 'kereta')
    for (const r of e.ronde) {
      const want = r.deret[r.kosong];
      if (want === undefined) issue('kereta: gerbong kosong di luar deret');
      else if (!r.pilihan.includes(want)) issue(`kereta: ${want} tidak ada di pilihan`);
    }
  if (e.jenis === 'pola' || e.jenis === 'dengar-pilih')
    for (const r of e.ronde)
      if (r.jawaban >= r.pilihan.length) issue(`${e.jenis}: jawaban di luar pilihan`);
  if (e.jenis === 'tambah-kurang')
    for (const r of e.ronde) {
      const want = r.op === 'tambah' ? r.a + r.b : r.a - r.b;
      if (r.op === 'kurang' && r.b > r.a)
        issue('tambah-kurang: yang diambil lebih banyak dari yang ada');
      else if (!r.pilihan.includes(want)) issue(`tambah-kurang: ${want} tidak ada di pilihan`);
    }
  if (e.jenis === 'pecahan')
    for (const r of e.ronde)
      if (r.warnai > r.bagian) issue('pecahan: diwarnai lebih dari banyak bagian');
  if (e.jenis === 'uang')
    for (const r of e.ronde) {
      // Harga harus bisa dibayar tepat dengan pecahan yang tersedia (boleh dipakai berulang).
      const can = new Set([0]);
      for (let v = 0; v <= r.harga; v += 100)
        if (can.has(v)) for (const p of r.pecahan) if (v + p <= r.harga) can.add(v + p);
      if (!can.has(r.harga)) issue(`uang: Rp${r.harga} tidak bisa dibayar tepat`);
    }
  if (e.jenis === 'kali')
    for (const r of e.ronde)
      if (!r.pilihan.includes(r.baris * r.kolom))
        issue(`kali: ${r.baris * r.kolom} tidak ada di pilihan`);
  if (e.jenis === 'bagi')
    for (const r of e.ronde) {
      if (r.jumlah % r.piring) issue(`bagi: ${r.jumlah} tidak habis dibagi ${r.piring}`);
      else if (!r.pilihan.includes(r.jumlah / r.piring))
        issue(`bagi: ${r.jumlah / r.piring} tidak ada di pilihan`);
    }
  if (e.jenis === 'luas')
    for (const r of e.ronde)
      if (!r.pilihan.includes(r.baris * r.kolom))
        issue(`luas: ${r.baris * r.kolom} tidak ada di pilihan`);
  if (e.jenis === 'diagram')
    for (const r of e.ronde) {
      const ns = r.data.map((d) => d.n);
      const want = r.cari === 'banyak' ? Math.max(...ns) : Math.min(...ns);
      if (ns.filter((n) => n === want).length > 1)
        issue('diagram: jawaban paling banyak/sedikit harus satu');
    }
  if (e.jenis === 'antrean')
    for (const r of e.ronde) if (r > e.hewan.length) issue(`antrean: urutan ${r} melebihi barisan`);
}

function checkExplore(x: LabExplore, issue: (m: string) => void) {
  if (x.jenis !== 'figur') return;
  const parts = LAB_FIGURES[x.figur] as readonly string[];
  for (const t of x.titik)
    if (!parts.includes(t.bagian))
      issue(`figur ${x.figur}: bagian "${t.bagian}" tidak ada (pilih ${parts.join(', ')})`);
  if (new Set(x.titik.map((t) => t.bagian)).size !== x.titik.length)
    issue(`figur ${x.figur}: bagian tidak boleh kembar`);
}

/* ------------------------------------------------------------------ Lab Buku */

export const bookLabStationSchema = z.strictObject({
  id: slug,
  judul: title,
  sub: text,
  suara: say,
  ikon: labPicSchema,
  /** Topik (kode kategori) di buku ini yang dibahas pos ini; tombol ke Materi Topik-nya. */
  topik: z.array(code).min(1).max(12),
  jelajah: labExploreSchema,
  eksperimen: z.array(labExperimentSchema).min(1).max(3),
  fakta: z.array(text).min(1).max(4),
  rawat: rawat.optional(),
  /** Bank soal Uji pos: level dari topik buku ini. */
  uji: z.array(labLevelRefSchema).min(1).max(12),
  /**
   * Hanya soal pilihan yang jawaban/pembahasannya memuat salah satu kata ini (mis. pos mata: "mata", "melihat").
   * Kosong = semua soal dari level `uji`.
   */
  saring: z.array(z.string().trim().min(2).max(20)).max(10).optional(),
  /** Indra pos ini (untuk ikon pancaindra). */
  indra: senseId.optional(),
});
export type BookLabStation = z.infer<typeof bookLabStationSchema>;

export const bookLabSchema = z
  .strictObject({
    version: z.number().int().positive(),
    status: z.enum(LAB_STATUS),
    judul: title,
    sub: text,
    suara: say,
    pos: z.array(bookLabStationSchema).min(1).max(10),
    /** Lab Gabungan (opsional): satu benda dijelajahi dengan kelima indra. */
    gabungan: z
      .strictObject({
        suara: say,
        benda: z
          .array(
            z.strictObject({
              benda: objectId,
              indra: z
                .array(z.strictObject({ indra: senseId, ya: z.boolean(), suara: say }))
                .length(5),
            }),
          )
          .min(2)
          .max(5),
        selesai: say,
      })
      .optional(),
    /** Uji Jago: soal campuran dari level-level buku, dengan peta penguasaan per pos. */
    ujian: z.strictObject({
      suara: say,
      soal: z.array(labLevelRefSchema).min(4).max(15),
      selesai: say,
    }),
  })
  .superRefine((l, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (new Set(l.pos.map((p) => p.id)).size !== l.pos.length)
      issue('lab: id pos tidak boleh kembar');
    for (const p of l.pos) {
      checkExplore(p.jelajah, (m) => issue(`pos ${p.id}: ${m}`));
      for (const e of p.eksperimen) checkExperiment(e, (m) => issue(`pos ${p.id}: ${m}`));
    }
    for (const b of l.gabungan?.benda ?? [])
      if (new Set(b.indra.map((x) => x.indra)).size !== 5)
        issue(`gabungan ${b.benda}: kelima indra harus ada`);
  });
export type BookLab = z.infer<typeof bookLabSchema>;

/* ------------------------------------------------------------------ Materi Topik */

export const materiSchema = z
  .strictObject({
    version: z.number().int().positive(),
    status: z.enum(LAB_STATUS),
    judul: title,
    sub: text,
    suara: say,
    /** Pahami/Kenali: poster penjelasan (foto + poin), peragaan Momo, dan/atau jelajah. */
    pahami: z.strictObject({
      poster: z.array(infografisSchema).min(1).max(4),
      peragaan: z.array(labSceneSchema).min(2).max(8).optional(),
      jelajah: z.array(labExploreSchema).min(1).max(6).optional(),
    }),
    eksperimen: z.array(labExperimentSchema).min(1).max(10),
    /** Contoh per level dibuat otomatis; `catatan` = tips tambahan per level (kunci = urutan level). */
    contoh: z
      .strictObject({ catatan: z.record(z.string().regex(/^\d{1,2}$/), text).optional() })
      .optional(),
    ingat: z.strictObject({
      poin: z.array(ingat).min(2).max(6),
      rawat: rawat.optional(),
      fakta: z.array(text).min(1).max(4).optional(),
    }),
  })
  .superRefine((m, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const x of m.pahami.jelajah ?? []) checkExplore(x, issue);
    for (const e of m.eksperimen) checkExperiment(e, issue);
    if (!m.ingat.poin.some((p) => !p.tepat))
      issue('ingat: butuh minimal satu jebakan (tepat: false)');
  });
export type Materi = z.infer<typeof materiSchema>;

/* ------------------------------------------------------------------ Foto & contoh */

function picPhotos(value: unknown, out: Map<string, PeragaPhoto>) {
  if (Array.isArray(value)) for (const v of value) picPhotos(v, out);
  else if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const f = peragaPhotoSchema.safeParse(o.foto);
    if (f.success && !out.has(f.data.id)) out.set(f.data.id, f.data);
    for (const v of Object.values(o)) picPhotos(v, out);
  }
}

/** Semua foto di Lab Buku / Materi Topik (untuk dicari lewat `lesson:photos`), tanpa kembar. */
export function labPhotos(lab: BookLab | Materi): PeragaPhoto[] {
  const out = new Map<string, PeragaPhoto>();
  if ('pahami' in lab)
    for (const p of lab.pahami.poster) for (const f of infografisPhotos(p)) out.set(f.id, f);
  picPhotos(lab, out);
  return [...out.values()];
}

/** Seed soal yang diperagakan Momo di Contoh per level (deterministik, juga dipakai daftar suara server). */
export const CONTOH_SEED = 7;

/** Kalimat pembuka contoh satu level (dibacakan; juga masuk daftar izin suara). */
export const contohSay = (order: number, levelTitle: string) =>
  `Contoh level ${order}. ${levelTitle}. Lihat cara Momo mengerjakannya.`;

/** Materi hanya tampil ke anak bila aktif (draf hanya untuk admin). */
/**
 * Topik yang mendapat Materi Topik & masuk pos Lab Buku: bukan mock test (flag `mock` atau judul "Mock Test …")
 * dan bukan topik kumpulan game (GM/GF/GN/GX). Kode Y/Z dipakai topik biasa di buku kelas, jadi bukan patokan.
 */
export const isLabTopic = (c: { code: string; title: string; mock?: boolean }): boolean =>
  !c.mock && !/^G[MFNX]$/.test(c.code) && !/^mock test/i.test(c.title.trim());

export const isActiveLab = (x: { status: LabStatus } | undefined): boolean => x?.status === 'aktif';
