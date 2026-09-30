import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// PRD A12 + D-014..D-017. Privasi: data anak HANYA nickname + momo_color (+ hash sandi gambar).

export const staffRole = pgEnum('staff_role', ['admin', 'facilitator']);

/** Akun staf (admin & fasilitator) — email + password (D-015). */
export const staffUsers = pgTable('staff_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: staffRole('role').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Akun orang tua. `consent_at` wajib (UU PDP). `family_code` dipakai anak untuk masuk (D-016). */
export const parents = pgTable('parents', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  familyCode: text('family_code').notNull().unique(),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  facilitatorId: uuid('facilitator_id').references(() => staffUsers.id, { onDelete: 'set null' }),
  code: text('code').notNull().unique(),
  eventName: text('event_name').notNull(),
  world: integer('world'),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  frozen: boolean('frozen').notNull().default(false),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const children = pgTable(
  'children',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references(() => parents.id, { onDelete: 'cascade' }),
    classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }),
    nickname: text('nickname').notNull(),
    momoColor: text('momo_color').notNull(),
    /** Hash sandi gambar (3 gambar berurutan). Bukan data pribadi. */
    picturePinHash: text('picture_pin_hash'),
    failedPinAttempts: integer('failed_pin_attempts').notNull().default(0),
    pinLockedUntil: timestamp('pin_locked_until', { withTimezone: true }),
    reportToken: text('report_token').notNull().unique(),
    active: boolean('active').notNull().default(true),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('children_parent_idx').on(t.parentId), index('children_class_idx').on(t.classId)],
);

/** Kontak orang tua untuk anak yang masuk lewat kelas workshop (tanpa akun). */
export const parentContacts = pgTable('parent_contacts', {
  childId: uuid('child_id')
    .primaryKey()
    .references(() => children.id, { onDelete: 'cascade' }),
  contact: text('contact'),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
});

// Idempoten: id event dibuat di client (uuid v4); insert ... on conflict do nothing.
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }),
    classId: uuid('class_id'),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    ts: timestamp('ts', { withTimezone: true }).notNull(),
  },
  (t) => [index('events_child_idx').on(t.childId, t.ts), index('events_type_idx').on(t.type)],
);

export const levelProgress = pgTable(
  'level_progress',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    levelId: text('level_id').notNull(),
    levelVersion: integer('level_version').notNull(),
    stars: integer('stars').notNull().default(0),
    attempts: integer('attempts').notNull().default(0),
    hints: integer('hints').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.childId, t.levelId, t.levelVersion] })],
);

export const skillMastery = pgTable(
  'skill_mastery',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull(),
    state: jsonb('state').notNull(),
    answered: integer('answered').notNull().default(0),
    correct: integer('correct').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.skillId] })],
);

/** Hasil ronde level (D-021): skor terbaik & status lulus per anak per skill. */
export const quizResults = pgTable(
  'quiz_results',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull(),
    best: integer('best').notNull(),
    last: integer('last').notNull(),
    passed: boolean('passed').notNull(),
    attempts: integer('attempts').notNull(),
    /** Lama pengerjaan (ms) ronde skor terbaik / ronde terakhir (D-024). */
    bestTimeMs: integer('best_time_ms'),
    lastTimeMs: integer('last_time_ms'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.skillId] })],
);

/** Katalog Pustaka per domain + jenjang (kategori A, B, ...). */
export const skillCatalogs = pgTable(
  'skill_catalogs',
  {
    domain: text('domain').notNull(),
    grade: text('grade').notNull(),
    title: text('title').notNull(),
    categories: jsonb('categories').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** Terisi bila katalog disunting admin → `db:seed` tidak menimpanya (sama seperti skill). */
    updatedBy: uuid('updated_by').references(() => staffUsers.id, { onDelete: 'set null' }),
  },
  (t) => [primaryKey({ columns: [t.domain, t.grade] })],
);

/** Skill template Pustaka (dikelola admin, D-017). `template` = SkillTemplate lengkap. */
export const skills = pgTable(
  'skills',
  {
    id: text('id').primaryKey(),
    version: integer('version').notNull(),
    domain: text('domain').notNull(),
    grade: text('grade').notNull(),
    category: text('category').notNull(),
    order: integer('order').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    template: jsonb('template').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by').references(() => staffUsers.id, { onDelete: 'set null' }),
  },
  (t) => [index('skills_catalog_idx').on(t.domain, t.grade, t.category, t.order)],
);

/** Level Petualangan Momo (versi terkini). Progres anak tetap per level_id + version. */
export const levels = pgTable('levels', {
  id: text('id').primaryKey(),
  version: integer('version').notNull(),
  tier: text('tier').notNull(),
  world: integer('world').notNull(),
  index: integer('index').notNull(),
  status: text('status').notNull().default('active'),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => staffUsers.id, { onDelete: 'set null' }),
});

/** Kalimat Momo per bahasa (dulu content/dialog/momo.id.json; kini di database, D-030). */
export const dialogs = pgTable('dialogs', {
  locale: text('locale').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
