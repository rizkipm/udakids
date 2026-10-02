import type { PlanStatus } from '@little-coder/engine';

/** Hak akses (Premium admin / pembelian) di direktori admin (D-041). */
export type Grant = {
  id: string;
  name: string;
  scope: string;
  source: 'admin' | 'purchase' | string;
  note: string | null;
  parentId: string | null;
  childId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
  grantedByName: string | null;
  live: boolean;
};

export type Page<T> = { page: number; pageSize: number; total: number; items: T[] };

export type FamilyRow = {
  id: string;
  name: string;
  email: string;
  familyCode: string;
  active: boolean;
  consentAt: string | null;
  /** Null = email belum diverifikasi (D-044). */
  emailVerifiedAt: string | null;
  createdAt: string | null;
  lastActiveAt: string | null;
  /** Paket yang dibeli keluarga (berlaku untuk semua anak). */
  plan: PlanStatus;
  grants: Grant[];
  /** Jumlah anak yang Premium (paket keluarga atau Premium per anak). */
  premiumChildren: number;
  children: {
    id: string;
    nickname: string;
    momoColor: string;
    active: boolean;
    lastActiveAt: string | null;
    classId: string | null;
    plan: PlanStatus;
    grants: Grant[];
  }[];
};

export type ChildRow = {
  id: string;
  nickname: string;
  momoColor: string;
  active: boolean;
  lastActiveAt: string | null;
  createdAt: string | null;
  type: 'family' | 'self' | 'class';
  selfCode: string | null;
  parent: { id: string; name: string; email: string } | null;
  class: { id: string; name: string; code: string } | null;
  passed: number;
  /** Total soal dijawab (D-045). */
  answered: number;
  plan: PlanStatus;
  grants: Grant[];
  familyGrants: Grant[];
};

export type DirectorySummary = {
  families: number;
  familiesInactive: number;
  children: number;
  childrenInactive: number;
  selfChildren: number;
  classChildren: number;
  premiumSelf: number;
  premiumChildren: number;
  adminGrants: number;
};
