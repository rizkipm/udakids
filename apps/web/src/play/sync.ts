import type { JagoState, LabProgressMap, PracticeSync, QuizResult } from '@little-coder/engine';
import { api, ApiError } from '../api/client';
import { getSession, setSession } from '../auth/session';
import { loadProgress, mergeServerStates, updateProgress } from './practiceStore';

type ServerProgress = {
  states: Record<string, JagoState>;
  quizzes?: Record<string, QuizResult>;
  labs?: LabProgressMap;
};

let flushing = false;
let retryMs = 2_000;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Kirim outbox ke server (jawaban, state Skor Jago, hasil ronde level). Idempoten per id, jadi aman
 * dikirim ulang. Gagal (offline) → coba lagi dengan backoff eksponensial (maks 1 menit).
 */
export async function flushPractice(childId: string): Promise<void> {
  const session = getSession('child');
  if (flushing || !session || session.user.id !== childId) return;
  const p = loadProgress(childId);
  const answers = p.outbox.slice(0, 200);
  const quizzes = p.quizOutbox.slice(0, 100);
  const labs = (p.labOutbox ?? []).slice(0, 200);
  const touched = new Set(answers.map((a) => a.skillId));
  const states = Object.entries(p.states)
    .filter(([id]) => touched.has(id) || answers.length === 0)
    .map(([skillId, state]) => ({ skillId, state }));
  if (answers.length === 0 && states.length === 0 && quizzes.length === 0 && labs.length === 0)
    return;
  flushing = true;
  try {
    const res = await api<ServerProgress>('/practice/sync', {
      token: session.token,
      body: { answers, states, quizzes, labs } satisfies PracticeSync,
    });
    const sent = new Set([
      ...answers.map((a) => a.id),
      ...quizzes.map((q) => q.id),
      ...labs.map((l) => l.id),
    ]);
    updateProgress(childId, (cur) => ({
      ...cur,
      outbox: cur.outbox.filter((a) => !sent.has(a.id)),
      quizOutbox: cur.quizOutbox.filter((q) => !sent.has(q.id)),
      labOutbox: (cur.labOutbox ?? []).filter((l) => !sent.has(l.id)),
    }));
    mergeServerStates(childId, res.states, res.quizzes, res.labs);
    retryMs = 2_000;
    const left = loadProgress(childId);
    if (left.outbox.length > 0 || left.quizOutbox.length > 0 || (left.labOutbox ?? []).length > 0)
      void flushPractice(childId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setSession('child', null);
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => void flushPractice(childId), retryMs);
    retryMs = Math.min(retryMs * 2, 60_000);
  } finally {
    flushing = false;
  }
}

/** Ambil progres server saat anak masuk (gabung dengan yang ada di perangkat). */
export async function pullPractice(childId: string): Promise<void> {
  const session = getSession('child');
  if (!session) return;
  try {
    const res = await api<ServerProgress>('/practice/state', { token: session.token });
    mergeServerStates(childId, res.states, res.quizzes, res.labs);
  } catch {
    /* offline: pakai data perangkat */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const s = getSession('child');
    if (s) void flushPractice(s.user.id);
  });
}
