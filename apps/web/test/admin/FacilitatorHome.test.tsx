import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FacilitatorInsights } from '../../src/admin/insightsTypes';
import { FacilitatorApp } from '../../src/facilitator/FacilitatorApp';
import { t } from '../../src/i18n';
import { mockApi } from './helpers';

const data: FacilitatorInsights = {
  totals: { classes: 1, students: 12, active7: 9, rounds7: 40, passRate7: 75 },
  classes: [
    {
      id: 'k1',
      code: 'KLS234',
      eventName: 'Kelas Pelangi',
      frozen: false,
      closed: false,
      students: 12,
      active7: 9,
      rounds7: 40,
      avgScore7: 78,
      passRate7: 75,
    },
  ],
  series: Array.from({ length: 14 }, (_, i) => ({
    date: `2026-09-${String(18 + (i % 13)).padStart(2, '0')}${i}`.slice(0, 10),
    rounds: i,
  })),
  needsHelp: [
    {
      childId: 'c1',
      nickname: 'Dewi',
      momoColor: 'biru',
      className: 'Kelas Pelangi',
      level: 'Penjumlahan sampai 10',
      best: 40,
      attempts: 4,
    },
  ],
  recent: [
    {
      nickname: 'Raka',
      momoColor: 'hijau',
      className: 'Kelas Pelangi',
      level: 'Membilang',
      score: 90,
      ts: '2026-10-01T07:00:00Z',
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('ringkasan guru (D-039)', () => {
  it('angka kelas, siswa yang perlu dibantu, aktivitas, dan menu guru', async () => {
    mockApi({ '/facilitator/insights': data });
    render(
      <MemoryRouter initialEntries={['/fasilitator']}>
        <Routes>
          <Route path="/fasilitator/*" element={<FacilitatorApp />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: t('admin.fac.title') })).toBeInTheDocument();
    expect(
      screen.getByText('Kelas Pelangi', { selector: '.ins-class-head strong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        t('admin.fac.helpRow', { level: 'Penjumlahan sampai 10', best: 40, attempts: 4 }),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('admin.fac.open') })).toHaveAttribute(
      'href',
      '/fasilitator/kelas/k1',
    );
    expect(screen.getByRole('link', { name: t('admin.fac.classes') })).toHaveAttribute(
      'href',
      '/fasilitator/kelas',
    );
  });
});
