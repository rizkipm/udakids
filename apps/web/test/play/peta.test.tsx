import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  FREE_ACCESS,
  skillTemplateSchema,
  type Catalog,
  type PlayStatus,
} from '@little-coder/engine';
import { t } from '../../src/i18n';
import type { Shelf } from '../../src/play/catalog';
import type { Links } from '../../src/play/links';
import {
  babsOf,
  columnsFor,
  mapelOf,
  markNodes,
  nodeInfo,
  PetaBelajar,
  snake,
  type NodeInfo,
} from '../../src/play/peta/PetaBelajar';

const speak = vi.hoisted(() => vi.fn());
vi.mock('../../src/audio/speech', async (orig) => ({
  ...(await orig<typeof import('../../src/audio/speech')>()),
  speak,
}));

const skill = (category: string, order: number) =>
  skillTemplateSchema.parse({
    id: `math.prek.${category.toLowerCase()}${order}.uji`,
    version: 1,
    domain: 'math',
    grade: 'prek',
    category,
    order,
    title: `Uji ${category} ${order}`,
    tier: 'basic',
    family: 'count',
    params: { range: [2, 2] },
  });

const catalog: Catalog = {
  domain: 'math',
  grade: 'prek',
  title: 'Math PAUD',
  categories: [
    {
      code: 'A',
      title: 'Membilang',
      intro: 'Membilang artinya menghitung benda satu per satu.',
      tips: ['Tunjuk setiap benda satu kali saja.'],
    },
    { code: 'B', title: 'Penjumlahan', intro: 'Menambah berarti jumlahnya bertambah.' },
    { code: 'C', title: 'Pola', group: 'EMC · Eduversal Mathematics Competition — Penyisihan' },
  ],
};
const shelves: Shelf[] = catalog.categories.map((category) => ({
  catalog,
  category,
  skills: [1, 2, 3].map((o) => skill(category.code, o)),
}));
const ids = (code: string) =>
  shelves.find((s) => s.category.code === code)!.skills.map((k) => k.id);
const statuses: Record<string, PlayStatus> = {
  ...Object.fromEntries(ids('A').map((id) => [id, 'passed'])),
  [ids('B')[0]!]: 'passed',
  [ids('B')[1]!]: 'open',
  [ids('B')[2]!]: 'locked',
  ...Object.fromEntries(ids('C').map((id) => [id, 'locked'])),
};
const links: Links = {
  level: (id) => `/play/latihan/${id}`,
  topic: (x) => `/play/topik/${x.category}`,
  skillOf: () => undefined,
  topicOf: () => undefined,
  materi: (x) => `/play/belajar/${x.category}/materi`,
  book: (b) => `/play/lab/${b.domain}-${b.grade}`,
  bookOf: () => undefined,
};

const renderMap = () =>
  render(
    <MemoryRouter>
      <PetaBelajar
        book={catalog}
        shelves={shelves}
        statuses={statuses}
        nextCode="B"
        links={links}
        access={FREE_ACCESS}
        momoColor="biru"
      />
    </MemoryRouter>,
  );

describe('Peta Belajar (D-111)', () => {
  it('keadaan simpul & bintang dari progres yang ada', () => {
    expect(nodeInfo(shelves[0]!, statuses, false)).toMatchObject({ state: 'lulus', stars: 3 });
    expect(nodeInfo(shelves[1]!, statuses, true)).toMatchObject({
      state: 'sekarang',
      passed: 1,
      total: 3,
      stars: 1,
    });
    expect(nodeInfo(shelves[1]!, statuses, false).state).toBe('terbuka');
    expect(nodeInfo(shelves[2]!, statuses, false)).toMatchObject({ state: 'terkunci', stars: 0 });
    const paid = { ...statuses, [ids('C')[0]!]: 'paid' as const };
    expect(nodeInfo(shelves[2]!, paid, false)).toMatchObject({ state: 'terkunci', paidNext: true });
  });

  it('bab per group, jalur ular, warna mapel', () => {
    expect(babsOf(shelves).map((b) => b.group ?? '')).toEqual([
      '',
      'EMC · Eduversal Mathematics Competition — Penyisihan',
    ]);
    // Baris genap kiri → kanan, baris ganjil kanan → kiri.
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => snake(i, 3))).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);
    expect([300, 358, 520, 700, 1200].map(columnsFor)).toEqual([3, 3, 4, 5, 5]);
    expect(mapelOf({ domain: 'math', grade: 'sd1' })).toBe('matematika');
    expect(mapelOf({ domain: 'sains', grade: 'tk' })).toBe('sains');
    expect(mapelOf({ domain: 'english', grade: 'prek' })).toBe('english');
    expect(mapelOf({ domain: 'worksheet', grade: 'prek' })).toBe('bindo');
    expect(mapelOf({ domain: 'math', grade: 'sd34' })).toBe('olimpiade');
    expect(mapelOf({ domain: 'sains', grade: 'tkosn' })).toBe('olimpiade');
  });

  it('simpul = tombol berlabel keadaan; terkunci ditulis; panel awal = topik disarankan', () => {
    const { container } = renderMap();
    expect(container.querySelectorAll('ol.peta-path > li.peta-row')).toHaveLength(3);
    // Di HP panel menjadi baris sendiri di bawah baris simpul yang dipilih.
    expect(container.querySelector('ol.peta-path > li.peta-panel-row .peta-panel')).not.toBeNull();
    expect(screen.getByText(t('play.peta.summary', { done: 1, total: 3 }))).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: t('play.peta.nodeLabel', {
          topic: 'Membilang',
          state: t('play.peta.state.done'),
          stars: 3,
        }),
      }),
    ).toBeInTheDocument();
    const locked = container.querySelector('.peta-stop.is-terkunci')!;
    expect(locked.getAttribute('aria-label')).toContain(t('play.peta.state.locked'));
    expect(container.querySelector('.peta-stop.is-sekarang')?.textContent).toContain(
      t('play.peta.now'),
    );
    // Bab lomba ikut berwarna olimpiade.
    expect(container.querySelectorAll('[data-mapel="olimpiade"]')).toHaveLength(1);

    const panel = screen.getByRole('region', {
      name: t('play.peta.panel', { topic: 'Penjumlahan' }),
    });
    expect(within(panel).getByText('Menambah berarti jumlahnya bertambah.')).toBeInTheDocument();
    // Tanpa tips → tanpa "Tahukah kamu?" (tidak ada teks pengganti).
    expect(within(panel).queryByText(t('play.peta.fact'))).toBeNull();
    expect(
      within(panel).getByText(t('play.peta.levels', { passed: 1, total: 3 })),
    ).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: t('play.peta.start') })).toHaveAttribute(
      'href',
      '/play/topik/B',
    );
  });

  it('ketuk simpul → dibacakan, panel topik itu; Dengarkan memakai speak()', () => {
    renderMap();
    speak.mockClear();
    const node = screen.getByRole('button', { name: /^Membilang,/ });
    fireEvent.click(node);
    expect(speak).toHaveBeenCalledWith('Membilang');
    expect(node).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('region', {
      name: t('play.peta.panel', { topic: 'Membilang' }),
    });
    expect(within(panel).getByText(t('play.peta.fact'))).toBeInTheDocument();
    expect(within(panel).getByText('Tunjuk setiap benda satu kali saja.')).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: t('play.peta.listen') }));
    expect(speak).toHaveBeenLastCalledWith('Membilang artinya menghitung benda satu per satu.');
    expect(within(panel).getByRole('link', { name: t('play.peta.start') })).toHaveAttribute(
      'href',
      '/play/topik/A',
    );
  });

  it('tanda berikutnya & boleh lompat', () => {
    const n = (state: NodeInfo['state']): NodeInfo => ({
      state,
      passed: 0,
      total: 1,
      stars: 0,
      paidNext: false,
    });
    const order = [
      n('terbuka'),
      n('lulus'),
      n('sekarang'),
      n('terkunci'),
      n('terbuka'),
      n('terbuka'),
    ];
    markNodes(order);
    expect(order.map((x) => x.mark)).toEqual([
      'lompat',
      undefined,
      undefined,
      undefined,
      'berikutnya',
      'lompat',
    ]);
  });

  it('bab selesai dilipat; semua topik lulus → perayaan', () => {
    const all = Object.fromEntries(shelves.flatMap((s) => s.skills.map((k) => [k.id, 'passed'])));
    const { container } = render(
      <MemoryRouter>
        <PetaBelajar
          book={catalog}
          shelves={shelves}
          statuses={all}
          links={links}
          access={FREE_ACCESS}
          momoColor="biru"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(t('play.peta.allDone'))).toBeInTheDocument();
    expect(screen.getAllByText(t('play.peta.babDone'))).toHaveLength(2);
    expect(container.querySelector('.peta-path')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: t('play.peta.babShow') })[0]!);
    expect(container.querySelectorAll('.peta-stop.is-lulus')).toHaveLength(2);
  });
});
