import { sql } from 'drizzle-orm';
import type { Db } from '../db/db.module.js';

/**
 * Anak yang sedang bermain (D-103): aktif (sinkron jawaban) dalam 10 menit terakhir, dengan soal terakhir yang
 * dijawab. Dipakai admin (detail lengkap) dan landing publik (nama panggilan + materi saja).
 */
export const LIVE_WINDOW_MIN = 10;

const SUBJECT: Record<string, string> = {
  math: 'Matematika',
  sains: 'Sains',
  english: 'English',
  worksheet: 'Worksheet',
  literasi: 'Literasi',
  logika: 'Logika',
  spasial: 'Spasial',
};
const GRADE: Record<string, string> = {
  prek: 'PAUD',
  tk: 'TK',
  tkosn: 'TK Olimpiade',
  sd1: 'Kelas 1',
  sd2: 'Kelas 2',
  sd12: 'Kelas 1–2 Olimpiade',
  sd3: 'Kelas 3',
  sd4: 'Kelas 4',
  sd34: 'Kelas 3–4 Olimpiade',
  sd56: 'Kelas 5–6 Olimpiade',
  smp79: 'SMP Olimpiade',
};

/** "Matematika Kelas 2" dari domain + jenjang skill. */
export const bookLabel = (domain: string, grade: string) =>
  `${SUBJECT[domain] ?? domain} ${GRADE[grade] ?? grade}`;

export type LiveRow = {
  id: string;
  nickname: string;
  momoColor: string;
  momoLook: unknown;
  lastActiveAt: Date;
  parentId: string | null;
  parentName: string | null;
  parentEmail: string | null;
  classId: string | null;
  className: string | null;
  classCode: string | null;
  selfCode: string | null;
  skillId: string | null;
  domain: string | null;
  grade: string | null;
  topic: string | null;
  levelTitle: string | null;
  order: number | null;
  answeredToday: number;
  correctToday: number;
};

/**
 * Anak aktif + materi terakhir. `publicOnly`: tanpa anak yang tergabung di kelas sekolah (D-103), maks. 12; admin: semua.
 * "Hari ini" mengikuti WIB.
 */
export async function livePlayers(db: Db, opts: { publicOnly?: boolean; limit?: number } = {}) {
  // Admin melihat SEMUA anak yang aktif (tanpa batas); toast publik maks. 12.
  const limit = opts.limit ?? (opts.publicOnly ? 12 : undefined);
  const res = await db.execute(sql`
    select c.id, c.nickname, c.momo_color, c.momo_look, c.last_active_at, c.self_code,
      c.parent_id, p.name as parent_name, p.email as parent_email,
      c.class_id, cl.event_name as class_name, cl.code as class_code,
      le.skill_id, s.domain, s.grade, s.title as level_title, s."order" as ord,
      (select x->>'title' from skill_catalogs sc, jsonb_array_elements(sc.categories) x
        where sc.domain = s.domain and sc.grade = s.grade and x->>'code' = s.category limit 1) as topic,
      (select count(*) from events e where e.child_id = c.id and e.type = 'item_answer'
        and e.ts >= (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'))
        as answered_today,
      (select count(*) from events e where e.child_id = c.id and e.type = 'item_answer'
        and (e.payload->>'correct')::boolean
        and e.ts >= (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'))
        as correct_today
    from children c
    left join parents p on p.id = c.parent_id
    left join classes cl on cl.id = c.class_id
    left join lateral (
      select e.payload->>'skillId' as skill_id from events e
      where e.child_id = c.id and e.type in ('item_answer', 'quiz_result')
      order by e.ts desc limit 1
    ) le on true
    left join skills s on s.id = le.skill_id
    where c.active
      and c.last_active_at > now() - make_interval(mins => ${LIVE_WINDOW_MIN})
      ${opts.publicOnly ? sql`and c.class_id is null and le.skill_id is not null` : sql``}
    order by c.last_active_at desc
    ${limit ? sql`limit ${limit}` : sql``}`);
  return (res.rows as Record<string, unknown>[]).map((r): LiveRow => ({
    id: String(r.id),
    nickname: String(r.nickname),
    momoColor: String(r.momo_color),
    momoLook: r.momo_look ?? null,
    lastActiveAt: new Date(String(r.last_active_at)),
    parentId: r.parent_id ? String(r.parent_id) : null,
    parentName: r.parent_name ? String(r.parent_name) : null,
    parentEmail: r.parent_email ? String(r.parent_email) : null,
    classId: r.class_id ? String(r.class_id) : null,
    className: r.class_name ? String(r.class_name) : null,
    classCode: r.class_code ? String(r.class_code) : null,
    selfCode: r.self_code ? String(r.self_code) : null,
    skillId: r.skill_id ? String(r.skill_id) : null,
    domain: r.domain ? String(r.domain) : null,
    grade: r.grade ? String(r.grade) : null,
    topic: r.topic ? String(r.topic) : null,
    levelTitle: r.level_title ? String(r.level_title) : null,
    order: r.ord == null ? null : Number(r.ord),
    answeredToday: Number(r.answered_today ?? 0),
    correctToday: Number(r.correct_today ?? 0),
  }));
}
