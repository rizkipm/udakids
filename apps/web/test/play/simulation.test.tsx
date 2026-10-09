import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogSchema } from '@little-coder/engine';
import { SimulationScreen } from '../../src/play/LessonSim';

/** Simulasi "Tubuhku bekerja" (D-088) dari isi topik H Sains TK (Olimpiade). */
const sim = catalogSchema
  .parse(
    JSON.parse(
      readFileSync(join(process.cwd(), '../../content/skills/sains/tkosn/_catalog.json'), 'utf8'),
    ),
  )
  .categories.find((c) => c.code === 'H')!.lesson!.layar[0]!.simulasi!;

describe('simulasi tubuh (foto realistis, cadangan SVG)', () => {
  beforeEach(() => {
    // Foto belum dibuat/disetujui → server menjawab id null → gambar SVG cadangan.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ id: null }), { status: 200 })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('jelajah → kegiatan → aha → selesai, dengan suara per kunci', async () => {
    // Narasi langsung "selesai" agar urutan aha → tutup berjalan.
    const voice = vi.fn((_k: string, _t: string, onEnd?: () => void) => onEnd?.());
    render(<SimulationScreen sim={sim} voice={voice} />);
    const parts = screen.getByRole('group', { name: 'Bagian tubuh' });

    // Jelajah: setiap bagian disentuh lewat kartunya.
    for (const b of sim.bagian) fireEvent.click(within(parts).getByRole('button', { name: b.id }));
    expect(voice).toHaveBeenCalledWith('b.mata', 'Ini mata. Mata untuk melihat.');
    expect(screen.getByText('Semua bagian sudah kamu kenal!')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ayo coba kegiatan' }));
    expect(voice).toHaveBeenLastCalledWith('sk', sim.kegiatanSuara);

    // Bagian yang tidak dipakai hanya bergoyang (tanpa suara "salah"), bagian yang dipakai dihitung.
    for (const k of sim.kegiatan) {
      fireEvent.click(screen.getByRole('button', { name: k.teks }));
      const before = voice.mock.calls.length;
      const unused = sim.bagian.find((b) => !k.bagian.includes(b.id))!;
      fireEvent.click(within(parts).getByRole('button', { name: unused.id }));
      expect(voice.mock.calls.length).toBe(before);
      for (const b of k.bagian) fireEvent.click(within(parts).getByRole('button', { name: b }));
      expect(voice).toHaveBeenCalledWith(`k.${k.id}.ok`, k.selesai, expect.any(Function));
    }
    // Momen "aha" sekali, pada kegiatan pertama yang memakai lebih dari satu bagian tubuh.
    expect(voice.mock.calls.filter((c) => c[0] === 'aha')).toHaveLength(1);
    expect(voice).toHaveBeenLastCalledWith('tutup', sim.tutup);
    expect(screen.getByText('Hebat, semua kegiatan sudah kamu coba dengan teliti!')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/salah|gagal/i);
  });

  it('tanpa foto: titik di gambar disembunyikan (posisinya untuk foto), kartu bagian tetap ada', () => {
    const { container } = render(<SimulationScreen sim={sim} voice={() => undefined} />);
    expect(container.querySelectorAll('.sim-spot')).toHaveLength(0);
    expect(container.querySelectorAll('.sim-part')).toHaveLength(sim.bagian.length);
  });
});
