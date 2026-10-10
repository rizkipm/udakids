import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  clearSolution,
  generateItem,
  skillTemplateSchema,
  type AnswerResult,
  type AnswerValue,
  type FamilyName,
  type Interaction,
} from '@little-coder/engine';
import { ItemPlayer } from '../../src/play/ItemPlayer';
import { t } from '../../src/i18n';

/** Arena game Momo (D-115): setiap papan bisa dimainkan sampai benar dengan ketukan saja. */
function play(family: FamilyName, params: Record<string, unknown> = {}, seed = 3) {
  const item = generateItem(
    skillTemplateSchema.parse({
      id: `math.sd2.gx1.uji-${family}`,
      version: 1,
      domain: 'math',
      grade: 'sd2',
      category: 'GX',
      order: 1,
      title: 'Uji',
      tier: 'intermediate',
      family,
      params,
    }),
    { seed, band: 1 },
  );
  const onAnswer = vi.fn<(r: AnswerResult & { value: AnswerValue }) => void>();
  const view = render(<ItemPlayer item={item} onAnswer={onAnswer} mode="preview" />);
  return { it: item.interaction, onAnswer, view };
}
type Of<T extends Interaction['type']> = Extract<Interaction, { type: T }>;
const click = (name: string) => fireEvent.click(screen.getAllByRole('button', { name })[0]!);
const right = expect.objectContaining({ correct: true, points: 10 });

describe('Arena game Momo', () => {
  it('balap: jawab setiap ronde, mobil sampai finis', () => {
    const { it: raw, onAnswer } = play('race-game', { rule: 'even', range: [1, 40] });
    const it = raw as Of<'quest'>;
    for (const r of it.rounds) click(r.choices.find((c) => c.id === r.answer)!.say!);
    expect(onAnswer).toHaveBeenCalledWith(right);
  });

  it('dadu: harus dilempar dulu, lalu ketuk jumlahnya', () => {
    const { it: raw, onAnswer } = play('dice-game', { dice: 2, rounds: [2, 2] });
    const it = raw as Of<'quest'>;
    const first = it.rounds[0]!;
    const answer = first.choices.find((c) => c.id === first.answer)!;
    // Belum dilempar: pilihan belum bisa diketuk.
    expect(
      (screen.getAllByRole('button', { name: answer.say! })[0] as HTMLButtonElement).disabled,
    ).toBe(true);
    for (const r of it.rounds) {
      click(t('play.quest.roll'));
      click(r.choices.find((c) => c.id === r.answer)!.say!);
    }
    expect(onAnswer).toHaveBeenCalledWith(right);
  });

  it('balon: pecahkan dulu sebanyak yang diminta, lalu hitung sisanya', () => {
    const { it: raw, onAnswer } = play('balloon-game', { n: [5, 8], pop: [2, 3], rounds: [2, 2] });
    const it = raw as Of<'quest'>;
    for (const r of it.rounds) {
      for (let k = 0; k < r.balloons!.pop; k++)
        fireEvent.click(
          screen
            .getAllByRole('button', { name: t('play.quest.pop') })
            .find((b) => !(b as HTMLButtonElement).disabled)!,
        );
      expect(screen.getByText(t('play.quest.nowCount'))).toBeTruthy();
      click(r.choices.find((c) => c.id === r.answer)!.say!);
    }
    expect(onAnswer).toHaveBeenCalledWith(right);
  });

  it('hoki: ketuk angka di nilai tempat yang diminta; tendang: pilih gawang terdekat', () => {
    const hockey = play('hockey-game', { digits: [4, 4], rounds: [2, 2] });
    for (const r of (hockey.it as Of<'quest'>).rounds) {
      const k = r.choices.findIndex((c) => c.id === r.answer);
      fireEvent.click(document.querySelectorAll('.hockey-digit')[k]!);
    }
    expect(hockey.onAnswer).toHaveBeenCalledWith(right);
    hockey.view.unmount();
    const kick = play('kick-game', { unit: 10, range: [11, 99], rounds: [2, 2] });
    for (const r of (kick.it as Of<'quest'>).rounds) {
      const goal = r.choices.find((c) => c.id === r.answer)!;
      click(t('play.quest.goal', { n: goal.say! }));
    }
    expect(kick.onAnswer).toHaveBeenCalledWith(right);
  });

  it('gelembung: pengecoh = keliru sekali (5 poin), lalu urutan lengkap', () => {
    const { it: raw, onAnswer } = play('bubbles-game', {
      start: [10, 10],
      step: [10],
      length: [4, 4],
      decoys: [2, 2],
    });
    const it = raw as Of<'bubbles'>;
    const decoy = it.bubbles.find((b) => !it.answer.includes(b.id))!;
    click(decoy.say!);
    for (const id of it.answer) click(it.bubbles.find((b) => b.id === id)!.say!);
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, points: 5 }));
  });

  it('papan angka: ketuk tempat angka yang bersembunyi; mode kelipatan: ketuk semuanya', () => {
    const find = play('grid-game', { start: [1, 1], count: 20, hidden: [2, 2] });
    const g = find.it as Of<'grid'>;
    expect(screen.getAllByRole('button', { name: t('play.grid.hidden') })).toHaveLength(2);
    for (const c of g.calls!)
      fireEvent.click(
        document.querySelectorAll('.grid-cell')[Number(c.answer.slice(1)) - g.start]!,
      );
    expect(find.onAnswer).toHaveBeenCalledWith(right);
    find.view.unmount();
    const mult = play('grid-game', { mode: 'multiples', start: [1, 1], count: 20, k: [5] });
    const m = mult.it as Of<'grid'>;
    for (const id of m.targets!)
      fireEvent.click(document.querySelectorAll('.grid-cell')[Number(id.slice(1)) - m.start]!);
    expect(mult.onAnswer).toHaveBeenCalledWith(right);
  });

  it('ular puluhan: susun puluhan & satuan lalu Selesai', () => {
    const { it: raw, onAnswer } = play('tens-game', { target: [47, 47] });
    const it = raw as Of<'tens'>;
    expect(it.target).toBe(47);
    for (let k = 0; k < 4; k++) click(t('play.tens.more', { place: t('play.tens.place.puluh') }));
    for (let k = 0; k < 7; k++) click(t('play.tens.more', { place: t('play.tens.place.satu') }));
    click(t('play.check'));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('bersihkan papan: pasangan sepuluh sampai papan kosong', () => {
    const { it: raw, onAnswer } = play('clear-game', { targets: [10], pairs: [3, 3] });
    const it = raw as Of<'clear'>;
    const tiles = document.querySelectorAll('.clear-tile');
    for (const id of clearSolution(it))
      fireEvent.click(tiles[it.tiles.findIndex((x) => x.id === id)]!);
    expect(onAnswer).toHaveBeenCalledWith(right);
  });

  it('atur jam: putar jarum lalu Selesai (jam digital tidak ditampilkan)', () => {
    const { it: raw, onAnswer } = play('clock-game', { minutes: 30 });
    const it = raw as Of<'clock'>;
    for (let k = 0; k < it.hour % 12; k++) click(t('play.clock.hourNext'));
    for (let k = 0; k < it.minute / 30; k++) click(t('play.clock.minuteNext', { n: 30 }));
    click(t('play.check'));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('pizza: warnai potongan sesuai pecahan senilai lalu Selesai', () => {
    const { it: raw, onAnswer } = play('pizza-game', {
      mode: 'equivalent',
      dens: [2],
      factors: [2],
    });
    const it = raw as Of<'pizza'>;
    expect(it.parts).toBe(4);
    const slices = document.querySelectorAll('.pizza-slice');
    for (let k = 0; k < it.target; k++) fireEvent.click(slices[k]!);
    click(t('play.check'));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
});
