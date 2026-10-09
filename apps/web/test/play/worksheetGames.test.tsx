import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateItem,
  mazePath,
  skillTemplateSchema,
  type AnswerResult,
  type AnswerValue,
  type FamilyName,
  type Interaction,
} from '@little-coder/engine';
import { ItemPlayer } from '../../src/play/ItemPlayer';

/** Game Worksheet PAUD (D-075): dimainkan lewat ketukan sampai selesai, lalu dinilai engine. */
const item = (family: FamilyName, params: Record<string, unknown>, seed = 2) =>
  generateItem(
    skillTemplateSchema.parse({
      id: `worksheet.prek.z9.uji-${family}`,
      version: 1,
      domain: 'worksheet',
      grade: 'prek',
      category: 'Z',
      order: 9,
      title: 'Uji',
      tier: 'basic',
      family,
      params,
    }),
    { seed, band: 1 },
  );

function play(family: FamilyName, params: Record<string, unknown>) {
  const it = item(family, params);
  const onAnswer = vi.fn<(r: AnswerResult & { value: AnswerValue }) => void>();
  const view = render(<ItemPlayer item={it} onAnswer={onAnswer} mode="preview" />);
  return { it, onAnswer, ...view };
}

afterEach(() => vi.useRealTimers());

describe('game worksheet', () => {
  it('labirin: ketuk jalan keluar langkah demi langkah → benar', () => {
    vi.useFakeTimers();
    const { it, onAnswer, container } = play('maze-path', {
      mode: 'numbers',
      cols: [3, 3],
      rows: [3, 3],
    });
    const m = it.interaction as Extract<Interaction, { type: 'maze' }>;
    const cells = container.querySelectorAll<HTMLButtonElement>('.maze-cell');
    // Satu dinding ditabrak dulu (kotak awal sendiri), lalu jalan yang benar.
    fireEvent.click(cells[m.start]!);
    for (const c of mazePath(m, m.start, m.goal).slice(1)) {
      fireEvent.click(cells[c]!);
      act(() => {
        vi.advanceTimersByTime(400);
      });
    }
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
    expect(container.querySelector('.maze-board.is-done')).not.toBeNull();
  });

  it('cari kata: ketuk huruf tiap kata berurutan → benar; kata tercoret', () => {
    const { it, onAnswer, container } = play('word-search', {
      theme: 'hewan',
      size: [5, 5],
      words: [2, 2],
    });
    const ws = it.interaction as Extract<Interaction, { type: 'word-search' }>;
    const cells = container.querySelectorAll<HTMLButtonElement>('.ws-cell');
    for (const w of ws.words) for (const c of w.cells) fireEvent.click(cells[c]!);
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
    expect(container.querySelectorAll('.ws-words li.is-found')).toHaveLength(ws.words.length);
  });

  it('kartu pasangan: buka dua-dua sampai semua cocok → benar', () => {
    vi.useFakeTimers();
    const { it, onAnswer } = play('memory-pairs', { mode: 'letter-case', pairs: [3, 3] });
    const mem = it.interaction as Extract<Interaction, { type: 'memory' }>;
    const buttons = screen.getAllByRole('button', { name: /^Kartu \d$/ });
    expect(buttons).toHaveLength(6);
    const byPair = [...mem.cards].sort((a, b) => a.pair.localeCompare(b.pair));
    for (const c of byPair) {
      fireEvent.click(buttons[mem.cards.indexOf(c)]!);
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('tangkap: yang keliru hanya bergoyang; semua yang tepat tertangkap → benar', () => {
    const { it, onAnswer, container } = play('catch-items', { mode: 'numeral', values: [1, 5] });
    const c = it.interaction as Extract<Interaction, { type: 'catch' }>;
    const items = container.querySelectorAll<HTMLButtonElement>('.catch-item');
    const wrong = c.choices.findIndex((x) => !c.answer.includes(x.id));
    fireEvent.click(items[wrong]!);
    expect(container.querySelector('.catch-body.is-wobble')).not.toBeNull();
    for (const id of c.answer) fireEvent.click(items[c.choices.findIndex((x) => x.id === id)]!);
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
    expect(container.querySelectorAll('.catch-got-item')).toHaveLength(c.answer.length);
  });

  it('kartu huruf tampil besar', () => {
    const { container } = play('letter-find', { mode: 'show', letters: ['a'], pool: ['a', 'i'] });
    expect(container.querySelectorAll('.choice-text.is-letter').length).toBeGreaterThan(1);
  });
});

describe('lihat sekilas, garis, uang kertas (D-081)', () => {
  it('gambar soal ditutup setelah sebentar; "Lihat lagi" membukanya, tanpa batas waktu menjawab', () => {
    vi.useFakeTimers();
    const it = item('subitize', { mode: 'dots', values: [3, 3], peek: 1500 });
    const onAnswer = vi.fn();
    const { container } = render(<ItemPlayer item={it} onAnswer={onAnswer} />);
    expect(container.querySelector('.peek-cover')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(container.querySelector('.item-stimulus.is-hidden')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lihat lagi' }));
    expect(container.querySelector('.item-stimulus.is-hidden')).toBeNull();
    // Masih bisa menjawab kapan saja.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /\b3\b|tiga/i })[0]!);
    expect(onAnswer.mock.calls[0]![0].correct).toBe(true);
  });

  it('kartu garis dan uang kertas tergambar', () => {
    const { container } = play('stroke-find', { strokes: ['tegak', 'datar', 'zigzag'] });
    expect(container.querySelectorAll('.choice svg path').length).toBeGreaterThan(2);
    const note = render(
      <ItemPlayer
        item={{ ...item('fingers', { mode: 'count' }), stimulus: [{ kind: 'note', value: 5000 }] }}
        mode="preview"
      />,
    );
    expect(note.container.textContent).toContain('Rp5.000');
  });
});
