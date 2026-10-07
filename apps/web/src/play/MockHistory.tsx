import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  formatClock,
  generateItem,
  mockConfigOf,
  scoreMock,
  type Color,
  type Item,
  type MockReviewEntry,
  type SkillTemplate,
} from '@little-coder/engine';
import { useSession } from '../auth/session';
import { useFetch } from '../auth/useApi';
import { t } from '../i18n';
import { formatStamp } from '../ui/ui';
import { useCatalog } from './catalog';
import { MockReportView } from './MockTest';
import { useProgress } from './practiceStore';

type Attempt = {
  id: string;
  ts: string;
  correct: number;
  total: number;
  score: number;
  points: number | null;
  durationMs: number | null;
  review: MockReviewEntry[] | null;
  pending?: boolean;
};

/**
 * "Laporan mock test-ku" (D-072): riwayat percobaan Mock Test milik anak yang login SAJA, masing-masing bisa dibuka
 * untuk melihat soal yang benar, belum tepat, dan dilewati (dengan jawaban & penjelasan). Soal dibuat ulang dari
 * level sumber + seed; percobaan yang belum tersinkron diambil dari perangkat.
 */
export function MockHistory({ mock, momoColor }: { mock: SkillTemplate; momoColor: Color }) {
  const session = useSession('child')!;
  const progress = useProgress(session.user.id);
  const { data } = useCatalog();
  const server = useFetch<Attempt[]>('child', `/practice/mock/${mock.id}/attempts`);
  const [open, setOpen] = useState<string>();
  const top = useRef<HTMLElement>(null);
  const toggled = useRef(false);
  // Laporan dibuka/ditutup → bawa layar ke awal bagian ini (penting di HP); tidak saat halaman baru dimuat.
  useEffect(() => {
    if (!toggled.current) return;
    top.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [open]);
  const toggle = (id: string | undefined) => {
    toggled.current = true;
    setOpen(id);
  };
  const config = useMemo(() => mockConfigOf(mock), [mock]);

  const attempts = useMemo(() => {
    const fromServer = server.data ?? [];
    const known = new Set(fromServer.map((a) => a.id));
    const pending: Attempt[] = progress.quizOutbox
      .filter((q) => q.skillId === mock.id && !known.has(q.id))
      .map((q) => ({
        id: q.id,
        ts: new Date(q.ts).toISOString(),
        correct: q.correct,
        total: q.total,
        score: 0,
        points: q.points ?? null,
        durationMs: q.durationMs ?? null,
        review: q.review ?? null,
        pending: true,
      }));
    return [...pending, ...fromServer].sort((a, b) => b.ts.localeCompare(a.ts));
  }, [server.data, progress.quizOutbox, mock.id]);

  const skills = useMemo(() => new Map((data?.skills ?? []).map((s) => [s.id, s])), [data]);
  const rebuild = (review: MockReviewEntry[]) =>
    review.map((r) => {
      const src = skills.get(r.skillId) as (SkillTemplate & { stub?: boolean }) | undefined;
      let item: Item | undefined;
      if (src && !src.stub && src.version === r.version) {
        try {
          item = generateItem(src, { seed: r.seed, band: r.band });
        } catch {
          item = undefined;
        }
      }
      return { item, difficulty: r.difficulty };
    });

  const current = attempts.find((a) => a.id === open);
  if (current?.review) {
    const outcomes = current.review.map((r) => r.outcome);
    const score = scoreMock(config, current.review);
    return (
      <div className="mock-history-open" ref={top as RefObject<HTMLDivElement>}>
        <MockReportView
          title={mock.title.split(' — ')[0]!}
          when={formatStamp(current.ts)}
          questions={rebuild(current.review)}
          outcomes={outcomes}
          score={score}
          timeMs={current.durationMs}
          referenceMinutes={config.referenceMinutes}
          passPoints={config.passPoints}
          momoColor={momoColor}
          actions={
            <div className="mock-actions">
              <button type="button" className="kid-btn secondary" onClick={() => toggle(undefined)}>
                {t('play.mock.close')}
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <section className="mock-history" aria-labelledby="mock-history-title" ref={top}>
      <h3 id="mock-history-title">{t('play.mock.history')}</h3>
      <p className="mock-history-hint">{t('play.mock.historyHint')}</p>
      {attempts.length === 0 ? (
        <p className="kid-note">
          {server.loading ? t('play.library.loading') : t('play.mock.historyEmpty')}
        </p>
      ) : (
        <ol className="mock-attempts">
          {attempts.map((a, i) => {
            const score = a.review ? scoreMock(config, a.review) : undefined;
            return (
              <li key={a.id} className="mock-attempt">
                <div className="mock-attempt-main">
                  <strong>
                    {formatStamp(a.ts)}
                    {i === 0 && <em className="board-me">{t('play.mock.latest')}</em>}
                  </strong>
                  <span>
                    {t('play.mock.attemptLine', {
                      correct: a.correct,
                      total: a.total,
                      points: score?.points ?? a.points ?? 0,
                      score: score?.score ?? a.score,
                    })}
                    {a.durationMs !== null && <> · {formatClock(a.durationMs)}</>}
                    {a.pending && <> · {t('play.mock.pending')}</>}
                  </span>
                </div>
                {a.review ? (
                  <button type="button" className="kid-btn secondary" onClick={() => toggle(a.id)}>
                    {t('play.mock.open')}
                  </button>
                ) : (
                  <small className="mock-attempt-none">{t('play.mock.noDetail')}</small>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
