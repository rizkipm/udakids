import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { skillTemplateSchema } from '@little-coder/engine';
import { getSession, rememberedFamilyCode, setSession } from '../../src/auth/session';
import { t } from '../../src/i18n';
import { linkToken } from '../../src/play/links';
import { PlayApp } from '../../src/play/PlayApp';
import { clearProgressCache, loadProgress } from '../../src/play/practiceStore';

const CHILD = '00000000-0000-4000-8000-000000000001';
const token = (exp = Math.floor(Date.now() / 1000) + 3600) =>
  `x.${btoa(JSON.stringify({ exp }))}.y`;
const skill = skillTemplateSchema.parse({
  id: 'math.prek.b2.hitung-gambar-sampai-3',
  version: 1,
  domain: 'math',
  grade: 'prek',
  category: 'B',
  order: 2,
  title: 'Hitung gambar sampai 3',
  tier: 'basic',
  family: 'count',
  params: { range: [2, 2] },
});

function mockFetch(routes: Record<string, (body?: unknown) => [number, unknown]>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input).replace(/^https?:\/\/[^/]+/, '');
    const key = `${init?.method ?? 'GET'} ${url}`;
    const handler = routes[key];
    const [status, body] = handler
      ? handler(init?.body ? JSON.parse(String(init.body)) : undefined)
      : [404, { message: 'not found' }];
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

/** URL buram (D-027) persis seperti yang dibuat aplikasi. */
const lvl = async (id: string) => `/play/latihan/${await linkToken(CHILD, 'level', id)}`;
const top = async (key: string) => `/play/topik/${await linkToken(CHILD, 'topic', key)}`;

const renderPlay = (path = '/play') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/play/*" element={<PlayApp />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  clearProgressCache();
  setSession('child', null);
});
afterEach(() => vi.restoreAllMocks());

describe('masuk anak', () => {
  it('kode keluarga → pilih profil → sandi gambar salah lalu benar', async () => {
    let attempts = 0;
    mockFetch({
      'GET /auth/family/ABC234': () => [200, [{ id: CHILD, nickname: 'Alya', momoColor: 'ungu' }]],
      'POST /auth/child/login': (body) => {
        attempts++;
        const pin = (body as { pin: string[] }).pin.join(',');
        return pin === 'kucing,apel,bola'
          ? [200, { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } }]
          : [401, { message: 'Sandi gambarnya belum pas', attemptsLeft: 4 }];
      },
      'GET /auth/me': () => [200, { momoColor: 'ungu' }],
      'GET /catalog': () => [
        200,
        {
          catalogs: [
            {
              domain: 'math',
              grade: 'prek',
              title: 'Matematika Pra-TK',
              categories: [{ code: 'B', title: 'Membilang sampai 3' }],
            },
          ],
          skills: [skill],
        },
      ],
      'GET /practice/state': () => [200, { states: {} }],
    });
    renderPlay();
    fireEvent.change(screen.getByLabelText(t('play.login.code.title')), {
      target: { value: 'abc234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    fireEvent.click(await screen.findByRole('button', { name: /Alya/ }));

    const tap = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
    ['bola', 'apel', 'kucing'].forEach(tap);
    expect(await screen.findByText('Hmm, belum pas. Coba lagi, ya!')).toBeInTheDocument();
    ['kucing', 'apel', 'bola'].forEach(tap);
    expect(
      await screen.findByRole('link', { name: t('play.home.profile', { name: 'Alya' }) }),
    ).toBeInTheDocument();
    expect(attempts).toBe(2);
    expect(localStorage.getItem('lc.familyCode')).toBe('ABC234');
    // Beranda: satu tombol Main ke level pertama.
    expect(
      await screen.findByRole('link', { name: new RegExp(t('play.home.play')) }),
    ).toHaveAttribute('href', expect.stringContaining('/play/latihan/'));
  });

  it('kode tidak ditemukan → pesan ramah', async () => {
    mockFetch({});
    renderPlay();
    fireEvent.change(screen.getByLabelText(t('play.login.code.title')), {
      target: { value: 'ZZZZZZ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));
    expect(await screen.findByText('Kodenya belum ketemu. Coba cek lagi, ya.')).toBeInTheDocument();
  });
});

describe('ronde level (D-021)', () => {
  const skill2 = skillTemplateSchema.parse({
    ...skill,
    id: 'math.prek.b3.hitung-titik-sampai-3',
    order: 3,
    title: 'Hitung titik sampai 3',
  });
  const routes = (synced: unknown[]) => ({
    'GET /auth/me': () => [200, { momoColor: 'biru' }] as [number, unknown],
    'GET /catalog': () =>
      [
        200,
        {
          catalogs: [
            {
              domain: 'math',
              grade: 'prek',
              title: 'Matematika Pra-TK',
              categories: [
                {
                  code: 'B',
                  title: 'Membilang sampai 3',
                  intro: 'Membilang artinya menghitung benda satu per satu.',
                  tips: ['Tunjuk setiap benda satu kali saja.'],
                },
              ],
            },
          ],
          skills: [skill, skill2],
        },
      ] as [number, unknown],
    'GET /practice/state': () => [200, { states: {}, quizzes: {} }] as [number, unknown],
    'POST /practice/sync': (body?: unknown) => {
      synced.push(body);
      return [200, { states: {}, quizzes: {} }] as [number, unknown];
    },
  });

  it('Beranda ringkas: satu tombol Main ke level terbuka + kartu topik (tanpa daftar level)', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch(routes([]));
    const { container } = renderPlay('/play');
    const play = await screen.findByRole('link', { name: new RegExp(t('play.home.play')) });
    expect(play).toHaveAttribute('href', await lvl(skill.id));
    expect(container.querySelectorAll('.topic-card')).toHaveLength(1);
    expect(container.querySelector('.topic-card.is-next')?.textContent).toContain('0/2');
    expect(container.querySelector('.level-card')).toBeNull();
    expect(screen.getByRole('link', { name: t('play.home.done') })).toHaveAttribute(
      'href',
      '/play/selesai',
    );
  });

  it('halaman topik: materi + hal penting + contoh soal (tidak dinilai); Level 1 terbuka, Level 2 terkunci', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch(routes([]));
    const { container } = renderPlay(await top('math/prek/B'));
    expect(
      await screen.findByText('Membilang artinya menghitung benda satu per satu.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Tunjuk setiap benda satu kali saja.')).toBeInTheDocument();
    expect(container.querySelector('a.level-card.is-open.is-next')).not.toBeNull();
    expect(container.querySelectorAll('.level-card.is-locked')).toHaveLength(1);
    expect(screen.getByRole('link', { name: t('play.topic.start', { n: 1 }) })).toHaveAttribute(
      'href',
      await lvl(skill.id),
    );
    fireEvent.click(screen.getByRole('button', { name: t('play.topic.example') }));
    const right = [...container.querySelectorAll<HTMLButtonElement>('.example button.choice')].find(
      (b) => b.querySelector('[aria-label="angka 2"]'),
    )!;
    await act(async () => fireEvent.click(right));
    expect(container.querySelector('.example-feedback.is-right')).not.toBeNull();
    // Contoh tidak dicatat sebagai jawaban/ronde.
    expect(loadProgress(CHILD).outbox).toHaveLength(0);
    expect(loadProgress(CHILD).quizzes[skill.id]).toBeUndefined();
  });

  it('keluar di tengah ronde → konfirmasi dulu (Lanjut main / Berhenti)', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch(routes([]));
    const { container } = renderPlay(await lvl(skill.id));
    await waitFor(() => expect(container.querySelector('.item')).not.toBeNull());
    await act(async () =>
      fireEvent.click(container.querySelector<HTMLButtonElement>('button.choice')!),
    );
    fireEvent.click(screen.getByRole('button', { name: t('play.quiz.backTopic') }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('play.quiz.quitStay') }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t('play.quiz.backTopic') }));
    fireEvent.click(screen.getByRole('button', { name: t('play.quiz.quitLeave') }));
    expect(
      await screen.findByRole('heading', { name: t('play.topic.lesson') }),
    ).toBeInTheDocument();
  });

  it('salah → merah + jawaban benar hijau; 10 soal → skor; 7 benar = lulus & membuka level berikutnya', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    const synced: { quizzes?: unknown[] }[] = [];
    mockFetch(routes(synced as unknown[]));
    const { container } = renderPlay(await lvl(skill.id));
    await waitFor(() => expect(container.querySelector('.item')).not.toBeNull());
    const choices = () => [...container.querySelectorAll<HTMLButtonElement>('button.choice')];
    const right = () => choices().find((b) => b.querySelector('[aria-label="angka 2"]'))!;
    const wrong = () => choices().find((b) => !b.querySelector('[aria-label="angka 2"]'))!;
    // range [2,2] → jawaban selalu 2. Pola: 7 benar, 3 salah.
    const plan = [true, false, true, true, false, true, true, false, true, true];
    for (let i = 0; i < plan.length; i++) {
      await act(async () => fireEvent.click(plan[i] ? right() : wrong()));
      if (!plan[i]) {
        expect(container.querySelector('.choice.is-wrong')).not.toBeNull();
        expect(container.querySelector('.choice.is-answer')).not.toBeNull();
        expect(container.querySelector('.feedback.is-wrong')).not.toBeNull();
      } else {
        expect(container.querySelector('.feedback.is-right')).not.toBeNull();
      }
      expect(
        screen.getByText(`Benar ${plan.slice(0, i + 1).filter(Boolean).length}`),
      ).toBeInTheDocument();
      await act(async () =>
        fireEvent.click(
          screen.getByRole('button', { name: i === plan.length - 1 ? /Lihat skor/ : /Lanjut/ }),
        ),
      );
    }
    expect(screen.getByText('Skor 70')).toBeInTheDocument();
    expect(screen.getByText('7 dari 10 soal benar')).toBeInTheDocument();
    expect(screen.getByText('Lulus! Level berikutnya terbuka.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('play.quiz.nextLevelN', { n: 2 }) })).toHaveAttribute(
      'href',
      await lvl(skill2.id),
    );
    expect(loadProgress(CHILD).quizzes[skill.id]).toMatchObject({
      best: 70,
      passed: true,
      attempts: 1,
    });
    await waitFor(() => expect(synced.some((b) => (b.quizzes ?? []).length === 1)).toBe(true));
  });

  it('6 benar → skor 60 → gagal, tombol coba lagi, level berikutnya tetap terkunci', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch(routes([]));
    const { container } = renderPlay(await lvl(skill.id));
    await waitFor(() => expect(container.querySelector('.item')).not.toBeNull());
    const choices = () => [...container.querySelectorAll<HTMLButtonElement>('button.choice')];
    for (let i = 0; i < 10; i++) {
      const pick =
        i < 6
          ? choices().find((b) => b.querySelector('[aria-label="angka 2"]'))
          : choices().find((b) => !b.querySelector('[aria-label="angka 2"]'));
      await act(async () => fireEvent.click(pick!));
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: i === 9 ? /Lihat skor/ : /Lanjut/ })),
      );
    }
    expect(screen.getByText('Skor 60')).toBeInTheDocument();
    expect(screen.getByText(/^Gagal\. Butuh minimal 7 jawaban benar/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Lanjut ke Level/ })).toBeNull();
    expect(screen.getByRole('link', { name: t('play.quiz.readLesson') })).toHaveAttribute(
      'href',
      await top('math/prek/B'),
    );
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
    expect(loadProgress(CHILD).quizzes[skill.id]).toMatchObject({ best: 60, passed: false });
  });

  it('URL buram: tidak memuat id skill, beda tiap anak; id mentah di URL tidak dikenali', async () => {
    const mine = await lvl(skill.id);
    expect(mine).toMatch(/^\/play\/latihan\/[A-Za-z0-9_-]{16}$/);
    expect(mine).not.toContain('math');
    const other = await linkToken('00000000-0000-4000-8000-000000000002', 'level', skill.id);
    expect(mine).not.toContain(other);
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch(routes([]));
    renderPlay(`/play/latihan/${encodeURIComponent(skill.id)}`);
    expect(await screen.findByText(t('play.quiz.notFound'))).toBeInTheDocument();
  });

  it('membuka level terkunci lewat URL → pesan terkunci', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch(routes([]));
    renderPlay(await lvl(skill2.id));
    expect(await screen.findByText(/Level ini masih terkunci/)).toBeInTheDocument();
  });
});

describe('profil anak (D-022)', () => {
  it('kartu profil: total skor, level lulus, peringkat kelas; halaman riwayat', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch({
      'GET /auth/me': () => [200, { momoColor: 'biru' }],
      'GET /catalog': () => [
        200,
        {
          catalogs: [
            {
              domain: 'math',
              grade: 'prek',
              title: 'Matematika Pra-TK',
              categories: [{ code: 'B', title: 'Membilang sampai 3' }],
            },
          ],
          skills: [skill],
        },
      ],
      'GET /practice/state': () => [
        200,
        {
          states: {},
          quizzes: { [skill.id]: { best: 80, last: 80, passed: true, attempts: 2, ts: 1 } },
        },
      ],
      'GET /practice/profile': () => [
        200,
        {
          nickname: 'Alya',
          momoColor: 'biru',
          totalPoints: 80,
          passedLevels: 1,
          played: 2,
          totalTimeMs: 200_000,
          rank: { position: 3, of: 12 },
          highest: { book: 'Matematika Pra-TK', level: 2 },
          className: 'Workshop Minggu',
          history: [
            {
              id: 'h1',
              skillId: skill.id,
              title: 'Hitung gambar sampai 3',
              domain: 'math',
              grade: 'prek',
              category: 'B',
              order: 2,
              score: 80,
              correct: 8,
              total: 10,
              passed: true,
              durationMs: 95_000,
              ts: '2026-09-30T08:00:00Z',
            },
            {
              id: 'h2',
              skillId: skill.id,
              title: 'Hitung gambar sampai 3',
              domain: 'math',
              grade: 'prek',
              category: 'B',
              order: 2,
              score: 50,
              correct: 5,
              total: 10,
              passed: false,
              durationMs: null,
              ts: '2026-09-29T08:00:00Z',
            },
          ],
        },
      ],
    });
    const { container } = renderPlay('/play');
    fireEvent.click(
      await screen.findByRole('link', { name: t('play.home.profile', { name: 'Alya' }) }),
    );
    expect(await screen.findByText('#3')).toBeInTheDocument();
    expect(screen.getByText('Peringkat 3 dari 12')).toBeInTheDocument();
    expect(container.querySelector('.profile-grid')?.textContent).toContain('80');
    expect(container.querySelector('.profile-grid')?.textContent).toContain('03:20');
    expect(await screen.findByText('Kelas: Workshop Minggu')).toBeInTheDocument();
    expect(screen.getByText('Matematika Pra-TK')).toBeInTheDocument();
    expect(container.querySelector('.history-time')?.textContent).toBe('01:35');
    expect(container.querySelectorAll('.history-row')).toHaveLength(2);
    expect(container.querySelector('.history-row.is-failed .history-score')?.textContent).toBe(
      '50',
    );
  });

  it('belum pernah main: peringkat menunggu satu level', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch({
      'GET /auth/me': () => [200, { momoColor: 'biru' }],
      'GET /catalog': () => [200, { catalogs: [], skills: [] }],
      'GET /practice/state': () => [200, { states: {}, quizzes: {} }],
      'GET /practice/profile': () => [
        200,
        {
          nickname: 'Alya',
          momoColor: 'biru',
          totalPoints: 0,
          passedLevels: 0,
          played: 0,
          totalTimeMs: 0,
          rank: null,
          highest: null,
          className: null,
          history: [],
        },
      ],
    });
    renderPlay('/play/profil');
    expect(await screen.findByText(t('play.profile.rankNone'))).toBeInTheDocument();
    expect(screen.getByText(t('play.profile.noClass'))).toBeInTheDocument();
  });
});

describe('gabung kelas sendiri (D-025)', () => {
  it('kode kelas → nama → warna → 3 gambar 2× → masuk & kode diingat', async () => {
    let joinBody: unknown;
    mockFetch({
      'GET /auth/class/KLS234': () => [200, { code: 'KLS234', eventName: 'Kelas Pelangi' }],
      'POST /auth/class/join': (body) => {
        joinBody = body;
        return [
          201,
          { token: token(), user: { id: CHILD, role: 'child', name: 'Dewi' }, classCode: 'KLS234' },
        ];
      },
      'GET /auth/me': () => [200, { momoColor: 'hijau' }],
      'GET /catalog': () => [200, { catalogs: [], skills: [] }],
      'GET /practice/state': () => [200, { states: {}, quizzes: {} }],
    });
    renderPlay('/play/gabung?kode=KLS234');
    fireEvent.click(screen.getByRole('button', { name: t('play.login.code.submit') }));
    fireEvent.change(await screen.findByLabelText(t('play.join.name.title')), {
      target: { value: 'Dewi' },
    });
    expect(screen.getByText('Kelas Pelangi')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('play.login.code.submit') }));
    fireEvent.click(await screen.findByRole('radio', { name: /hijau/ }));
    fireEvent.click(screen.getByRole('button', { name: t('play.login.code.submit') }));
    for (const p of ['ikan', 'kue', 'bola'])
      fireEvent.click(await screen.findByRole('button', { name: p }));
    await screen.findByText(t('play.join.confirm.say'));
    for (const p of ['ikan', 'kue', 'bola'])
      fireEvent.click(screen.getByRole('button', { name: p }));
    await waitFor(() => expect(getSession('child')?.user.name).toBe('Dewi'));
    expect(joinBody).toEqual({
      classCode: 'KLS234',
      nickname: 'Dewi',
      momoColor: 'hijau',
      pin: ['ikan', 'kue', 'bola'],
    });
    expect(rememberedFamilyCode()).toBe('KLS234');
  });
});

describe('papan peringkat global (D-024)', () => {
  it('podium, baris saya, level tertinggi, dan waktu', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    const row = (position: number, nickname: string, me = false) => ({
      position,
      nickname,
      momoColor: 'biru',
      points: 1000 - position * 10,
      passed: 10 - position,
      timeMs: 65_000 * position,
      highest: { book: 'Math Grade 1-2', level: 7 },
      me,
    });
    mockFetch({
      'GET /auth/me': () => [200, { momoColor: 'biru' }],
      'GET /catalog': () => [200, { catalogs: [], skills: [] }],
      'GET /practice/state': () => [200, { states: {}, quizzes: {} }],
      'GET /practice/leaderboard': () => [
        200,
        {
          total: 60,
          rows: [row(1, 'Raka'), row(2, 'Sari'), row(3, 'Budi'), row(4, 'Nina')],
          me: row(57, 'Alya', true),
        },
      ],
    });
    const { container } = renderPlay('/play/peringkat');
    expect(
      await screen.findByText(t('play.board.mySay', { position: 57, of: 60, score: 430 })),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.podium-spot')).toHaveLength(3);
    expect(container.querySelector('.podium-spot.place-1 .podium-name')?.textContent).toBe('Raka');
    const mine = container.querySelector('.board-row.is-me');
    expect(mine?.textContent).toContain('Alya');
    expect(mine?.textContent).toContain('57');
    expect(mine?.textContent).toContain('1:01:45');
    expect(container.querySelectorAll('.board-row:not(.board-header)')).toHaveLength(5);
    expect(screen.getAllByText('Math Grade 1-2').length).toBeGreaterThan(0);
  });
});

describe('selesai main (D-026)', () => {
  it('ringkasan hari ini lalu pilihan jelas: Main lagi / Keluar', async () => {
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch({
      'GET /auth/me': () => [200, { momoColor: 'biru' }],
      'GET /catalog': () => [200, { catalogs: [], skills: [] }],
      'GET /practice/state': () => [200, { states: {}, quizzes: {} }],
      'GET /auth/family/ABC234': () => [200, []],
    });
    renderPlay('/play/selesai');
    expect(await screen.findByText(t('play.bye.sayNone', { name: 'Alya' }))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('play.bye.again') })).toHaveAttribute(
      'href',
      '/play',
    );
    fireEvent.click(screen.getByRole('button', { name: t('play.bye.exit') }));
    await waitFor(() => expect(getSession('child')).toBeNull());
  });
});

describe('coba lagi = soal baru (D-028)', () => {
  it('ronde kedua tidak memakai soal ronde pertama bila bank soal cukup', async () => {
    const bank = skillTemplateSchema.parse({
      id: 'sains.sd12.a1.bank-uji',
      version: 1,
      domain: 'sains',
      grade: 'sd12',
      category: 'A',
      order: 1,
      title: 'Makhluk hidup — Level 1 — Bank uji',
      tier: 'intermediate',
      family: 'manual',
      params: {
        items: Array.from({ length: 24 }, (_, k) => ({
          prompt: `Pertanyaan nomor ${k + 1}`,
          choices: [
            { visual: { kind: 'text', text: 'Ya' } },
            { visual: { kind: 'text', text: 'Tidak' } },
          ],
          answer: 0,
        })),
      },
    });
    setSession('child', { token: token(), user: { id: CHILD, role: 'child', name: 'Alya' } });
    mockFetch({
      'GET /auth/me': () => [200, { momoColor: 'biru' }],
      'GET /catalog': () => [
        200,
        {
          catalogs: [
            {
              domain: 'sains',
              grade: 'sd12',
              title: 'Sains Grade 1-2',
              categories: [{ code: 'A', title: 'Makhluk hidup' }],
            },
          ],
          skills: [bank],
        },
      ],
      'GET /practice/state': () => [200, { states: {}, quizzes: {} }],
      'POST /practice/sync': () => [200, { states: {}, quizzes: {} }],
    });
    const prompts: string[][] = [[], []];
    for (const r of [0, 1]) {
      const { container, unmount } = renderPlay(await lvl(bank.id));
      for (let i = 0; i < 10; i++) {
        await waitFor(() => expect(container.querySelector('.item-prompt p')).not.toBeNull());
        prompts[r]!.push(container.querySelector('.item-prompt p')!.textContent!);
        await act(async () =>
          fireEvent.click(container.querySelector<HTMLButtonElement>('button.choice')!),
        );
        await act(async () =>
          fireEvent.click(screen.getByRole('button', { name: i === 9 ? /Lihat skor/ : /Lanjut/ })),
        );
      }
      unmount();
    }
    expect(new Set(prompts[0]).size).toBe(10);
    expect(new Set(prompts[1]).size).toBe(10);
    expect(prompts[1]!.filter((p) => prompts[0]!.includes(p))).toEqual([]);
    expect(loadProgress(CHILD).recentItems?.[bank.id]).toHaveLength(20);
  });
});
