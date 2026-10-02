import type { Access, Catalog, JagoState, Level, SkillTemplate } from '@little-coder/engine';

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

/** `access` = kunci level berbayar untuk anak yang login (D-036); tanpa field = semua terbuka. */
export type CatalogResponse = { catalogs: Catalog[]; skills: SkillTemplate[]; access?: Access };
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

/** Peringkat rata-rata (D-042). `childId` hanya ada untuk 25 besar dan baris sendiri. */
export type LeaderboardRow = {
  position: number;
  childId?: string;
  isMe: boolean;
  nickname: string;
  momoColor: string;
  average: number;
  /** Total skor = jumlah skor terbaik tiap level (mode `total`, D-043). */
  points: number;
  rounds: number;
  timeMs: number;
  /** Jumlah waktu skor terbaik (urutan mode `total`). */
  bestTimeMs: number;
  passedLevels: number;
};
/** Urutan papan (D-043): rata-rata (D-042) atau total skor (D-024). */
export type LeaderboardMode = 'average' | 'total';
export type LeaderboardScope = {
  key: string;
  title: string;
  participants: number;
  domain?: string;
  grade?: string;
};
export type LeaderboardScopes = { updatedAt: string; scopes: LeaderboardScope[] };
export type Leaderboard = {
  scope: string;
  mode?: LeaderboardMode;
  title: string;
  updatedAt: string;
  total: number;
  top: LeaderboardRow[];
  rest: { page: number; pageSize: number; total: number; items: LeaderboardRow[] };
  me: LeaderboardRow | null;
};
export type LeaderboardDetail = {
  scope: string;
  nickname: string;
  momoColor: string;
  isMe: boolean;
  position: number;
  participants: number;
  average: number;
  points: number;
  rounds: number;
  timeMs: number;
  bestTimeMs: number;
  passedLevels: number;
  books: {
    key: string;
    title: string;
    domain: string;
    grade: string;
    average: number;
    points: number;
    rounds: number;
    timeMs: number;
    bestTimeMs: number;
    passedLevels: number;
    totalLevels: number;
    position: number;
    participants: number;
  }[];
  topics: {
    bookKey: string;
    book: string;
    domain: string;
    grade: string;
    category: string;
    topic: string;
    average: number;
    points: number;
    rounds: number;
    timeMs: number;
    passed: number;
    levels: number;
  }[];
};
