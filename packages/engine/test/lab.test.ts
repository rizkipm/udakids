import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bookLabSchema,
  catalogSchema,
  contohSay,
  groupOf,
  isActiveLab,
  labExamItems,
  labPhotos,
  labQuizPool,
  labStars,
  materiQuizItems,
  materiSchema,
  materiVoiceTexts,
  pickRound,
  skillTemplateSchema,
  validateSkillContent,
  type BookLab,
  type Materi,
} from '../src/index.js';

/** Materi berformat lab (D-109): skema Lab Buku + Materi Topik, bank soal, suara, foto, validator. */
const dir = join(__dirname, '../../../content/skills/sains/tkosn');
const catalogFile = JSON.parse(readFileSync(join(dir, '_catalog.json'), 'utf8')) as unknown;
const catalog = catalogSchema.parse(catalogFile);
const skills = readdirSync(dir)
  .filter((f) => !f.startsWith('_') && f.endsWith('.json'))
  .map((f) => skillTemplateSchema.parse(JSON.parse(readFileSync(join(dir, f), 'utf8'))));
const lab = catalog.lab!;
const materi = catalog.categories.find((c) => c.code === 'J')!.materi!;
const topicJ = skills.filter((k) => k.category === 'J');
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const errs = (schema: typeof bookLabSchema | typeof materiSchema, x: unknown) =>
  schema
    .safeParse(x)
    .error?.issues.map((i) => i.message)
    .join(' | ') ?? '';

describe('skema lab', () => {
  it('konten pilot sahih dan aktif', () => {
    expect(bookLabSchema.safeParse(lab).success).toBe(true);
    expect(materiSchema.safeParse(materi).success).toBe(true);
    expect(isActiveLab(lab)).toBe(true);
    expect(isActiveLab({ ...materi, status: 'draf' })).toBe(false);
    expect(isActiveLab(undefined)).toBe(false);
  });

  it('gambar wajib punya cadangan SVG walau ada foto', () => {
    const l = clone(lab);
    l.pos[0]!.ikon = { foto: { id: 'x-foto', label: 'foto saja' } };
    expect(errs(bookLabSchema, l)).toContain('cadangan SVG');
  });

  it('menolak bagian figur, pos kembar, isi eksperimen yang tidak masuk akal', () => {
    const l: BookLab = clone(lab);
    l.pos[1]!.id = l.pos[0]!.id;
    l.pos[0]!.jelajah = {
      jenis: 'figur',
      figur: 'mata',
      titik: [
        { bagian: 'gendang-telinga', judul: 'X', teks: 'xx', suara: 'xx' },
        { bagian: 'alis', judul: 'Y', teks: 'yy', suara: 'yy' },
        { bagian: 'alis', judul: 'Z', teks: 'zz', suara: 'zz' },
      ],
    };
    const pilah = l.pos.flatMap((p) => p.eksperimen).find((e) => e.jenis === 'pilah')!;
    if (pilah.jenis === 'pilah') pilah.benda[0]!.kotak = 3;
    l.gabungan!.benda[0]!.indra[1]!.indra = 'mata';
    const m = errs(bookLabSchema, l);
    expect(m).toContain('id pos tidak boleh kembar');
    expect(m).toContain('tidak ada (pilih');
    expect(m).toContain('tidak boleh kembar');
    expect(m).toContain('kotak yang tidak ada');
    expect(m).toContain('kelima indra');
  });

  it('eksperimen: jawaban harus ada di pilihan', () => {
    const m: Materi = clone(materi);
    m.eksperimen = [
      {
        jenis: 'dengar-ketuk',
        judul: 'Dengar',
        suara: 'Dengar.',
        ronde: [
          { target: 5, pilihan: [1, 2] },
          { target: 1, pilihan: [1, 2] },
        ],
      },
      {
        jenis: 'hitung-ketuk',
        judul: 'Hitung',
        suara: 'Hitung.',
        ronde: [{ n: 4, benda: 'apel', pilihan: [1, 2] }],
      },
      {
        jenis: 'kereta',
        judul: 'Kereta',
        suara: 'Kereta.',
        ronde: [
          { deret: [1, 2, 3], kosong: 5, pilihan: [1, 2] },
          { deret: [1, 2, 3], kosong: 2, pilihan: [1, 2] },
        ],
      },
      {
        jenis: 'antrean',
        judul: 'Antre',
        suara: 'Antre.',
        hewan: ['kucing', 'sapi', 'ayam'],
        ronde: [6],
      },
      {
        jenis: 'bau',
        judul: 'Bau',
        suara: 'Bau.',
        botol: [
          { benda: 'bunga', harum: true, suara: 'a.' },
          { benda: 'sabun', harum: true, suara: 'b.' },
          { benda: 'kue', harum: true, suara: 'c.' },
        ],
        pilek: 'p.',
        selesai: 's.',
      },
      {
        jenis: 'rasa',
        judul: 'Rasa',
        suara: 'Rasa.',
        makanan: [
          { benda: 'gula', rasa: 'manis', suara: 'a.' },
          { benda: 'madu', rasa: 'manis', suara: 'b.' },
          { benda: 'permen', rasa: 'manis', suara: 'c.' },
          { benda: 'kue', rasa: 'manis', suara: 'd.' },
        ],
        selesai: 's.',
      },
      {
        jenis: 'tebak-bunyi',
        judul: 'Tebak',
        suara: 'Tebak.',
        ronde: [
          { bunyi: 'drum', jawaban: 'drum', pilihan: ['biola', 'xilofon'] },
          { bunyi: 'jam', jawaban: 'jam-dinding', pilihan: ['jam-dinding', 'drum'] },
        ],
      },
    ];
    const pic = { nama: 'Apel', gambar: { benda: 'apel' as const } };
    m.eksperimen.push(
      {
        jenis: 'pola',
        judul: 'Pola',
        suara: 'Pola.',
        ronde: [{ deret: [pic, pic, pic], pilihan: [pic, pic], jawaban: 3 }],
      },
      {
        jenis: 'tambah-kurang',
        judul: 'TK',
        suara: 'TK.',
        ronde: [
          { a: 2, b: 5, op: 'kurang', benda: 'apel', pilihan: [1, 2] },
          { a: 2, b: 2, op: 'tambah', benda: 'apel', pilihan: [1, 2] },
        ],
      },
      { jenis: 'tebal', judul: 'Tebal', suara: 'Tebal.', garis: ['1', 'a'] },
      {
        jenis: 'uang',
        judul: 'Uang',
        suara: 'Uang.',
        ronde: [{ harga: 700, benda: 'kue', pecahan: [500] }],
      },
      { jenis: 'pecahan', judul: 'Pizza', suara: 'Pizza.', ronde: [{ bagian: 2, warnai: 3 }] },
      {
        jenis: 'kali',
        judul: 'Kali',
        suara: 'Kali.',
        ronde: [{ baris: 2, kolom: 3, benda: 'apel', pilihan: [5, 7] }],
      },
      {
        jenis: 'bagi',
        judul: 'Bagi',
        suara: 'Bagi.',
        ronde: [
          { jumlah: 5, piring: 2, benda: 'kue', pilihan: [2, 3] },
          { jumlah: 4, piring: 2, benda: 'kue', pilihan: [1, 3] },
        ],
      },
      {
        jenis: 'luas',
        judul: 'Luas',
        suara: 'Luas.',
        ronde: [{ baris: 2, kolom: 2, pilihan: [3, 5] }],
      },
      {
        jenis: 'diagram',
        judul: 'Diagram',
        suara: 'Diagram.',
        ronde: [
          {
            data: [
              { nama: 'Apel', benda: 'apel', n: 2 },
              { nama: 'Jeruk', benda: 'jeruk', n: 2 },
            ],
            cari: 'banyak',
          },
        ],
      },
    );
    m.ingat.poin = m.ingat.poin.map((p) => ({ ...p, tepat: true }));
    const e = errs(materiSchema, m);
    for (const s of [
      'dengar-ketuk',
      'hitung-ketuk',
      'gerbong kosong',
      'kereta: 3',
      'melebihi barisan',
      'harum dan tidak sedap',
      'dua rasa',
      'tebak-bunyi',
      'jebakan',
    ])
      expect(e, s).toContain(s);
  });
});

describe('bank soal lab', () => {
  it('pos dengan kata saring hanya mengambil soal pilihan yang cocok', () => {
    const pool = labQuizPool(
      skills,
      [
        { topik: 'J', level: 1 },
        { topik: 'J', level: 2 },
      ],
      ['telinga'],
    );
    expect(pool.length).toBeGreaterThan(0);
    for (const it of pool) expect(it.interaction.type).toBe('pick-one');
    expect(labQuizPool(skills, [{ topik: 'J', level: 99 }])).toEqual([]);
  });

  it('putaran berbeda memberi soal lain; jumlah tidak melebihi bank', () => {
    const pool = labQuizPool(skills, lab.pos[0]!.uji);
    expect(pickRound(pool, 4, 0)).toHaveLength(4);
    expect(pickRound(pool, 4, 1)).not.toEqual(pickRound(pool, 4, 0));
    expect(pickRound([1, 2], 4, 3)).toEqual([1, 2]);
  });

  it('uji jago & uji materi', () => {
    const exam = labExamItems(skills, lab.ujian.soal, 0);
    expect(exam).toHaveLength(lab.ujian.soal.length);
    expect(labExamItems(skills, [{ topik: 'J', level: 99 }], 0)).toEqual([]);
    const items = materiQuizItems(topicJ, 8, 0);
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(new Set(items.map((x) => x.level)).size).toBeGreaterThan(3);
    expect(materiQuizItems([], 8, 0)).toEqual([]);
  });

  it('pengelompokan soal per kata & bintang', () => {
    const pool = labQuizPool(skills, [{ topik: 'J', level: 1 }], ['mata', 'telinga']);
    const g = groupOf(pool[0]!, [['mata', 'melihat'], ['telinga', 'mendengar'], undefined]);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(groupOf(pool[0]!, [undefined])).toBe(-1);
    expect([
      labStars(4, 4),
      labStars(3, 4),
      labStars(2, 4),
      labStars(1, 4),
      labStars(0, 0),
    ]).toEqual([3, 2, 1, 0, 0]);
  });
});

describe('suara, foto, validator', () => {
  it('suara materi memuat kalimatnya dan pembuka contoh setiap level', () => {
    const texts = materiVoiceTexts(materi, topicJ);
    expect(texts).toContain(materi.suara);
    expect(texts).toContain(
      contohSay(
        1,
        topicJ
          .find((k) => k.order === 1)!
          .title.split('—')
          .at(-1)!
          .trim(),
      ),
    );
  });

  it('foto materi & lab terkumpul tanpa kembar', () => {
    const fm = labPhotos(materi);
    const fl = labPhotos(lab);
    expect(fm.length).toBeGreaterThan(3);
    expect(fl.length).toBeGreaterThan(10);
    expect(new Set(fl.map((f) => f.id)).size).toBe(fl.length);
  });

  it('validator menangkap rujukan topik & level yang tidak ada', () => {
    const bad = clone(catalogFile) as { lab: BookLab };
    bad.lab.pos[0]!.topik = ['ZZ'];
    bad.lab.pos[0]!.uji = [{ topik: 'J', level: 19 }];
    bad.lab.ujian.soal[0] = { topik: 'J', level: 19 };
    const r = validateSkillContent({
      catalogs: [{ path: 'c.json', data: bad }],
      skills: skills
        .filter((k) => k.category === 'J')
        .map((k) => ({ path: `${k.id}.json`, data: k })),
      sampleSize: 3,
    });
    const msg = r.errors.join('\n');
    expect(msg).toContain('topik ZZ tidak ada');
    expect(msg).toContain('level J.19 tidak ada');
    expect(msg).toContain('uji jago');
  });
});
