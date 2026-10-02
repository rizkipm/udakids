import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogRow } from '../../src/api/types';
import { setSession } from '../../src/auth/session';
import {
  ContestsPage,
  toContestInput,
  type AdminContest,
  type AdminEntry,
} from '../../src/admin/contests/ContestsPage';
import { t } from '../../src/i18n';
import { mockApi, renderAdmin } from '../admin/helpers';

const token = () => `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.y`;
const catalogs = [
  {
    domain: 'math',
    grade: 'tk',
    title: 'Matematika TK',
    categories: [
      { code: 'A', title: 'Membilang' },
      { code: 'B', title: 'Bentuk' },
    ],
    updatedAt: '',
  },
] as unknown as CatalogRow[];

const contest: AdminContest = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'OSN MTK TK',
  description: '',
  domain: 'math',
  grade: 'tk',
  book: 'Matematika TK',
  categories: [],
  questionCount: 20,
  startsAt: '2026-10-10T03:00:00.000Z',
  endsAt: '2026-10-10T05:00:00.000Z',
  durationMinutes: 60,
  winners: 3,
  phase: 'ended',
  published: true,
  participants: 2,
  submitted: 2,
  disqualified: 0,
};

beforeEach(() => {
  setSession('staff', { token: token(), user: { id: 'a', role: 'admin', name: 'Admin' } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ContestsPage (admin)', () => {
  it('membuat lomba: buku + topik, waktu lokal dikirim sebagai ISO', async () => {
    let posted: Record<string, unknown> | undefined;
    mockApi({
      'GET /admin/contests': { now: '', contests: [] },
      '/admin/catalogs': catalogs,
      'POST /admin/contests': (_url: string, init?: RequestInit) => {
        posted = JSON.parse(String(init?.body));
        return { ...contest, phase: 'upcoming' };
      },
    });
    renderAdmin(<ContestsPage />, '/admin/lomba?baru=1');
    fireEvent.change(await screen.findByLabelText(t('contest.admin.form.title')), {
      target: { value: 'OSN MTK TK se-Indonesia' },
    });
    await screen.findByRole('option', { name: 'Matematika TK' });
    fireEvent.change(screen.getByLabelText(t('contest.admin.form.book')), {
      target: { value: 'math/tk' },
    });
    fireEvent.click(await screen.findByLabelText('B. Bentuk'));
    fireEvent.change(screen.getByLabelText(t('contest.admin.form.startsAt')), {
      target: { value: '2026-10-10T10:00' },
    });
    fireEvent.change(screen.getByLabelText(t('contest.admin.form.endsAt')), {
      target: { value: '2026-10-10T12:00' },
    });
    fireEvent.click(screen.getByLabelText(t('contest.admin.form.published')));
    fireEvent.click(screen.getByRole('button', { name: t('contest.admin.form.save') }));
    await waitFor(() => expect(posted).toBeDefined());
    expect(posted).toMatchObject({
      title: 'OSN MTK TK se-Indonesia',
      domain: 'math',
      grade: 'tk',
      categories: ['B'],
      questionCount: 20,
      durationMinutes: 60,
      winners: 10,
      published: true,
      startsAt: new Date('2026-10-10T10:00').toISOString(),
      endsAt: new Date('2026-10-10T12:00').toISOString(),
    });
  });

  it('isian tidak valid tidak dikirim', () => {
    const r = toContestInput({
      title: 'Lomba',
      description: '',
      book: 'math/tk',
      categories: [],
      questionCount: '20',
      startsAt: '2026-10-10T12:00',
      endsAt: '2026-10-10T10:00',
      durationMinutes: '60',
      winners: '3',
      published: false,
    });
    expect(r.success).toBe(false);
  });

  it('detail: peringkat, kejanggalan, diskualifikasi dengan alasan', async () => {
    const entry = (over: Partial<AdminEntry>): AdminEntry => ({
      id: 'e1',
      childId: 'c1',
      nickname: 'Alya',
      momoColor: 'ungu',
      className: null,
      total: 20,
      answered: 20,
      correct: 18,
      startedAt: '2026-10-10T03:01:00.000Z',
      submittedAt: '2026-10-10T03:20:00.000Z',
      status: 'done',
      flags: {},
      disqualified: false,
      position: 1,
      score: 90,
      timeMs: 19 * 60_000,
      ...over,
    });
    let dqBody: unknown;
    mockApi({
      [`GET /admin/contests/${contest.id}`]: {
        now: '',
        contest,
        entries: [
          entry({}),
          entry({
            id: 'e2',
            childId: 'c2',
            nickname: 'Raka',
            position: 2,
            flags: { fast: 7, hidden: 2 },
          }),
        ],
      },
      [`POST /admin/contests/${contest.id}/entries/e2/disqualify`]: (
        _u: string,
        init?: RequestInit,
      ) => {
        dqBody = JSON.parse(String(init?.body));
        return { id: 'e2', disqualified: true };
      },
    });
    renderAdmin(<ContestsPage />, `/admin/lomba?lomba=${contest.id}`);
    expect(await screen.findByText(t('contest.admin.detail.rankFinal'))).toBeInTheDocument();
    expect(screen.getByText(/7× terlalu cepat/)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: t('contest.admin.detail.dq') });
    fireEvent.click(buttons[1]!);
    const confirm = screen.getByRole('button', { name: t('contest.admin.detail.dqConfirm') });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(t('contest.admin.detail.dqReason')), {
      target: { value: 'jawaban terlalu cepat' },
    });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(dqBody).toEqual({ disqualified: true, reason: 'jawaban terlalu cepat' }),
    );
  });
});
