import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  catalogSchema,
  labQuizPool,
  materiQuizItems,
  skillTemplateSchema,
  type Catalog,
  type LabExperiment,
} from '@little-coder/engine';
import { Experiment, Explorer, HabitSort } from '../../src/play/lab/experiments';

/** Materi berformat lab (D-109): Lab Buku + Materi Topik di konten, semua bagian tampil dan bisa dimainkan. */
const root = join(__dirname, '../../../../content/skills');
const book = (domain: string, grade: string) => {
  const dir = join(root, domain, grade);
  const catalog = catalogSchema.parse(JSON.parse(readFileSync(join(dir, '_catalog.json'), 'utf8')));
  const skills = readdirSync(dir)
    .filter((f) => !f.startsWith('_') && f.endsWith('.json'))
    .map((f) => skillTemplateSchema.parse(JSON.parse(readFileSync(join(dir, f), 'utf8'))));
  return { catalog, skills };
};
// Semua buku yang punya materi berformat lab: konten baru otomatis ikut diuji.
const books = readdirSync(root).flatMap((domain) =>
  readdirSync(join(root, domain))
    .filter((grade) => existsSync(join(root, domain, grade, '_catalog.json')))
    .filter((grade) => {
      const raw = readFileSync(join(root, domain, grade, '_catalog.json'), 'utf8');
      return raw.includes('"materi"') || raw.includes('"lab"');
    })
    .map((grade) => book(domain, grade)),
);
const materis = books.flatMap(({ catalog, skills }) =>
  catalog.categories
    .filter((c) => c.materi)
    .map((c) => ({ c, skills: skills.filter((k) => k.category === c.code) })),
);
const labs = books.filter(
  (b): b is typeof b & { catalog: Catalog & { lab: object } } => !!b.catalog.lab,
);

describe('materi berformat lab: konten pilot', () => {
  it('Lab Buku Sains TK + Materi Topik sains J dan math A ada', () => {
    expect(labs.map((b) => `${b.catalog.domain}/${b.catalog.grade}`)).toContain('sains/tkosn');
    expect(materis.map((m) => m.c.code)).toEqual(expect.arrayContaining(['J', 'A']));
  });

  // Memindai seluruh katalog (ratusan topik): butuh lebih dari batas bawaan 5 detik.
  it('setiap pos Lab Buku punya ≥ 4 soal Uji; setiap Materi Topik punya ≥ 4 soal uji penguasaan', () => {
    for (const { catalog, skills } of labs)
      for (const p of catalog.lab!.pos)
        expect(labQuizPool(skills, p.uji, p.saring).length, p.id).toBeGreaterThanOrEqual(4);
    for (const m of materis)
      expect(materiQuizItems(m.skills, 8, 0).length, m.c.code).toBeGreaterThanOrEqual(4);
  }, 120_000);

  it('semua jelajah, eksperimen, dan rawat tampil tanpa error', () => {
    const exps: LabExperiment[] = [];
    for (const m of materis) {
      exps.push(...m.c.materi!.eksperimen);
      for (const x of m.c.materi!.pahami.jelajah ?? [])
        render(<Explorer x={x} onDone={() => undefined} />).unmount();
      if (m.c.materi!.ingat.rawat)
        render(<HabitSort rawat={m.c.materi!.ingat.rawat} onDone={() => undefined} />).unmount();
    }
    for (const { catalog } of labs)
      for (const p of catalog.lab!.pos) {
        exps.push(...p.eksperimen);
        render(<Explorer x={p.jelajah} onDone={() => undefined} />).unmount();
        if (p.rawat) render(<HabitSort rawat={p.rawat} onDone={() => undefined} />).unmount();
      }
    for (const e of exps) render(<Experiment e={e} onDone={() => undefined} />).unmount();
    expect(new Set(exps.map((e) => e.jenis)).size).toBeGreaterThanOrEqual(15);
  }, 120_000);

  it('pilah: pilihan yang belum tepat bergoyang; semua dipilah → selesai', () => {
    const e: LabExperiment = {
      jenis: 'pilah',
      judul: 'Buah atau sayur?',
      suara: 'Pilah.',
      kotak: [{ label: 'Buah' }, { label: 'Sayur' }],
      benda: [
        { nama: 'Apel', gambar: { benda: 'apel' }, kotak: 0, suara: 'Apel buah.' },
        { nama: 'Wortel', gambar: { benda: 'wortel' }, kotak: 1, suara: 'Wortel sayur.' },
        { nama: 'Pisang', gambar: { benda: 'pisang' }, kotak: 0, suara: 'Pisang buah.' },
      ],
      selesai: 'Selesai memilah.',
    };
    let done = 0;
    const { container } = render(<Experiment e={e} onDone={() => done++} />);
    fireEvent.click(screen.getByRole('button', { name: /Wortel/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Buah/ }));
    expect(container.querySelector('.is-shake')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Sayur/ }));
    fireEvent.click(screen.getByRole('button', { name: /Apel/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Buah/ }));
    fireEvent.click(screen.getByRole('button', { name: /Pisang/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Buah/ }));
    expect(done).toBe(1);
    expect(screen.getByText('Selesai memilah.')).toBeTruthy();
  });

  it('urut: ketuk sesuai urutan, yang belum giliran bergoyang', () => {
    const e: LabExperiment = {
      jenis: 'urut',
      judul: 'Tumbuh',
      suara: 'Urutkan.',
      langkah: [
        { nama: 'Benih', gambar: { benda: 'benih' }, suara: 'Benih.' },
        { nama: 'Tunas', gambar: { benda: 'tunas' }, suara: 'Tunas.' },
        { nama: 'Pohon', gambar: { benda: 'pohon' }, suara: 'Pohon.' },
      ],
      selesai: 'Urutannya tepat.',
    };
    let done = 0;
    const { container } = render(<Experiment e={e} onDone={() => done++} />);
    fireEvent.click(screen.getByRole('button', { name: /Pohon/ }));
    expect(container.querySelector('.is-shake')).toBeTruthy();
    for (const n of ['Benih', 'Tunas', 'Pohon'])
      fireEvent.click(screen.getByRole('button', { name: new RegExp(n) }));
    expect(done).toBe(1);
  });

  it('kotak misteri: raba, jawab halus/kasar dan panas/dingin, lalu bendanya terlihat', () => {
    const raba = materis
      .flatMap((m) => m.c.materi!.eksperimen)
      .find(
        (x) =>
          x.jenis === 'raba' && x.benda.some((b) => b.benda === 'es-batu' && b.suhu === 'dingin'),
      )!;
    if (raba.jenis !== 'raba') throw new Error('raba');
    render(<Experiment e={raba} onDone={() => undefined} />);
    const es = raba.benda.findIndex((b) => b.benda === 'es-batu');
    fireEvent.click(screen.getByRole('button', { name: `Kotak ${es + 1}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Masukkan tangan' }));
    fireEvent.click(screen.getByRole('button', { name: /Halus/ }));
    fireEvent.click(screen.getByRole('button', { name: /Dingin/ }));
    expect(screen.getByRole('button', { name: 'es batu' })).toBeTruthy();
  });

  it('pola: pilihan yang tepat mengisi kotak kosong', () => {
    const it2 = (nama: string, benda: 'apel' | 'pisang') => ({ nama, gambar: { benda } });
    let done = 0;
    const { container } = render(
      <Experiment
        e={{
          jenis: 'pola',
          judul: 'Pola',
          suara: 'Lanjutkan.',
          ronde: [
            {
              deret: [it2('apel', 'apel'), it2('pisang', 'pisang'), it2('apel', 'apel')],
              pilihan: [it2('apel', 'apel'), it2('pisang', 'pisang')],
              jawaban: 1,
            },
          ],
        }}
        onDone={() => done++}
      />,
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'apel' }).at(-1)!);
    expect(container.querySelector('.is-shake')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'pisang' }).at(-1)!);
    expect(container.querySelector('.lab-pattern-cell.is-right')).toBeTruthy();
  });

  it('tambah-kurang: benda ditambahkan dengan diketuk, lalu jawabannya dipilih', () => {
    const { container } = render(
      <Experiment
        e={{
          jenis: 'tambah-kurang',
          judul: 'Tambah',
          suara: 'Tambah.',
          ronde: [{ a: 2, b: 1, op: 'tambah', benda: 'apel', pilihan: [2, 3, 4] }],
        }}
        onDone={() => undefined}
      />,
    );
    expect(container.querySelectorAll('.is-waiting')).toHaveLength(1);
    fireEvent.click(container.querySelector('.m-count-obj')!);
    expect(container.querySelectorAll('.is-waiting')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'tiga' }));
    expect(screen.getByText(/2 \+ 1 = 3/)).toBeTruthy();
  });

  it('widget SD tampil & bisa dimainkan: jam, uang, nilai tempat, bangun, pecahan, geser', () => {
    const exps: LabExperiment[] = [
      { jenis: 'jam', judul: 'Jam', suara: 'Atur jam.', ronde: [{ jam: 1, menit: 5 }] },
      {
        jenis: 'uang',
        judul: 'Uang',
        suara: 'Bayar.',
        ronde: [{ harga: 1500, benda: 'roti-lapis', pecahan: [500, 1000] }],
      },
      { jenis: 'nilai-tempat', judul: 'Puluhan', suara: 'Susun.', ronde: [12] },
      { jenis: 'bangun', judul: 'Bangun', suara: 'Hitung sisi.', ronde: ['segitiga'] },
      { jenis: 'pecahan', judul: 'Pizza', suara: 'Warnai.', ronde: [{ bagian: 4, warnai: 1 }] },
      {
        jenis: 'geser',
        judul: 'Suhu',
        suara: 'Geser.',
        label: 'Suhu',
        tahap: [
          { label: 'Es', gambar: { benda: 'es-batu' }, suara: 'Es.' },
          { label: 'Air', gambar: { benda: 'gelas' }, suara: 'Air.' },
        ],
        selesai: 'Selesai.',
      },
    ];
    for (const e of exps) render(<Experiment e={e} onDone={() => undefined} />).unmount();

    // Jam: dari 12.00 → 1.05 (jam maju sekali, menit maju sekali) → tepat.
    const jam = render(<Experiment e={exps[0]!} onDone={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Jam maju' }));
    fireEvent.click(screen.getByRole('button', { name: 'Menit maju lima' }));
    expect(jam.container.querySelector('.lab-clock.is-right')).toBeTruthy();
    jam.unmount();

    // Uang: 1000 + 500 = 1500 → pas.
    const uang = render(<Experiment e={exps[1]!} onDone={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rp1.000' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rp500' }));
    expect(uang.container.querySelector('.lab-tray.is-right')).toBeTruthy();
    uang.unmount();

    // Nilai tempat: 1 puluhan + 2 satuan = 12.
    const nt = render(<Experiment e={exps[2]!} onDone={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tambah satu puluhan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tambah satu satuan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tambah satu satuan' }));
    expect(nt.container.querySelector('.lab-place.is-right')).toBeTruthy();
    nt.unmount();

    // Bangun: tiga sisi segitiga diketuk.
    const bg = render(<Experiment e={exps[3]!} onDone={() => undefined} />);
    for (const n of [1, 2, 3]) fireEvent.click(screen.getByRole('button', { name: `Sisi ${n}` }));
    expect(bg.container.querySelector('.lab-shape.is-right')).toBeTruthy();
    bg.unmount();

    // Pecahan: satu dari empat potongan.
    const pc = render(<Experiment e={exps[4]!} onDone={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Potongan 2' }));
    expect(pc.container.querySelector('.lab-pizza.is-right')).toBeTruthy();
  });

  it('widget SD 3–6 & figur baru: kali, bagi, ukur, luas, diagram; pencernaan, tumbuhan, tubuh', () => {
    const kali = render(
      <Experiment
        e={{
          jenis: 'kali',
          judul: 'Kali',
          suara: 'Kali.',
          ronde: [{ baris: 2, kolom: 3, benda: 'apel', pilihan: [5, 6] }],
        }}
        onDone={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Tambah satu baris/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tambah satu baris/ }));
    fireEvent.click(screen.getByRole('button', { name: 'enam' }));
    expect(screen.getByText(/2 × 3 = 6/)).toBeTruthy();
    kali.unmount();

    const bagi = render(
      <Experiment
        e={{
          jenis: 'bagi',
          judul: 'Bagi',
          suara: 'Bagi.',
          ronde: [{ jumlah: 4, piring: 2, benda: 'kue', pilihan: [2, 3] }],
        }}
        onDone={() => undefined}
      />,
    );
    for (let k = 0; k < 4; k++) fireEvent.click(screen.getByRole('button', { name: 'Bagikan' }));
    fireEvent.click(screen.getByRole('button', { name: 'dua' }));
    expect(screen.getByText(/4 : 2 = 2/)).toBeTruthy();
    bagi.unmount();

    const ukur = render(
      <Experiment
        e={{
          jenis: 'ukur',
          judul: 'Ukur',
          suara: 'Ukur.',
          satuan: 'cm',
          ronde: [{ benda: 'pensil', panjang: 5 }],
        }}
        onDone={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '5 sentimeter' }));
    expect(ukur.container.querySelector('.lab-tick.is-right')).toBeTruthy();
    ukur.unmount();

    const luas = render(
      <Experiment
        e={{
          jenis: 'luas',
          judul: 'Luas',
          suara: 'Luas.',
          ronde: [{ baris: 1, kolom: 2, pilihan: [2, 3] }],
        }}
        onDone={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Petak 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Petak 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'dua' }));
    expect(luas.container.querySelector('.m-num.is-right')).toBeTruthy();
    luas.unmount();

    const dg = render(
      <Experiment
        e={{
          jenis: 'diagram',
          judul: 'Diagram',
          suara: 'Diagram.',
          ronde: [
            {
              data: [
                { nama: 'Apel', benda: 'apel', n: 3 },
                { nama: 'Jeruk', benda: 'jeruk', n: 1 },
              ],
              cari: 'banyak',
            },
          ],
        }}
        onDone={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apel: 3' }));
    expect(dg.container.querySelector('.lab-bar.is-right')).toBeTruthy();
    dg.unmount();

    for (const figur of ['pencernaan', 'tumbuhan', 'tubuh'] as const) {
      const spot = { judul: 'Bagian', teks: 'Penjelasan.', suara: 'Penjelasan.' };
      const parts = {
        pencernaan: ['mulut', 'lambung', 'usus-halus'],
        tumbuhan: ['akar', 'daun', 'bunga'],
        tubuh: ['kepala', 'tangan', 'kaki'],
      }[figur];
      const v = render(
        <Explorer
          x={{
            jenis: 'figur',
            figur,
            titik: parts.map((b, k) => ({ ...spot, bagian: b, judul: `Bagian ${k}` })),
          }}
          onDone={() => undefined}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Bagian 0' }));
      fireEvent.click(v.container.querySelector('.lab-act')!);
      v.unmount();
    }
  });
});
