import type { Catalog, JagoState, Level, SkillTemplate } from '@little-coder/engine';

/** Kontrak respons API NestJS (apps/api). Tanggal = string ISO. */

export type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'facilitator';
  active: boolean;
  createdAt: string;
};

export type ChildProfile = {
  id: string;
  classId?: string | null;
  className?: string | null;
  classCode?: string | null;
  nickname: string;
  momoColor: string;
  lastActiveAt: string | null;
  createdAt: string;
};

export type ParentRow = {
  id: string;
  name: string;
  email: string;
  familyCode: string;
  active: boolean;
  consentAt: string;
  createdAt: string;
  children: {
    id: string;
    parentId: string;
    nickname: string;
    momoColor: string;
    active: boolean;
    lastActiveAt: string | null;
  }[];
};

export type ChildSummary = {
  id: string;
  nickname: string;
  momoColor: string;
  active: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  parentId: string | null;
  parentName: string | null;
  parentEmail: string | null;
  answered: number;
  jago: number;
};

export type SkillStatus = 'Jago' | 'Bisa' | 'Belajar' | 'Belum mulai';

export type ChildReport = {
  child: {
    id: string;
    nickname: string;
    momoColor: string;
    lastActiveAt: string | null;
    createdAt: string;
  };
  totals: { answered: number; correct: number; jago: number; skills: number };
  week: { answered: number; correct: number };
  areas: {
    domain: string;
    grade: string;
    title: string;
    total: number;
    jago: number;
    bisa: number;
    /** Skor penguasaan area 0–100. */
    mastery: number;
    categories: {
      code: string;
      title: string;
      total: number;
      jago: number;
      bisa: number;
      skills: {
        id: string;
        title: string;
        category: string;
        order: number;
        score: number;
        stage: 'Benih' | 'Tunas' | 'Pohon' | 'Berbuah';
        status: SkillStatus;
        needsReview: boolean;
        answered: number;
        correct: number;
        /** Hasil ronde level terbaik (D-021). */
        level?: { best: number; passed: boolean; attempts: number } | null;
      }[];
    }[];
  }[];
  recommendations: { id: string; title: string; category: string; status: SkillStatus }[];
};

export type Overview = {
  parents: number;
  children: number;
  staff: number;
  skills: number;
  answersWeek: number;
  activeChildrenWeek: number;
  jago: number;
};

export type SkillStat = {
  id: string;
  title: string;
  category: string;
  order: number;
  grade: string;
  domain: string;
  status: 'active' | 'draft';
  answered: number;
  accuracy: number | null;
  learners: number;
  jago: number;
  topDistractors: { tag: string; count: number }[];
};

export type SkillRow = {
  id: string;
  version: number;
  domain: string;
  grade: string;
  category: string;
  order: number;
  title: string;
  status: 'active' | 'draft';
  template: SkillTemplate;
  updatedAt: string;
};

export type CatalogRow = Catalog & { updatedAt: string };

export type LevelRow = {
  id: string;
  version: number;
  tier: string;
  world: number;
  index: number;
  status: 'active' | 'draft';
  data: Level;
  updatedAt: string;
};

export type LevelValidation = {
  level?: Level;
  errors: string[];
  warnings: string[];
  optimalSteps?: number;
};

export type ClassRow = {
  id: string;
  code: string;
  eventName: string;
  world: number | null;
  frozen: boolean;
  closedAt: string | null;
  createdAt: string;
  facilitatorName: string | null;
};

export type CatalogResponse = { catalogs: Catalog[]; skills: SkillTemplate[] };
export type PracticeState = { states: Record<string, JagoState> };

/** GET /practice/profile (D-022). Peringkat hanya posisi sendiri di kelas workshop. */
export type ChildProfileStats = {
  nickname: string;
  momoColor: string;
  totalPoints: number;
  passedLevels: number;
  played: number;
  totalTimeMs: number;
  /** Peringkat global (D-024). */
  rank: { position: number; of: number } | null;
  highest: { book: string; level: number } | null;
  className: string | null;
  history: {
    id: string;
    skillId: string;
    title: string;
    domain: string | null;
    grade: string | null;
    category: string | null;
    order: number | null;
    score: number;
    correct: number;
    total: number;
    passed: boolean;
    durationMs: number | null;
    ts: string;
  }[];
};

export type LeaderboardRow = {
  position: number;
  nickname: string;
  momoColor: string;
  points: number;
  passed: number;
  timeMs: number;
  highest: { book: string; level: number } | null;
  me: boolean;
};
export type Leaderboard = { total: number; rows: LeaderboardRow[]; me: LeaderboardRow | null };
