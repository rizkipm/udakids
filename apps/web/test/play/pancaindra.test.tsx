import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  generateItem,
  skillTemplateSchema,
  type AnswerResult,
  type AnswerValue,
  type Interaction,
} from '@little-coder/engine';
import { ItemPlayer } from '../../src/play/ItemPlayer';
import { ExploreScreen, ReadScreen, VideoScreen } from '../../src/play/LessonMedia';

/** Pancaindra (D-089): game ketuk di wajah + layar pelajaran interaktif. */
const item = (params: Record<string, unknown>, seed = 3) =>
  generateItem(
    skillTemplateSchema.parse({
      id: 'sains.tkosn.z9.uji-sense-tap',
      version: 1,
      domain: 'sains',
      grade: 'tkosn',
      category: 'Z',
      order: 9,
      title: 'Uji',
      tier: 'basic',
      family: 'sense-tap',
      params,
    }),
    { seed, band: 1 },
  );

describe('game ketuk di wajah', () => {
  it('pilihan tampil sebagai titik di wajah; mengetuk jawabannya dinilai benar', () => {
    const it = item({ mode: 'name' });
    const p = it.interaction as Extract<Interaction, { type: 'pick-one' }>;
    const onAnswer = vi.fn<(r: AnswerResult & { value: AnswerValue }) => void>();
    const { container } = render(<ItemPlayer item={it} onAnswer={onAnswer} mode="preview" />);
    expect(container.querySelectorAll('.face-spot')).toHaveLength(p.choices.length);
    const ans = p.choices.find((c) => c.id === p.answer)!;
    fireEvent.click(screen.getByRole('button', { name: ans.say }));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, value: 'ans' }));
  });
});

describe('layar pelajaran interaktif', () => {
  it('video: teks adegan tampil, tombol berikutnya pindah adegan', () => {
    render(
      <VideoScreen
        scenes={[
          { teks: 'Ini mata.', suara: 'Ini mata.', gambar: [{ face: 'mata' }] },
          { teks: 'Ini telinga.', suara: 'Ini telinga.', gambar: [{ sense: 'telinga' }] },
        ]}
      />,
    );
    expect(screen.getByText('Ini mata.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Adegan berikutnya' }));
    expect(screen.getByText('Ini telinga.')).toBeTruthy();
  });

  it('jelajah: mengetuk bagian wajah menambah hitungan dan menampilkan kartunya', () => {
    render(
      <ExploreScreen
        spots={[
          { bagian: 'mata', teks: 'Mata untuk melihat.', suara: 'Mata.' },
          { bagian: 'hidung', teks: 'Hidung untuk mencium.', suara: 'Hidung.' },
        ]}
      />,
    );
    expect(screen.getByText('0 dari 2 sudah kamu jelajahi')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'hidung' }));
    expect(screen.getByText('Hidung untuk mencium.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'mata' }));
    expect(screen.getByText(/Semua sudah kamu jelajahi/)).toBeTruthy();
  });

  it('bacaan: kalimat bisa diketuk', () => {
    render(<ReadScreen lines={[{ teks: 'Mata melihat.' }, { teks: 'Telinga mendengar.' }]} />);
    const line = screen.getByText('Telinga mendengar.').closest('button')!;
    fireEvent.click(line);
    expect(line.className).toContain('is-on');
  });
});
