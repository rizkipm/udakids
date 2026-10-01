import { useEffect, useState } from 'react';
import {
  isReviewDue,
  type Catalog,
  type JagoState,
  type PlayStatus,
  type SkillTemplate,
} from '@little-coder/engine';
import { api } from '../api/client';
import type { CatalogResponse } from '../api/types';
import { getSession } from '../auth/session';

const KEY = 'lc.catalog';

function cached(): CatalogResponse | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CatalogResponse) : undefined;
  } catch {
    return undefined;
  }
}

/** Katalog Pustaka: tampilkan salinan di perangkat dulu (offline), lalu perbarui dari server. */
export function useCatalog() {
  const [data, setData] = useState<CatalogResponse | undefined>(cached);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const token = getSession('child')?.token;
    if (!token) return;
    api<CatalogResponse>('/catalog', { token })
      .then((res) => {
        setData(res);
        try {
          localStorage.setItem(KEY, JSON.stringify(res));
        } catch {
          /* abaikan */
        }
      })
      .catch(() => setFailed(true));
  }, []);
  return { data, failed: failed && !data };
}

export type Shelf = {
  catalog: Catalog;
  category: Catalog['categories'][number];
  skills: SkillTemplate[];
};

export function shelvesOf(data: CatalogResponse): Shelf[] {
  return data.catalogs
    .flatMap((catalog) =>
      catalog.categories.map((category) => ({
        catalog,
        category,
        skills: data.skills
          .filter(
            (s) =>
              s.domain === catalog.domain &&
              s.grade === catalog.grade &&
              s.category === category.code,
          )
          .sort((a, b) => a.order - b.order),
      })),
    )
    .filter((s) => s.skills.length > 0);
}

/**
 * "3 skill untuk hari ini": ulangan yang jatuh tempo / perlu disiram, lalu yang sedang dipelajari,
 * lalu skill berikutnya yang belum dimulai (urutan katalog).
 */
export function todaySkills(
  skills: SkillTemplate[],
  states: Record<string, JagoState>,
  now = Date.now(),
): SkillTemplate[] {
  const s = (id: string) => states[id];
  const due = skills.filter((k) => s(k.id) && (isReviewDue(s(k.id)!, now) || s(k.id)!.needsReview));
  const learning = skills.filter(
    (k) => s(k.id) && s(k.id)!.score > 0 && s(k.id)!.score < 100 && !s(k.id)!.needsReview,
  );
  const fresh = skills.filter((k) => !s(k.id) || (s(k.id)!.score === 0 && s(k.id)!.ts === 0));
  return [...new Map([...due, ...learning, ...fresh].map((k) => [k.id, k])).values()].slice(0, 3);
}

/** "Organ tubuh manusia — Level 1 — Dasar" → "Dasar" (nama materi & nomor level sudah tampil terpisah). */
export const levelLabel = (title: string) => title.replace(/^.*?—\s*Level\s+\d+\s*—\s*/, '');

export const bookKey = (c: { domain: string; grade: string }) => `${c.domain}/${c.grade}`;

/** Level terbuka pertama (belum lulus) di rak-rak ini = "lanjutkan belajar". */
export function firstOpen(
  shelves: Shelf[],
  statuses: Readonly<Record<string, PlayStatus>>,
): { shelf: Shelf; skill: SkillTemplate; level: number } | undefined {
  for (const shelf of shelves) {
    const i = shelf.skills.findIndex((k) => statuses[k.id] === 'open');
    if (i >= 0) return { shelf, skill: shelf.skills[i]!, level: i + 1 };
  }
  return undefined;
}
