import { useEffect, useMemo, useState } from 'react';
import { GRADES, formatClock, type Color, type MomoLook } from '@little-coder/engine';
import { api } from '../api/client';
import { Momo } from '../components/Momo';
import { t, type MessageKey } from '../i18n';
import { formatStamp } from '../ui/ui';

/** Daftar mock test publik (`/leaderboard/public/mocks`, D-074) — tanpa data anak. */
type MockInfo = {
  skillId: string;
  domain: string;
  grade: string;
  book: string;
  title: string;
  order: number;
  competition: string;
  questions: number;
  maxPoints: number;
  passPoints: number | null;
  participants: number;
};
/** 10 besar satu mock test (`/leaderboard/public/mock/:id`): hanya nama panggilan + tampilan Momo. */
type MockTop = {
  skillId: string;
  competition: string;
  questions: number;
  maxPoints: number;
  passPoints: number | null;
  updatedAt: string;
  participants: number;
  passed: number | null;
  top: {
    position: number;
    nickname: string;
    momoColor: string;
    momoLook?: MomoLook | null;
    points: number;
    correct: number;
    total: number;
    timeMs: number;
    passed: boolean | null;
  }[];
};

const POLL_MS = 15_000;
const num = (n: number) => n.toLocaleString('id-ID');
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
/** Label dari kamus bila ada (jenjang / mata pelajaran), selain itu teks aslinya. */
const label = (key: string, fallback: string) => {
  const v = t(key as MessageKey);
  return v === key ? fallback : v;
};

/**
 * Urutan & label tab lomba (D-076): KMSI lebih dulu, lalu KMSI Final Jatim (D-080), EMC, ESC, EEC; lainnya
 * sesudahnya.
 */
const COMPS = ['KMSI', 'KMSI Final', 'EMC', 'ESC', 'EEC'] as const;
const compRank = (c: string) => {
  const i = COMPS.indexOf(c as (typeof COMPS)[number]);
  return i < 0 ? COMPS.length : i;
};
const compLabel = (c: string) =>
  c === 'KMSI'
    ? t('site.mock.kmsi')
    : c === 'KMSI Final'
      ? t('site.mock.kmsiFinal')
      : c === 'EMC'
        ? t('site.mock.emc')
        : c === 'ESC'
          ? t('site.mock.esc')
          : c === 'EEC'
            ? t('site.mock.eec')
            : t('site.mock.olympiad');

/**
 * Bagian landing (D-074): peringkat Mock Test olimpiade per lomba (KMSI, olimpiade gaya EMC), jenjang, mata
 * pelajaran, dan mock test 1–3. Urutan gaya lomba: percobaan terbaik, poin tertinggi → waktu tercepat; KMSI
 * menampilkan lolos KKM. Tidak tampil bila belum ada mock test atau server tidak menjawab.
 */
export function MockTopTenSection() {
  const [list, setList] = useState<MockInfo[]>();
  const [comp, setComp] = useState<string>();
  const [grade, setGrade] = useState<string>();
  const [domain, setDomain] = useState<string>();
  const [mockId, setMockId] = useState<string>();
  const [board, setBoard] = useState<MockTop>();

  useEffect(() => {
    let alive = true;
    api<{ mocks: MockInfo[] }>('/leaderboard/public/mocks')
      .then((d) => alive && Array.isArray(d?.mocks) && setList(d.mocks))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, []);

  // Pilihan bertingkat: lomba → jenjang → mata pelajaran → mock test (KMSI didahulukan).
  const comps = useMemo(
    () => uniq((list ?? []).map((m) => m.competition)).sort((a, b) => compRank(a) - compRank(b)),
    [list],
  );
  const c = comp && comps.includes(comp) ? comp : comps[0];
  const inComp = (list ?? []).filter((m) => m.competition === c);
  // Urut jenjang: TK → Kelas 1–2 → … → SMP (bukan urutan buku per mata pelajaran).
  const rank = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);
  const grades = uniq(inComp.map((m) => m.grade)).sort((a, b) => rank(a) - rank(b));
  const g = grade && grades.includes(grade) ? grade : grades[0];
  const inGrade = inComp.filter((m) => m.grade === g);
  const domains = uniq(inGrade.map((m) => m.domain));
  const d = domain && domains.includes(domain) ? domain : domains[0];
  const mocks = inGrade.filter((m) => m.domain === d).sort((a, b) => a.order - b.order);
  const current = mocks.find((m) => m.skillId === mockId) ?? mocks[0];
  const currentId = current?.skillId;

  useEffect(() => {
    if (!currentId) return;
    let alive = true;
    setBoard(undefined);
    const load = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      api<MockTop>(`/leaderboard/public/mock/${currentId}`)
        .then((x) => alive && Array.isArray(x?.top) && setBoard(x))
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [currentId]);

  if (!list || list.length === 0 || !current) return null;
  const top = board?.skillId === current.skillId ? board.top : undefined;
  const podium = top?.slice(0, 3) ?? [];
  const rest = top?.slice(3) ?? [];
  const metric = (r: MockTop['top'][number]) =>
    t('site.mock.points', { n: num(r.points), max: num(current.maxPoints) });
  const detail = (r: MockTop['top'][number]) =>
    `${t('site.mock.correct', { n: r.correct, total: r.total })} · ${formatClock(r.timeMs)}`;
  const kkm = (r: MockTop['top'][number]) =>
    r.passed ? <span className="mt-kkm">{t('site.mock.passBadge')}</span> : null;

  const chips = <T extends string>(
    items: T[],
    on: T | undefined,
    set: (v: T) => void,
    text: (v: T) => string,
    aria: string,
    always = false,
  ) =>
    (always ? items.length > 0 : items.length > 1) && (
      <div className="topten-periods" role="group" aria-label={aria}>
        {items.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={v === on}
            className={`topten-period${v === on ? ' is-on' : ''}`}
            onClick={() => set(v)}
          >
            {text(v)}
          </button>
        ))}
      </div>
    );

  return (
    <section
      id="peringkat-mock"
      className="site-section topten mocktop"
      aria-labelledby="mocktop-title"
    >
      <h2 id="mocktop-title">{t('site.mock.title')}</h2>
      <p className="section-lead">{t('site.mock.sub')}</p>
      <div className="topten-card">
        <div className="topten-tabs" role="tablist" aria-label={t('site.mock.competition')}>
          {comps.map((x) => (
            <button
              key={x}
              type="button"
              role="tab"
              aria-selected={x === c}
              className={`topten-tab${x === c ? ' is-on' : ''}`}
              onClick={() => {
                setComp(x);
                setMockId(undefined);
              }}
            >
              {compLabel(x)}
            </button>
          ))}
        </div>
        {chips(
          grades,
          g,
          (v) => (setGrade(v), setMockId(undefined)),
          (v) => label(`play.grade.${v}`, v),
          t('site.mock.grade'),
          true,
        )}
        {chips(
          domains,
          d,
          (v) => (setDomain(v), setMockId(undefined)),
          (v) => label(`play.domain.${v}`, v),
          t('site.mock.subject'),
        )}
        {chips(
          mocks.map((m) => m.skillId),
          current.skillId,
          setMockId,
          (id) => t('site.mock.nth', { n: mocks.find((m) => m.skillId === id)?.order ?? 1 }),
          t('site.mock.which'),
        )}

        <div className="topten-head">
          <span className="topten-live">
            <span className="topten-dot" aria-hidden />
            {t('site.top.live')}
          </span>
          {board?.skillId === current.skillId && (
            <small>
              {t('site.top.updated', { time: formatStamp(board.updatedAt) })} ·{' '}
              {t('site.top.participants', { n: num(board.participants) })}
              {board.passed !== null && board.passPoints !== null && (
                <>
                  {' '}
                  · {t('site.mock.passedCount', { n: num(board.passed), kkm: board.passPoints })}
                </>
              )}
            </small>
          )}
        </div>
        <p className="mt-rule">
          {current.passPoints !== null
            ? t('site.mock.ruleKkm', {
                q: current.questions,
                max: current.maxPoints,
                kkm: current.passPoints,
              })
            : current.competition.startsWith('KMSI')
              ? // KMSI Final (D-080): tanpa KKM, juara dari poin lalu waktu.
                t('site.mock.ruleKmsi', { q: current.questions, max: current.maxPoints })
              : t('site.mock.ruleEmc', { q: current.questions, max: current.maxPoints })}
        </p>

        {!top ? (
          <p className="topten-empty">{t('site.top.loading')}</p>
        ) : top.length === 0 ? (
          <p className="topten-empty">{t('site.mock.empty')}</p>
        ) : (
          <>
            <ol className="topten-podium" aria-label={t('site.top.podium')}>
              {[podium[1], podium[0], podium[2]].map((r, i) =>
                !r ? (
                  <li key={`kosong-${i}`} className={`tp-spot slot-${i} is-empty`} aria-hidden />
                ) : (
                  <li
                    key={`${r.position}-${r.nickname}`}
                    className={`tp-spot slot-${i} place-${r.position}`}
                  >
                    {r.position === 1 && (
                      <span className="tp-crown" aria-hidden>
                        ★
                      </span>
                    )}
                    <Momo
                      color={r.momoColor as Color}
                      look={r.momoLook ?? null}
                      mood="proud"
                      size={i === 1 ? 92 : 72}
                    />
                    <strong className="tp-name">{r.nickname}</strong>
                    <span className="tp-metric">{metric(r)}</span>
                    <small className="tp-detail">{detail(r)}</small>
                    {kkm(r)}
                    <span className="tp-block">{r.position}</span>
                  </li>
                ),
              )}
            </ol>
            {rest.length > 0 && (
              <ol className="topten-list" start={4}>
                {rest.map((r) => (
                  <li key={`${r.position}-${r.nickname}`}>
                    <span className="topten-pos">{r.position}</span>
                    <Momo
                      color={r.momoColor as Color}
                      look={r.momoLook ?? null}
                      mood="happy"
                      size={36}
                    />
                    <span className="tl-name">
                      <strong>{r.nickname}</strong>
                      <small>
                        {detail(r)} {kkm(r)}
                      </small>
                    </span>
                    <span className="tl-metric">{metric(r)}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        <p className="topten-note">{t('site.mock.note')}</p>
      </div>
    </section>
  );
}
