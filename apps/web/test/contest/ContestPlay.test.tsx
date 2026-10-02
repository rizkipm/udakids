import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSession } from '../../src/auth/session';
import { t } from '../../src/i18n';
import { pickContest } from '../../src/play/contest/ContestEntryCard';
import { ContestHome, ContestPlay } from '../../src/play/contest/ContestPages';
import { nextUnanswered, toPlayable } from '../../src/play/contest/playable';
import { clockOffset, untilWords } from '../../src/play/contest/time';
import type { ContestInfo, ContestListItem, ContestSession } from '../../src/play/contest/types';

const CHILD = '00000000-0000-4000-8000-000000000001';
const ID = '11111111-1111-4111-8111-111111111111';
const token = () => `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.y`;
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

const contest = (over: Partial<ContestInfo> = {}): ContestInfo => ({
  id: ID,
  title: 'OSN MTK TK',
  description: '',
  domain: 'math',
  grade: 'tk',
  book: 'Matematika TK',
  categories: [],
  questionCount: 2,
  startsAt: iso(-60_000),
  endsAt: iso(3_600_000),
  durationMinutes: 30,
  winners: 3,
  phase: 'live',
  ...over,
});
const none = { status: 'none', answered: 0, total: 0, deadlineAt: null, remainingMs: 0 } as const;

const pick = (prompt: string) => ({
  prompt,
  stimulus: [],
  interaction: {
    type: 'pick-one' as const,
    choices: [
      { id: 'ka1', visual: { kind: 'text' as const, text: 'Tiga' } },
      { id: 'kb2', visual: { kind: 'text' as const, text: 'Lima' } },
    ],
  },
});
const session = (over: Partial<ContestSession> = {}): ContestSession => ({
  entryId: 'e1',
  now: iso(0),
  startedAt: iso(0),
  deadlineAt: iso(30 * 60_000),
  resultsAt: contest().endsAt,
  total: 2,
  answered: [],
  me: { status: 'active', answered: 0, total: 2, deadlineAt: iso(30 * 60_000), remainingMs: 1 },
  items: [pick('Soal satu'), pick('Soal dua')],
  ...over,
});

type Handler = (body?: unknown) => [number, unknown];
function mockFetch(routes: Record<string, Handler>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input).replace(/^https?:\/\/[^/]+/, '');
    const handler = routes[`${init?.method ?? 'GET'} ${url}`];
    const [status, body] = handler
      ? handler(init?.body ? JSON.parse(String(init.body)) : undefined)
      : [404, { message: 'not found' }];
    return new Response(JSON.stringify(body), { status });
  });
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/lomba" element={<ContestHome momoColor="ungu" />} />
        <Route path="/play/lomba/:id" element={<ContestPlay momoColor="ungu" />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
});
afterEach(() => vi.restoreAllMocks());

describe('ContestPlay', () => {
  it('aturan → mulai → jawab (tanpa info benar/keliru) → selesai otomatis → terima kasih', async () => {
    const answers: unknown[] = [];
    let submitted = 0;
    mockFetch({
      [`GET /contests/${ID}`]: () => [200, { now: iso(0), contest: contest(), me: none }],
      [`POST /contests/${ID}/start`]: () => [200, session()],
      [`POST /contests/${ID}/answer`]: (b) => {
        answers.push(b);
        return [200, { saved: true, answered: answers.length, total: 2 }];
      },
      [`POST /contests/${ID}/submit`]: () => {
        submitted++;
        return [200, { now: iso(0), resultsAt: contest().endsAt, me: { status: 'done' } }];
      },
      [`POST /contests/${ID}/event`]: () => [200, { ok: true }],
    });
    renderAt(`/play/lomba/${ID}`);
    expect(await screen.findByText(t('contest.rules.title'))).toBeInTheDocument();
    expect(screen.getByText(t('contest.rules.count', { n: 2 }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('contest.rules.start') }));

    expect(await screen.findByText('Soal satu')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/^\s*\d{2}:\d{2}/);
    fireEvent.click(screen.getByRole('button', { name: 'Lima' }));
    expect(await screen.findByText('Soal dua')).toBeInTheDocument();
    // Tidak ada tanda benar/keliru di perangkat.
    expect(document.querySelector('.is-right, .is-wrong')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tiga' }));

    expect(await screen.findByText(t('contest.thanks.title'))).toBeInTheDocument();
    expect(answers).toEqual([
      { index: 0, value: 'kb2' },
      { index: 1, value: 'ka1' },
    ]);
    expect(submitted).toBe(1);
    expect(document.body).toHaveTextContent(t('contest.thanks.effort', { n: 2 }));
  });

  it('melanjutkan dari soal pertama yang belum dijawab; waktu habis → kirim otomatis', async () => {
    let submitted = 0;
    mockFetch({
      [`GET /contests/${ID}`]: () => [
        200,
        { now: iso(0), contest: contest(), me: { ...none, status: 'active', answered: 1 } },
      ],
      [`POST /contests/${ID}/start`]: () => [200, session({ answered: [0] })],
      [`POST /contests/${ID}/answer`]: () => [403, { message: 'Waktu lomba sudah habis' }],
      [`POST /contests/${ID}/submit`]: () => {
        submitted++;
        return [200, {}];
      },
    });
    renderAt(`/play/lomba/${ID}`);
    expect(await screen.findByText('Soal dua')).toBeInTheDocument();
    expect(screen.getByText(t('contest.progress', { n: 2, total: 2 }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tiga' }));
    expect(await screen.findByText(t('contest.thanks.title'))).toBeInTheDocument();
    expect(submitted).toBe(1);
  });

  it('setelah lomba selesai: papan pemenang dengan baris "aku" disorot', async () => {
    const ended = contest({ startsAt: iso(-7_200_000), endsAt: iso(-1000), phase: 'ended' });
    const row = (position: number, nickname: string, me = false) => ({
      position,
      nickname,
      momoColor: 'biru',
      correct: 10 - position,
      total: 10,
      score: (10 - position) * 10,
      timeMs: 60_000 * position,
      me,
    });
    mockFetch({
      [`GET /contests/${ID}`]: () => [200, { now: iso(0), contest: ended, me: none }],
      [`GET /contests/${ID}/results`]: () => [
        200,
        {
          now: iso(0),
          contest: ended,
          participants: 4,
          winners: [row(1, 'Sari'), row(2, 'Alya', true), row(3, 'Raka'), row(4, 'Dimas')],
          me: row(2, 'Alya', true),
        },
      ],
    });
    renderAt(`/play/lomba/${ID}`);
    expect(await screen.findByText(t('contest.results.title'))).toBeInTheDocument();
    expect(screen.getByText(`Alya (${t('contest.you')})`)).toBeInTheDocument();
    expect(screen.getByText('Dimas')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/salah|gagal/i);
  });

  it('daftar lomba dikelompokkan: berlangsung / akan datang / selesai', async () => {
    const item = (over: Partial<ContestListItem>): ContestListItem => ({
      ...contest(),
      me: none,
      ...over,
    });
    mockFetch({
      'GET /contests': () => [
        200,
        {
          now: iso(0),
          contests: [
            item({ id: 'a', title: 'Lomba Pagi' }),
            item({
              id: 'b',
              title: 'Lomba Besok',
              startsAt: iso(7_200_000),
              endsAt: iso(9_000_000),
            }),
            item({
              id: 'c',
              title: 'Lomba Kemarin',
              startsAt: iso(-90_000_000),
              endsAt: iso(-86_000_000),
            }),
          ],
        },
      ],
    });
    renderAt('/play/lomba');
    expect(await screen.findByText('Lomba Pagi')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t('contest.section.live') })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: t('contest.section.upcoming') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t('contest.section.ended') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lomba Pagi/ })).toHaveTextContent(t('contest.join'));
    expect(screen.getByRole('link', { name: /Lomba Besok/ })).toHaveTextContent(
      t('contest.startsIn', { time: '2 jam' }),
    );
    expect(screen.getByRole('link', { name: /Lomba Kemarin/ })).toHaveTextContent(
      t('contest.winners'),
    );
  });
});

describe('helper lomba', () => {
  it('jam server, sisa waktu dalam kata, soal berikutnya', () => {
    expect(clockOffset('2026-10-10T03:00:05.000Z', Date.parse('2026-10-10T03:00:00.000Z'))).toBe(
      5000,
    );
    expect(untilWords(2 * 3600_000)).toBe('2 jam');
    expect(untilWords(2 * 3600_000 + 5 * 60_000)).toBe('2 jam 5 menit');
    expect(untilWords(3 * 86_400_000)).toBe('3 hari');
    expect(untilWords(45_000)).toBe('45 detik');
    expect(untilWords(90_000)).toBe('2 menit');
    expect(nextUnanswered(3, new Set([0]), -1)).toBe(1);
    expect(nextUnanswered(3, new Set([1]), 2)).toBe(0);
    expect(nextUnanswered(2, new Set([0, 1]), 0)).toBe(-1);
    const p = toPlayable(pick('x'), 3);
    expect(p.interaction).toMatchObject({ type: 'pick-one', answer: '' });
  });

  it('kartu beranda: berlangsung > akan datang ≤ 7 hari > hasil yang diikuti', () => {
    const now = Date.now();
    const mk = (id: string, s: number, e: number, me = none as ContestListItem['me']) => ({
      ...contest({
        id,
        startsAt: new Date(now + s).toISOString(),
        endsAt: new Date(now + e).toISOString(),
      }),
      me,
    });
    const far = mk('far', 10 * 86_400_000, 11 * 86_400_000);
    const soon = mk('soon', 3600_000, 7200_000);
    const live = mk('live', -1000, 3600_000);
    const done = mk('done', -7200_000, -3600_000, { ...none, status: 'done' });
    expect(pickContest([far, soon, live], now)?.c.id).toBe('live');
    expect(pickContest([far, soon], now)?.c.id).toBe('soon');
    expect(pickContest([far], now)).toBeNull();
    expect(pickContest([far, done], now)?.phase).toBe('ended');
  });
});

describe('ContestPlay sebelum dimulai', () => {
  it('menampilkan hitung mundur, tanpa tombol mulai', async () => {
    mockFetch({
      [`GET /contests/${ID}`]: () => [
        200,
        {
          now: iso(0),
          contest: contest({
            startsAt: iso(3 * 3600_000),
            endsAt: iso(5 * 3600_000),
            phase: 'upcoming',
          }),
          me: none,
        },
      ],
    });
    renderAt(`/play/lomba/${ID}`);
    expect(await screen.findByText(t('contest.upcoming.title'))).toBeInTheDocument();
    expect(screen.getByText('3 jam')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: t('contest.rules.start') })).toBeNull(),
    );
  });
});
