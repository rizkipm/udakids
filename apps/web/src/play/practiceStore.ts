import { useSyncExternalStore } from 'react';
import {
  initialJago,
  mergeJago,
  mergeQuiz,
  type JagoState,
  type PracticeSync,
  type QuizResult,
} from '@little-coder/engine';

/**
 * Progres latihan per anak di perangkat (offline-first, PRD A11): state Skor Jago, outbox jawaban
 * yang belum terkirim, keping & stiker. Disimpan di localStorage (dibungkus try/catch).
 * Dexie/IndexedDB menggantikan ini di M4 tanpa mengubah antarmuka.
 */
export type Answer = PracticeSync['answers'][number];
export type QuizEvent = PracticeSync['quizzes'][number];
export type HistoryEntry = {
  id: string;
  skillId: string;
  title: string;
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  /** Lama pengerjaan ronde (ms), D-024. */
  durationMs?: number | null;
  ts: number;
};
export type ChildProgress = {
  states: Record<string, JagoState>;
  outbox: Answer[];
  /** Hasil ronde level terbaik per skill (D-021) dan outbox-nya. */
  quizzes: Record<string, QuizResult>;
  quizOutbox: QuizEvent[];
  /** Riwayat ronde di perangkat (cadangan saat offline; sumber utama = server). */
  quizHistory: HistoryEntry[];
  /** Keping Momo (kosmetik) dan stiker skill yang sudah Jago. */
  coins: number;
  stickers: string[];
  /** Kunci soal yang baru keluar per skill (D-028): ronde berikutnya memberi soal lain. */
  recentItems?: Record<string, string[]>;
};

const empty = (): ChildProgress => ({
  states: {},
  outbox: [],
  quizzes: {},
  quizOutbox: [],
  quizHistory: [],
  coins: 0,
  stickers: [],
});
const key = (childId: string) => `lc.practice.${childId}`;
const memory = new Map<string, ChildProgress>();
const listeners = new Set<() => void>();

export function loadProgress(childId: string): ChildProgress {
  const cached = memory.get(childId);
  if (cached) return cached;
  let p = empty();
  try {
    const raw = localStorage.getItem(key(childId));
    if (raw) p = { ...empty(), ...(JSON.parse(raw) as Partial<ChildProgress>) };
  } catch {
    /* penyimpanan tidak tersedia */
  }
  memory.set(childId, p);
  return p;
}

export function saveProgress(childId: string, p: ChildProgress) {
  memory.set(childId, p);
  try {
    localStorage.setItem(key(childId), JSON.stringify(p));
  } catch {
    /* tetap di memori */
  }
  listeners.forEach((l) => l());
}

export function updateProgress(childId: string, fn: (p: ChildProgress) => ChildProgress) {
  saveProgress(childId, fn(loadProgress(childId)));
}

export function useProgress(childId: string): ChildProgress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => loadProgress(childId),
  );
}

export const stateOf = (p: ChildProgress, skillId: string): JagoState =>
  p.states[skillId] ?? initialJago();

/** Gabungkan state dari server (ts terbaru menang, tahap = max). */
export function mergeServerStates(
  childId: string,
  server: Record<string, JagoState>,
  serverQuizzes: Record<string, QuizResult> = {},
) {
  updateProgress(childId, (p) => {
    const states = { ...p.states };
    for (const [id, s] of Object.entries(server))
      states[id] = states[id] ? mergeJago(states[id]!, s) : s;
    const quizzes = { ...p.quizzes };
    for (const [id, q] of Object.entries(serverQuizzes))
      quizzes[id] = quizzes[id] ? mergeQuiz(quizzes[id]!, q) : q;
    return { ...p, states, quizzes };
  });
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Cadangan uuid v4 untuk browser lama.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Kosongkan cache memori (mis. setelah penyimpanan dibersihkan, atau di test). */
export function clearProgressCache() {
  memory.clear();
  listeners.forEach((l) => l());
}
