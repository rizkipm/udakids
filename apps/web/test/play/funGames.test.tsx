import { fireEvent, render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  crosswordLetters,
  generateItem,
  skillTemplateSchema,
  sumSolution,
  type AnswerResult,
  type AnswerValue,
  type FamilyName,
  type Interaction,
} from '@little-coder/engine';
import { ItemPlayer } from '../../src/play/ItemPlayer';
import { t } from '../../src/i18n';

/** Game seru (D-078): dimainkan lewat ketukan sampai selesai, lalu dinilai engine. */
const item = (family: FamilyName, params: Record<string, unknown>, seed = 3) =>
  generateItem(
    skillTemplateSchema.parse({
      id: `math.prek.gm9.uji-${family}`,
      version: 1,
      domain: 'math',
      grade: 'prek',
      category: 'GM',
      order: 9,
      title: 'Uji',
      tier: 'basic',
      family,
      params,
    }),
    { seed, band: 1 },
  );

function play(family: FamilyName, params: Record<string, unknown>, seed?: number) {
  const it = item(family, params, seed);
  const onAnswer = vi.fn<(r: AnswerResult & { value: AnswerValue }) => void>();
  const view = render(<ItemPlayer item={it} onAnswer={onAnswer} mode="preview" />);
  return { it, onAnswer, ...view };
}
const check = () => fireEvent.click(screen.getByRole('button', { name: t('play.check') }));

describe('game seru', () => {
  it('neraca: tambah beban sampai seimbang → benar; terlalu berat → belum', () => {
    const { it, onAnswer, container } = play('sum-game', {
      style: 'balance',
      target: [5, 5],
      given: [2, 2],
      values: [1, 2],
      showNumber: true,
    });
    const sum = it.interaction as Extract<Interaction, { type: 'sum' }>;
    const tok = (v: number) =>
      container.querySelectorAll<HTMLButtonElement>('.sum-token')[
        sum.tokens.findIndex((x) => x.value === v)
      ]!;
    fireEvent.click(tok(2));
    fireEvent.click(tok(1));
    expect(container.querySelector('.sum-board.is-even')).not.toBeNull();
    check();
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('toko Momo: koin pas → benar', () => {
    const { it, onAnswer, container } = play('sum-game', {
      style: 'shop',
      target: [700, 700],
      step: 100,
      values: [100, 200, 500],
      objects: ['kue'],
    });
    const sum = it.interaction as Extract<Interaction, { type: 'sum' }>;
    const tokens = container.querySelectorAll<HTMLButtonElement>('.sum-token');
    for (const id of sumSolution(sum.tokens, 700)!)
      fireEvent.click(tokens[sum.tokens.findIndex((x) => x.id === id)]!);
    check();
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('lompat kodok: batu keliru bergoyang, urutan benar selesai', () => {
    const { it, onAnswer, container } = play('hop-game', {
      mode: 'add',
      board: [0, 10],
      start: [2, 2],
      hops: [3, 3],
    });
    const hop = it.interaction as Extract<Interaction, { type: 'hop' }>;
    const stone = (v: number) =>
      screen.getByRole('button', { name: t('play.hop.stone', { n: v }) });
    fireEvent.click(stone(9));
    expect(container.querySelector('.hop-stone.is-wobble')).not.toBeNull();
    for (const v of hop.answer) fireEvent.click(stone(v));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('sortir keranjang: setiap benda ke keranjangnya → benar', () => {
    const { it, onAnswer } = play('sort-game', {
      bins: [
        { id: 'darat', label: 'hewan darat', icon: { object: 'rumput' } },
        { id: 'air', label: 'hewan air', icon: { object: 'laut' } },
      ],
      items: [
        { bin: 'darat', item: { object: 'sapi' } },
        { bin: 'darat', item: { object: 'kuda' } },
        { bin: 'air', item: { object: 'ikan' } },
        { bin: 'air', item: { object: 'paus' } },
      ],
      count: [4, 4],
    });
    const sort = it.interaction as Extract<Interaction, { type: 'sort' }>;
    for (const x of sort.items) {
      const bin = sort.bins.find((b) => b.id === sort.answer[x.id])!;
      fireEvent.click(screen.getByRole('button', { name: t('play.sort.bin', { name: bin.say! }) }));
    }
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('teka-teki silang: isi semua huruf → benar', () => {
    const { it, onAnswer, container } = play('crossword-game', {
      theme: 'transportasi',
      words: [2, 2],
      reveal: 'first',
    });
    const cw = it.interaction as Extract<Interaction, { type: 'crossword' }>;
    const filled = new Set(cw.prefill);
    const letterBtn = (ch: string) =>
      [...container.querySelectorAll<HTMLButtonElement>('.cross-letter')].find(
        (b) => b.textContent === ch,
      )!;
    cw.words.forEach((w, i) => {
      fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.cross-clue')[i]!);
      w.cells.forEach((c, k) => {
        if (filled.has(c)) return;
        filled.add(c);
        fireEvent.click(letterBtn(w.text[k]!));
      });
    });
    expect(crosswordLetters(cw).filter(Boolean)).toHaveLength(
      container.querySelectorAll('.cross-cell.is-filled').length,
    );
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('puzzle: ketuk kepingan lalu tempatnya → benar', () => {
    const { it, onAnswer } = play('jigsaw-game', { pictures: ['kucing'], fixed: [0, 0] });
    const jig = it.interaction as Extract<Interaction, { type: 'jigsaw' }>;
    for (let k = 0; k < jig.cols * jig.rows; k++) {
      fireEvent.click(screen.getByRole('button', { name: t('play.jigsaw.piece', { n: k + 1 }) }));
      fireEvent.click(screen.getByRole('button', { name: t('play.jigsaw.slot', { n: k + 1 }) }));
    }
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('kereta, bianglala, label, dan beri makan memakai tampilan game', () => {
    const train = play('train-game', { mode: 'numbers' });
    expect(train.container.querySelector('.train-board')).not.toBeNull();
    train.unmount();
    const wheel = play('wheel-game', { mode: 'countdown', style: 'rocket' });
    expect(wheel.container.querySelector('.wheel-board.is-rocket')).not.toBeNull();
    wheel.unmount();
    const label = play('label-game', {
      words: [
        { word: 'cat', picture: { object: 'kucing', say: 'cat' } },
        { word: 'dog', picture: { object: 'anjing', say: 'dog' } },
      ],
    });
    expect(label.container.querySelector('.label-board')).not.toBeNull();
    label.unmount();
    const feed = play('feed-game', { target: [3, 3] });
    fireEvent.click(screen.getByRole('button', { name: t('play.feed.give') }));
    fireEvent.click(screen.getByRole('button', { name: t('play.feed.give') }));
    fireEvent.click(screen.getByRole('button', { name: t('play.feed.give') }));
    check();
    expect(feed.onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('semua level game seru di content/ tampil tanpa error', () => {
    const base = join(import.meta.dirname, '..', '..', '..', '..', 'content', 'skills');
    let n = 0;
    for (const book of ['math/prek', 'english/prek', 'math/tk', 'sains/tk']) {
      for (const f of readdirSync(join(base, book)).filter((x) => x.startsWith('GM'))) {
        const tpl = skillTemplateSchema.parse(
          JSON.parse(readFileSync(join(base, book, f), 'utf8')),
        );
        for (let seed = 0; seed < 4; seed++) {
          const view = render(
            <ItemPlayer item={generateItem(tpl, { seed, band: seed % 3 })} mode="preview" />,
          );
          view.unmount();
          n++;
        }
      }
    }
    expect(n).toBe(160);
  });
});
