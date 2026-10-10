import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  generateItem,
  skillTemplateSchema,
  type AnswerResult,
  type AnswerValue,
  type FamilyName,
  type Interaction,
} from '@little-coder/engine';
import { ItemPlayer } from '../../src/play/ItemPlayer';
import { t } from '../../src/i18n';

/** Game berhitung PAUD (D-108): dimainkan dengan ketukan saja, lalu dinilai engine. */
function play(family: FamilyName, params: Record<string, unknown> = {}, seed = 5) {
  const item = generateItem(
    skillTemplateSchema.parse({
      id: `math.prek.gn1.uji-${family}`,
      version: 1,
      domain: 'math',
      grade: 'prek',
      category: 'GN',
      order: 1,
      title: 'Uji',
      tier: 'basic',
      family,
      params,
    }),
    { seed, band: 1 },
  );
  const onAnswer = vi.fn<(r: AnswerResult & { value: AnswerValue }) => void>();
  render(<ItemPlayer item={item} onAnswer={onAnswer} mode="preview" />);
  return { it: item.interaction, onAnswer };
}
type Of<T extends Interaction['type']> = Extract<Interaction, { type: T }>;
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('game berhitung PAUD', () => {
  it('akuarium: ketuk ikan (menyala & dihitung), lalu pilih angka → benar', () => {
    const { it: raw, onAnswer } = play('count-game', { theme: 'aquarium', n: [3, 3] });
    const it = raw as Of<'count'>;
    for (let i = 1; i <= it.n; i++) click(t('play.count.object', { n: i }));
    expect(screen.getByText(t('play.count.allCounted'))).toBeTruthy();
    const answer = it.choices.find((c) => c.id === it.answer)!;
    click(answer.say!);
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, points: 10 }));
  });

  it('kue: pasang lilin sebanyak target lalu Selesai → benar', () => {
    const { it: raw, onAnswer } = play('cake-game', { target: [4, 4] });
    const it = raw as Of<'build'>;
    for (let i = 0; i < it.target; i++) click(t('play.cake.add'));
    fireEvent.click(screen.getByRole('button', { name: t('play.check') }));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('kalung manik: lanjutkan pola; satu manik keliru → 5 poin', () => {
    const { it: raw, onAnswer } = play('beads-game', { patterns: ['AB'] });
    const it = raw as Of<'beads'>;
    const say = (id: string) => it.choices.find((c) => c.id === id)!.say!;
    const wrong = it.choices.find((c) => c.id !== it.answer[0])!;
    click(wrong.say!);
    for (const id of it.answer) click(say(id));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, points: 5 }));
  });

  it('bingo angka: soal hanya dibacakan; ketuk angkanya sampai satu garis → benar', () => {
    const { it: raw, onAnswer } = play('number-bingo', { mode: 'number', range: [0, 10] });
    const it = raw as Of<'bingo'>;
    expect(screen.getByText(t('play.bingo.listenFirst'))).toBeTruthy();
    for (const c of it.calls) {
      const cell = it.cells.find((x) => x.id === c.answer)!;
      fireEvent.click(screen.getByRole('button', { name: cell.say! }));
    }
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('kartu monster: kartu tertutup bergambar pintu monster', () => {
    play('memory-pairs', { theme: 'monster', values: [1, 4], pairs: [2, 2] });
    expect(document.querySelectorAll('.mem-back.is-monster').length).toBe(4);
  });
});
