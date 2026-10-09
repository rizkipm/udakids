import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  dotted,
  generateItem,
  guessSolution,
  linesCounts,
  skillTemplateSchema,
  stackSolution,
  type AnswerResult,
  type AnswerValue,
  type FamilyName,
  type Interaction,
} from '@little-coder/engine';
import { ItemPlayer } from '../../src/play/ItemPlayer';
import { t } from '../../src/i18n';

/** 6 game Kelas 4 (D-096): dimainkan lewat ketukan sampai selesai, lalu dinilai engine. */
function play(family: FamilyName, params: Record<string, unknown> = {}, seed = 4) {
  const item = generateItem(
    skillTemplateSchema.parse({
      id: `math.sd4.gm1.uji-${family}`,
      version: 1,
      domain: 'math',
      grade: 'sd4',
      category: 'GM',
      order: 1,
      title: 'Uji',
      tier: 'advanced',
      family,
      params,
    }),
    { seed, band: 1 },
  );
  const onAnswer = vi.fn<(r: AnswerResult & { value: AnswerValue }) => void>();
  render(<ItemPlayer item={item} onAnswer={onAnswer} mode="preview" />);
  return { it: item.interaction, onAnswer };
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const check = () => click(t('play.check'));
type Of<T extends Interaction['type']> = Extract<Interaction, { type: T }>;

describe('game Kelas 4', () => {
  it('Tebak Angka: tebakan mengikuti petunjuk → benar', () => {
    const { it: raw, onAnswer } = play('guess-game', { range: [1000, 9999], hint: 'digit' });
    const it = raw as Of<'guess'>;
    let cur = String(it.min).padStart(it.digits, '0').split('').map(Number);
    for (const g of guessSolution(it)) {
      const want = g.padStart(it.digits, '0').split('').map(Number);
      want.forEach((d, i) => {
        const place = t(`play.guess.place${it.digits - 1 - i}` as never);
        for (let k = 0; k < (d - cur[i]! + 10) % 10; k++) click(t('play.guess.up', { place }));
      });
      cur = want;
      click(t('play.guess.go'));
    }
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, points: 10 }));
  });

  it('Penyihir Hitung: jawab semua fakta; satu keliru → 5 poin', () => {
    const { it: raw, onAnswer } = play('magic-game', { count: 4 });
    const it = raw as Of<'magic'>;
    it.facts.forEach((f, i) => {
      if (i === 1) {
        const wrong = f.choices.find((c) => c.id !== f.answer)!;
        fireEvent.click(screen.getByRole('button', { name: wrong.say }));
      }
      fireEvent.click(
        screen.getByRole('button', { name: f.choices.find((c) => c.id === f.answer)!.say }),
      );
    });
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, points: 5 }));
  });

  it('Bingo Rupiah: ketuk nominal yang pas untuk setiap soal → bingo', () => {
    const { it: raw, onAnswer } = play('bingo-game');
    const it = raw as Of<'bingo'>;
    for (const c of it.calls) {
      const cell = it.cells.find((x) => x.id === c.answer)!;
      fireEvent.click(screen.getByRole('button', { name: cell.say }));
    }
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('Tumpuk Angka: tumpukan yang pas → benar', () => {
    const { it: raw, onAnswer } = play('stack-game');
    const it = raw as Of<'stack'>;
    for (const id of stackSolution(it.op, it.blocks, it.target, it.maxBlocks)!) {
      const b = it.blocks.find((x) => x.id === id)!;
      click(t('play.stack.add', { v: dotted(b.value) }));
    }
    check();
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('Garis Perkalian: isi titik potong per kelompok → benar', () => {
    const { it: raw, onAnswer } = play('lines-game');
    const it = raw as Of<'lines'>;
    const c = linesCounts(it.a, it.b);
    for (const g of ['ratusan', 'puluhan', 'satuan'] as const)
      for (let k = 0; k < c[g]; k++) click(t('play.lines.more', { g: t(`play.lines.${g}`) }));
    check();
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('Diagram Ajaib: batang sesuai tabel → benar', () => {
    const { it: raw, onAnswer } = play('chart-game', { scale: 2, steps: [1, 6] });
    const it = raw as Of<'chart'>;
    for (const b of it.bars)
      for (let k = 0; k < b.value / it.scale; k++) click(t('play.chart.more', { label: b.label }));
    check();
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
});
