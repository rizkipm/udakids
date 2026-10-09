import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { infografisSchema, skillTemplateSchema, visualSchema } from '@little-coder/engine';
import { InfografisScreen } from '../../src/play/Infografis';
import { exampleItem } from '../../src/play/LessonMedia';
import { MATERI_ANGKA } from '../../src/play/materi/angka';
import { materiOf } from '../../src/play/materi/registry';
import { ContohPlayer, MainView } from '../../src/play/materi/widgets';

/** Materi lengkap (purwarupa) "Angka dan membilang": data sahih dan setiap layar tampil tanpa error. */
const dir = join(__dirname, '../../../../content/skills/math/tkosn');
const skills = readdirSync(dir)
  .filter((f) => /^A\d\d-.*\.json$/.test(f))
  .map((f) => skillTemplateSchema.parse(JSON.parse(readFileSync(join(dir, f), 'utf8'))));
const steps = MATERI_ANGKA.bab.flatMap((b) => b.langkah.map((l) => ({ bab: b, l })));

describe('materi lengkap: Angka dan membilang', () => {
  it('terdaftar untuk topik A di Math TK (Olimpiade)', () => {
    expect(materiOf('math', 'tkosn', 'A')).toBe(MATERI_ANGKA);
    expect(materiOf('math', 'tkosn', 'B')).toBeUndefined();
  });

  it('setiap level latihan A1–A10 dibahas di sebuah bab dan dicoba lewat soal asli', () => {
    const levels = new Set(MATERI_ANGKA.bab.flatMap((b) => b.level));
    for (const s of skills) expect(levels.has(s.order)).toBe(true);
    for (const b of MATERI_ANGKA.bab) {
      expect(b.langkah[0]!.jenis).toBe('jelaskan');
      expect(b.langkah.at(-1)!.jenis).toBe('ingat');
      expect(b.langkah.some((l) => l.jenis === 'soal')).toBe(true);
    }
  });

  it('poster & gambar memenuhi skema; soal contoh bisa dibuat', () => {
    for (const { bab, l } of steps) {
      expect(visualSchema.safeParse(bab.ikon).success).toBe(true);
      if (l.jenis === 'jelaskan')
        expect(infografisSchema.safeParse(l.poster).error).toBeUndefined();
      if (l.jenis === 'contoh')
        for (const a of l.adegan)
          for (const v of a.visual) expect(visualSchema.safeParse(v).error).toBeUndefined();
      if (l.jenis === 'soal')
        expect(exampleItem(skills, { level: l.level, seed: l.seed })).toBeDefined();
    }
  });

  it('jawaban setiap permainan ada di antara pilihannya', () => {
    for (const { l } of steps) {
      if (l.jenis !== 'main') continue;
      const m = l.main;
      if (m.tipe === 'dengar-ketuk') for (const r of m.ronde) expect(r.pilihan).toContain(r.target);
      if (m.tipe === 'hitung-ketuk') for (const r of m.ronde) expect(r.pilihan).toContain(r.n);
      if (m.tipe === 'kereta')
        for (const r of m.ronde) expect(r.pilihan).toContain(r.deret[r.kosong]);
      if (m.tipe === 'antrean')
        for (const r of m.ronde) expect(r).toBeLessThanOrEqual(m.hewan.length);
    }
  });

  it('semua layar tampil tanpa error', () => {
    for (const { l } of steps) {
      const { unmount } =
        l.jenis === 'jelaskan'
          ? render(<InfografisScreen data={l.poster} />)
          : l.jenis === 'contoh'
            ? render(<ContohPlayer adegan={l.adegan} />)
            : l.jenis === 'main'
              ? render(<MainView main={l.main} />)
              : render(<p>{l.teks}</p>);
      unmount();
    }
  });

  it('urutkan: kartu yang belum giliran bergoyang, yang tepat masuk ke urutan', () => {
    const { container } = render(<MainView main={{ tipe: 'urutkan', ronde: [[3, 1, 2]] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'tiga' }));
    expect(container.querySelector('.is-shake')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'satu' }));
    expect(container.querySelectorAll('.m-slots .is-filled')).toHaveLength(1);
  });

  it('bingkai: dua bingkai untuk angka belasan, menghitung setiap ketukan', () => {
    const { container } = render(<MainView main={{ tipe: 'bingkai', ronde: [13] }} />);
    expect(container.querySelectorAll('.m-frame')).toHaveLength(2);
    const cells = container.querySelectorAll('.m-cell');
    for (let k = 0; k < 11; k++) fireEvent.click(cells[k]!);
    expect(container.querySelector('.m-frame-count b')!.textContent).toBe('11');
    expect(container.querySelector('.m-frame.is-full')).toBeTruthy();
  });
});
