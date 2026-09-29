import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  generateItem,
  skillTemplateSchema,
  type FamilyName,
  type Item,
} from '@little-coder/engine';
import { ItemPlayer } from '../../src/play/ItemPlayer';

const tpl = (family: FamilyName, params: Record<string, unknown> = {}) =>
  skillTemplateSchema.parse({
    id: `test.${family}`,
    version: 1,
    domain: 'math',
    grade: 'prek',
    category: 'A',
    order: 1,
    title: 'Uji',
    tier: 'basic',
    family,
    params,
  });

const item = (family: FamilyName, params: Record<string, unknown> = {}, seed = 3): Item =>
  generateItem(tpl(family, params), { seed, band: 1 });

const choiceButtons = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>('button.choice'),
];
const check = () => screen.getByRole('button', { name: 'Periksa' });

describe('ItemPlayer', () => {
  it('pick-one: ketuk jawaban benar → onAnswer correct, lalu terkunci', () => {
    const it = item('count');
    const onAnswer = vi.fn();
    const { container } = render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    expect(screen.getByText(it.prompt)).toBeInTheDocument();
    const answer = it.interaction.type === 'pick-one' ? it.interaction.answer : '';
    const idx =
      it.interaction.type === 'pick-one'
        ? it.interaction.choices.findIndex((c) => c.id === answer)
        : -1;
    fireEvent.click(choiceButtons(container)[idx]!);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, value: answer }),
    );
    fireEvent.click(choiceButtons(container)[0]!);
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('pick-one: jawaban keliru mencatat pengecoh', () => {
    const it = item('arith', {
      vars: { a: [2, 2], b: [2, 2] },
      distractors: [{ expr: 'a', tag: 'hanya-satu' }],
    });
    const onAnswer = vi.fn();
    const { container } = render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    const choices = it.interaction.type === 'pick-one' ? it.interaction.choices : [];
    fireEvent.click(choiceButtons(container)[choices.findIndex((c) => c.id === 'n2')]!);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false, chosenDistractor: 'hanya-satu' }),
    );
  });

  it('tap-all: pilih semua yang benar lalu Periksa', () => {
    const it = item('numeral-tap-all', { values: [1, 5], tiles: [4, 5] });
    const onAnswer = vi.fn();
    const { container } = render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    expect(check()).toBeDisabled();
    const ans = it.interaction.type === 'tap-all' ? it.interaction : undefined!;
    ans.choices.forEach(
      (c, i) => ans.answer.includes(c.id) && fireEvent.click(choiceButtons(container)[i]!),
    );
    fireEvent.click(check());
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('order: ketuk berurutan mengisi slot; ketuk slot mengembalikan', () => {
    const it = item('number-order', { length: [3, 3] });
    const onAnswer = vi.fn();
    const { container } = render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    const ord = it.interaction.type === 'order' ? it.interaction : undefined!;
    const poolFor = (id: string) => {
      const remaining = ord.choices.filter((c) => !picked.includes(c.id));
      return [...container.querySelectorAll<HTMLButtonElement>('.choices button.choice')][
        remaining.findIndex((c) => c.id === id)
      ]!;
    };
    const picked: string[] = [];
    // Pilih satu lalu kembalikan.
    fireEvent.click(container.querySelector<HTMLButtonElement>('.choices button.choice')!);
    fireEvent.click(container.querySelector<HTMLButtonElement>('.order-slots button.choice')!);
    expect(container.querySelectorAll('.choices button.choice')).toHaveLength(3);
    for (const id of ord.answer) {
      fireEvent.click(poolFor(id));
      picked.push(id);
    }
    fireEvent.click(check());
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, value: ord.answer }),
    );
  });

  it('group: pilih benda lalu ketuk kelompok', () => {
    const it = item('sort', { attribute: 'color', mode: 'group', items: [3, 3], groups: 2 });
    const onAnswer = vi.fn();
    const { container } = render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    const grp = it.interaction.type === 'group' ? it.interaction : undefined!;
    const heads = [...container.querySelectorAll<HTMLButtonElement>('.group-bin-head')];
    for (const itm of grp.items) {
      // Benda yang belum ditempatkan selalu di urutan awal pool; ambil yang pertama.
      fireEvent.click(container.querySelector<HTMLButtonElement>('.group-pool button.choice')!);
      fireEvent.click(heads[grp.groups.findIndex((g) => g.id === grp.answer[itm.id])]!);
    }
    fireEvent.click(check());
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });

  it('build: tambah sampai target lalu Periksa; ambil satu mengurangi', () => {
    const it = item('build', { range: [3, 3] });
    const onAnswer = vi.fn();
    render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    const add = screen.getByRole('button', { name: 'Tambah satu' });
    for (let i = 0; i < 4; i++) fireEvent.click(add);
    fireEvent.click(screen.getByRole('button', { name: 'Ambil satu' }));
    fireEvent.click(check());
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, value: 3 }));
  });

  it('number-line: ketuk angka lalu Periksa', () => {
    const it = item('number-line', { max: 10, start: [2, 2], steps: [3, 3] });
    const onAnswer = vi.fn();
    render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Garis bilangan' })).getByRole('button', {
        name: '5',
      }),
    );
    fireEvent.click(check());
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, value: 5 }));
  });

  it('preview dengan showAnswer menandai kunci jawaban', () => {
    const it = item('count');
    const { container } = render(<ItemPlayer item={it} mode="preview" showAnswer />);
    expect(container.querySelectorAll('.choice.is-answer')).toHaveLength(1);
  });
});

describe('isian angka (kelas 3+)', () => {
  it('keypad: ketik, hapus, koma untuk desimal, Periksa', () => {
    const it = generateItem(
      skillTemplateSchema.parse({
        id: 'math.sd34.d1.uji',
        version: 1,
        domain: 'math',
        grade: 'sd34',
        category: 'D',
        order: 1,
        title: 'Uji',
        tier: 'advanced',
        family: 'expr',
        params: {
          vars: { a: { values: [1.2] } },
          format: 'decimal',
          prompt: '{a} + 0,3 = …',
          answer: 'a + 0.3',
          mode: 'input',
          explain: '{answer}',
        },
      }),
      { seed: 0, band: 0 },
    );
    const onAnswer = vi.fn();
    render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    const key = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
    expect(check()).toBeDisabled();
    ['9', 'Hapus satu angka', '1', 'Koma', '5'].forEach(key);
    fireEvent.click(check());
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ correct: true, value: 1.5 }));
  });
});
