import type { PublicItem } from '@little-coder/engine';

/** Bentuk respons API lomba (D-042), lihat apps/api/src/contest. */
export type ContestPhase = 'upcoming' | 'live' | 'ended';
export type ContestInfo = {
  id: string;
  title: string;
  description: string;
  domain: string;
  grade: string;
  book: string | null;
  categories: string[];
  questionCount: number;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  winners: number;
  phase: ContestPhase;
};
export type EntryState = {
  status: 'none' | 'active' | 'done';
  answered: number;
  total: number;
  deadlineAt: string | null;
  remainingMs: number;
  submittedAt?: string | null;
};
export type ContestListItem = ContestInfo & { me: EntryState };
export type ContestList = { now: string; contests: ContestListItem[] };
export type ContestDetail = { now: string; contest: ContestInfo; me: EntryState };
export type ContestSession = {
  entryId: string;
  now: string;
  startedAt: string;
  deadlineAt: string;
  resultsAt: string;
  total: number;
  answered: number[];
  me: EntryState;
  items: (PublicItem & { tier?: 'basic' | 'intermediate' | 'advanced' })[];
};
export type ResultRow = {
  position: number;
  nickname: string;
  momoColor: string;
  correct: number;
  total: number;
  score: number;
  timeMs: number;
  me: boolean;
};
export type ContestResults = {
  now: string;
  contest: ContestInfo;
  participants: number;
  winners: ResultRow[];
  me: ResultRow | null;
};
