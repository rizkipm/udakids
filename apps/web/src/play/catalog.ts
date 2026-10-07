import { useEffect, useState } from 'react';
import {
  isReviewDue,
  type Catalog,
  type JagoState,
  type PlayStatus,
  type SkillTemplate,
} from '@little-coder/engine';
import { api, ApiError } from '../api/client';
import { bigDelete, bigGet, bigSet } from './bigStore';
import type { CatalogResponse } from '../api/types';
import { getSession } from '../auth/session';
import { t, type MessageKey } from '../i18n';

/**
 * Salinan katalog di perangkat PER ANAK (D-047). Katalog membawa hak akses (`access`) dan isi template
 * level berbayar milik anak itu — kalau dipakai bersama, adik (Free) di perangkat yang sama akan
 * memakai katalog kakaknya (Premium) dan level berbayar ikut terbuka.
 */
const LEGACY_KEY = 'lc.catalog';
const keyFor = (childId: string) => `lc.catalog.${childId}`;

function cached(childId: string | undefined): CatalogResponse | undefined {
  if (!childId) return undefined;
  try {
    // Salinan lama yang dipakai bersama tidak pernah dibaca lagi.
    localStorage.removeItem(LEGACY_KEY);
    const raw = localStorage.getItem(keyFor(childId));
    return raw ? (JSON.parse(raw) as CatalogResponse) : undefined;
  } catch {
    return undefined;
  }
}

/** Salinan di memori dipakai ulang antarhalaman selama ini (tidak mengunduh katalog lagi). */
const FRESH_MS = 3 * 60_000;
/** Jeda coba ulang otomatis bila jaringan/server sesaat gagal. */
const RETRY_MS = [1500, 4000];

let shared: { childId: string; data: CatalogResponse; at: number } | undefined;
let inflight: { childId: string; promise: Promise<CatalogResponse> } | undefined;

/** Untuk test: lupakan katalog di memori. */
export const resetCatalogMemory = () => {
  shared = undefined;
  inflight = undefined;
};

/** Simpan salinan offline: localStorage bila muat, selain itu IndexedDB (katalog lengkap bisa puluhan MB). */
function save(childId: string, res: CatalogResponse) {
  const key = keyFor(childId);
  try {
    localStorage.setItem(key, JSON.stringify(res));
    void bigDelete(key);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* abaikan */
    }
    void bigSet(key, res);
  }
}

async function download(token: string): Promise<CatalogResponse> {
  for (let i = 0; ; i++) {
    try {
      return await api<CatalogResponse>('/catalog', { token });
    } catch (err) {
      // 4xx (mis. sesi habis) tidak membaik dengan dicoba ulang.
      const client = err instanceof ApiError && err.status >= 400 && err.status < 500;
      if (client || i >= RETRY_MS.length) throw err;
      await new Promise((r) => setTimeout(r, RETRY_MS[i]));
    }
  }
}

/**
 * Katalog Pustaka: salinan anak ini di perangkat dulu (offline), lalu perbarui dari server. Satu unduhan
 * dipakai bersama semua halaman (beranda, topik, latihan, pelajaran); gagal sesaat → dicoba ulang otomatis;
 * `retry` untuk tombol "Coba lagi".
 */
export function useCatalog() {
  const childId = getSession('child')?.user.id;
  const [data, setData] = useState<CatalogResponse | undefined>(
    () => (shared && shared.childId === childId ? shared.data : undefined) ?? cached(childId),
  );
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const session = getSession('child');
    if (!session?.token) return;
    const id = session.user.id;
    let live = true;
    if (!data)
      void bigGet<CatalogResponse>(keyFor(id)).then((d) => {
        if (live && d) setData((cur) => cur ?? d);
      });
    if (attempt === 0 && shared?.childId === id && Date.now() - shared.at < FRESH_MS) {
      return () => {
        live = false;
      };
    }
    if (!inflight || inflight.childId !== id) {
      const promise = download(session.token);
      inflight = { childId: id, promise };
      promise
        .then((res) => {
          shared = { childId: id, data: res, at: Date.now() };
          save(id, res);
        })
        .catch(() => {})
        .finally(() => {
          if (inflight?.promise === promise) inflight = undefined;
        });
    }
    setFailed(false);
    inflight.promise.then(
      (res) => live && setData(res),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
    // Sekali per halaman, atau saat anak menekan "Coba lagi".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  return {
    data,
    failed: failed && !data,
    /** Sedang mencoba lagi setelah gagal (untuk animasi). */
    retrying: attempt > 0 && !failed && !data,
    retry: () => setAttempt((a) => a + 1),
  };
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
  /** Topik mandiri yang dilewati (anak sudah bermain di topik biasa, D-068). */
  skip: ReadonlySet<string> = new Set(),
): { shelf: Shelf; skill: SkillTemplate; level: number } | undefined {
  for (const shelf of shelves) {
    if (skip.has(shelf.category.code)) continue;
    const i = shelf.skills.findIndex((k) => statuses[k.id] === 'open');
    if (i >= 0) return { shelf, skill: shelf.skills[i]!, level: i + 1 };
  }
  return undefined;
}

/** Label jenjang untuk anak (Pra-TK, TK, Kelas 1, …, Kelas 1–2 (Olimpiade)). */
export const gradeLabel = (g: string) => {
  const key = `play.grade.${g}` as MessageKey;
  const label = t(key);
  return label === key ? g : label;
};
