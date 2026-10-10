import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// PRD A12 + D-014..D-017. Privasi: data anak HANYA nickname + momo_color (+ hash sandi gambar).

export const staffRole = pgEnum('staff_role', ['admin', 'facilitator']);

/** Akun staf (admin & fasilitator) — email + password (D-015). */
export const staffUsers = pgTable(
  'staff_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: staffRole('role').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Email unik tanpa membedakan huruf besar/kecil (audit L1).
  (t) => [uniqueIndex('staff_users_email_lower_uq').on(sql`lower(${t.email})`)],
);

/** Akun orang tua. `consent_at` wajib (UU PDP). `family_code` dipakai anak untuk masuk (D-016). */
export const parents = pgTable(
  'parents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    familyCode: text('family_code').notNull().unique(),
    consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
    /** Email sudah diverifikasi dengan kode (D-044). Null = belum boleh masuk. */
    /** Berhenti menerima email info materi baru (D-053); null = berlangganan. */
    newsOptOutAt: timestamp('news_opt_out_at', { withTimezone: true }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    active: boolean('active').notNull().default(true),
    /** Kode referal milik akun ini (D-063); dibuat saat pertama kali membuka menu Afiliasi. */
    referralCode: text('referral_code').unique(),
    /** Yang mengajak (dikunci saat daftar; tidak bisa diubah, tidak bisa diri sendiri). */
    referredBy: uuid('referred_by').references((): AnyPgColumn => parents.id, {
      onDelete: 'set null',
    }),
    referredAt: timestamp('referred_at', { withTimezone: true }),
    /** Hash IP saat daftar (HMAC, tidak bisa dibalik) — hanya untuk deteksi akun palsu afiliasi. */
    signupIpHash: text('signup_ip_hash'),
    /** Password terakhir diganti (D-064): token yang terbit sebelum ini tidak berlaku lagi. */
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
    /** Password sementara dari admin → orang tua diminta segera menggantinya setelah masuk (D-064). */
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    /** Akun Google yang tersambung (klaim `sub`, D-066); null = belum pernah masuk dengan Google. */
    googleSub: text('google_sub').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('parents_email_lower_uq').on(sql`lower(${t.email})`),
    index('parents_referred_by_idx').on(t.referredBy),
  ],
);

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
    /** Gradasi & aksesori Momo (D-051) — tampilan robot, bukan data pribadi. */
    momoLook: jsonb('momo_look'),
    /** Hash sandi gambar (3 gambar berurutan). Bukan data pribadi. */
    picturePinHash: text('picture_pin_hash'),
    failedPinAttempts: integer('failed_pin_attempts').notNull().default(0),
    pinLockedUntil: timestamp('pin_locked_until', { withTimezone: true }),
    /** Berapa kali sandi gambar terkunci berturut-turut → kunci makin lama (audit H3). */
    pinLockCount: integer('pin_lock_count').notNull().default(0),
    reportToken: text('report_token').notNull().unique(),
    /** Kode keluarga milik anak yang daftar sendiri tanpa orang tua (D-037). Tetap berlaku setelah ditautkan. */
    selfCode: text('self_code').unique(),
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
  (t) => [
    index('events_child_idx').on(t.childId, t.ts),
    index('events_type_idx').on(t.type),
    // Laporan admin/guru menyaring per jenis + rentang waktu (D-099).
    index('events_type_ts_idx').on(t.type, t.ts),
  ],
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

/**
 * Progres materi berformat lab (D-109): bintang penguasaan 0–3 per bagian Lab Buku / Materi Topik. `labKey` =
 * "domain/grade" (Lab Buku) atau "domain/grade/kode" (Materi Topik); `part` mis. "pos:mata", "tab:contoh".
 * Bintang tidak pernah turun. Event mentahnya ada di `events` (type `lab_progress`, idempoten per id).
 */
export const labProgress = pgTable(
  'lab_progress',
  {
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    labKey: text('lab_key').notNull(),
    part: text('part').notNull(),
    stars: integer('stars').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.labKey, t.part] })],
);

/** Katalog Pustaka per domain + jenjang (kategori A, B, ...). */
export const skillCatalogs = pgTable(
  'skill_catalogs',
  {
    domain: text('domain').notNull(),
    grade: text('grade').notNull(),
    title: text('title').notNull(),
    categories: jsonb('categories').notNull(),
    /** Lab Buku (D-109): ruang lab per buku/jenjang dengan pos per tema. */
    lab: jsonb('lab'),
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
    /** Kapan skill pertama kali masuk DB — dasar info materi baru (D-053). */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

/** Pengaturan aplikasi yang bisa diubah admin (billing, suara Momo, …). */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => staffUsers.id, { onDelete: 'set null' }),
});

/** Cache audio suara Momo (D-035). `key` = SHA-256(model|suara|gaya|kecepatan|teks). */
export const voiceClips = pgTable('voice_clips', {
  key: text('key').primaryKey(),
  text: text('text').notNull(),
  voice: text('voice').notNull(),
  mime: text('mime').notNull(),
  data: bytea('data').notNull(),
  bytes: integer('bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ------------------------------------------------------------------ pembayaran manual (D-036)

/** Paket berbayar; harga & diskon diatur admin. Uang = rupiah bulat. */
export const packages = pgTable('packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  scope: text('scope').notNull(),
  books: jsonb('books').notNull().default([]),
  durationDays: integer('duration_days'),
  price: integer('price').notNull(),
  discountType: text('discount_type').notNull().default('none'),
  discountValue: integer('discount_value').notNull().default(0),
  discountStartsAt: timestamp('discount_starts_at', { withTimezone: true }),
  discountEndsAt: timestamp('discount_ends_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Rekening bank / e-wallet tujuan transfer. */
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),
  provider: text('provider').notNull(),
  accountNumber: text('account_number').notNull(),
  accountName: text('account_name').notNull(),
  instructions: text('instructions').notNull().default(''),
  active: boolean('active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Pesanan orang tua. Harga, paket, dan rekening disalin (snapshot) saat dibuat agar riwayat tidak
 * berubah bila admin mengubah paket. `amount` = harga akhir + kode unik (selalu ganjil).
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: text('number').notNull().unique(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    packageId: uuid('package_id').references(() => packages.id, { onDelete: 'set null' }),
    packageSnapshot: jsonb('package_snapshot').notNull(),
    methodSnapshot: jsonb('method_snapshot').notNull(),
    priceNormal: integer('price_normal').notNull(),
    discount: integer('discount').notNull(),
    uniqueCode: integer('unique_code').notNull(),
    amount: integer('amount').notNull(),
    status: text('status').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    proof: bytea('proof'),
    proofMime: text('proof_mime'),
    proofAt: timestamp('proof_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('orders_parent_idx').on(t.parentId, t.createdAt),
    index('orders_status_idx').on(t.status),
  ],
);

/**
 * Hak akses (paket). `source` = `purchase` (pesanan lunas, berlaku untuk semua anak di keluarga) atau
 * `admin` (Premium yang diberikan admin — tanpa pesanan & TIDAK masuk buku kas, D-041). Pemberian admin
 * bisa untuk satu keluarga (`parent_id`) atau satu anak saja (`child_id`, termasuk anak yang daftar sendiri).
 */
export const entitlements = pgTable(
  'entitlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references(() => parents.id, { onDelete: 'cascade' }),
    childId: uuid('child_id').references(() => children.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    packageId: uuid('package_id').references(() => packages.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    scope: text('scope').notNull(),
    books: jsonb('books').notNull().default([]),
    source: text('source').notNull().default('purchase'),
    note: text('note'),
    grantedBy: uuid('granted_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('entitlements_parent_idx').on(t.parentId),
    index('entitlements_child_idx').on(t.childId),
    uniqueIndex('entitlements_order_uq').on(t.orderId),
    check('entitlements_owner_ck', sql`${t.parentId} is not null or ${t.childId} is not null`),
  ],
);

/** Buku kas: pemasukan (otomatis dari pesanan lunas) & pengeluaran (input admin). */
export const cashEntries = pgTable(
  'cash_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: text('date').notNull(),
    type: text('type').notNull(),
    category: text('category').notNull(),
    amount: integer('amount').notNull(),
    description: text('description').notNull().default(''),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('cash_entries_date_idx').on(t.date),
    uniqueIndex('cash_entries_order_uq').on(t.orderId),
  ],
);

/** Owner penerima komisi; persen dalam basis poin (1% = 100). */
export const owners = pgTable('owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  percentBp: integer('percent_bp').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Komisi bulan yang sudah ditutup (snapshot persen & laba saat ditutup). */
export const commissionPayouts = pgTable(
  'commission_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    month: text('month').notNull(),
    ownerId: uuid('owner_id').references(() => owners.id, { onDelete: 'set null' }),
    ownerName: text('owner_name').notNull(),
    percentBp: integer('percent_bp').notNull(),
    net: integer('net').notNull(),
    amount: integer('amount').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('commission_month_owner_uq').on(t.month, t.ownerId)],
);

// ------------------------------------------------------------------ lomba live (D-042)

/** Lomba serentak. Soal dibuat & dinilai di server; hasil diumumkan otomatis setelah selesai. */
export const contests = pgTable(
  'contests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    domain: text('domain').notNull(),
    grade: text('grade').notNull(),
    categories: jsonb('categories').notNull().default([]),
    questionCount: integer('question_count').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    winners: integer('winners').notNull().default(10),
    published: boolean('published').notNull().default(false),
    createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('contests_time_idx').on(t.startsAt, t.endsAt)],
);

/**
 * Keikutsertaan anak (satu kali per lomba). `items` = soal lengkap DENGAN kunci jawaban — hanya di server.
 * `flags` = catatan kejanggalan (mis. keluar dari halaman, jawaban terlalu cepat) untuk ditinjau admin.
 */
export const contestEntries = pgTable(
  'contest_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contestId: uuid('contest_id')
      .notNull()
      .references(() => contests.id, { onDelete: 'cascade' }),
    childId: uuid('child_id')
      .notNull()
      .references(() => children.id, { onDelete: 'cascade' }),
    items: jsonb('items').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    correct: integer('correct').notNull().default(0),
    answered: integer('answered').notNull().default(0),
    lastAnswerAt: timestamp('last_answer_at', { withTimezone: true }),
    flags: jsonb('flags').notNull().default({}),
    disqualified: boolean('disqualified').notNull().default(false),
  },
  (t) => [uniqueIndex('contest_entries_uq').on(t.contestId, t.childId)],
);

/** Jawaban per soal (sekali per soal; tidak bisa diubah setelah dikirim). */
export const contestAnswers = pgTable(
  'contest_answers',
  {
    entryId: uuid('entry_id')
      .notNull()
      .references(() => contestEntries.id, { onDelete: 'cascade' }),
    index: integer('index').notNull(),
    value: jsonb('value').notNull(),
    correct: boolean('correct').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.index] })],
);

// ------------------------------------------------------------------ banner & galeri (D-042)

/** Gambar yang diunggah admin (banner, galeri). Disimpan di PostgreSQL agar ikut backup. */
export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  mime: text('mime').notNull(),
  data: bytea('data').notNull(),
  bytes: integer('bytes').notNull(),
  createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Banner slideshow (kegiatan, promosi, info) — tampil di landing / dasbor orang tua / admin. */
export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull().default(''),
  ctaLabel: text('cta_label').notNull().default(''),
  ctaUrl: text('cta_url').notNull().default(''),
  imageId: uuid('image_id').references(() => media.id, { onDelete: 'set null' }),
  tone: text('tone').notNull().default('grape'),
  placements: jsonb('placements').notNull().default([]),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Dokumentasi kegiatan di landing (foto + keterangan). */
export const galleryItems = pgTable('gallery_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  caption: text('caption').notNull().default(''),
  eventDate: text('event_date'),
  imageId: uuid('image_id')
    .notNull()
    .references(() => media.id, { onDelete: 'cascade' }),
  active: boolean('active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ------------------------------------------------------------------ email (D-044)

/** Kode verifikasi email orang tua (6 digit, disimpan sebagai hash; berlaku 15 menit, maks 5 percobaan). */
export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    /** `verify` (daftar, D-044), `reset` (lupa password), `email` (ganti email) — D-064. */
    purpose: text('purpose').notNull().default('verify'),
    /** Untuk `email`: alamat baru yang menunggu dikonfirmasi kode. */
    newEmail: text('new_email'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('email_verifications_parent_idx').on(t.parentId, t.createdAt)],
);

/**
 * Antrean email: ditulis dulu, lalu dikirim pekerja dengan percobaan ulang. Isi (html/text) dihapus setelah
 * terkirim agar kode & data pribadi tidak menumpuk di database.
 */
export const emailOutbox = pgTable(
  'email_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    toEmail: text('to_email').notNull(),
    subject: text('subject').notNull(),
    html: text('html'),
    text: text('text'),
    kind: text('kind').notNull(),
    refId: text('ref_id'),
    status: text('status').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    /** Jawaban server SMTP saat diterima (mis. "250 OK id=1xDmjJ-…") untuk dilacak di cPanel → Track Delivery. */
    smtpResponse: text('smtp_response'),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => [index('email_outbox_status_idx').on(t.status, t.nextAttemptAt)],
);

// ------------------------------------------------------------------ afiliasi orang tua (D-063)

/** Kode sekali pakai untuk aksi sensitif (mis. ganti rekening pencairan), terpisah dari verifikasi daftar. */
export const actionCodes = pgTable(
  'action_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('action_codes_parent_idx').on(t.parentId, t.purpose, t.createdAt)],
);

/** Klik link referal per hari (WIB) — angka saja, tanpa data pengunjung. */
export const affiliateClickDays = pgTable(
  'affiliate_click_days',
  {
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    clicks: integer('clicks').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.parentId, t.day] })],
);

/** Rekening pencairan (satu per akun). Nomor disimpan terenkripsi; hash HMAC untuk mendeteksi rekening kembar. */
export const affiliateAccounts = pgTable(
  'affiliate_accounts',
  {
    parentId: uuid('parent_id')
      .primaryKey()
      .references(() => parents.id, { onDelete: 'cascade' }),
    providerId: text('provider_id').notNull(),
    providerName: text('provider_name').notNull(),
    kind: text('kind').notNull(),
    accountSealed: jsonb('account_sealed').notNull(),
    accountLast4: text('account_last4').notNull(),
    accountHash: text('account_hash').notNull(),
    holderName: text('holder_name').notNull(),
    /** Nama rekening cocok dengan nama akun saat disimpan. */
    nameMatch: boolean('name_match').notNull(),
    /** pending (menunggu admin) | verified | rejected */
    status: text('status').notNull(),
    reviewNote: text('review_note'),
    verifiedBy: uuid('verified_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('affiliate_accounts_hash_idx').on(t.accountHash)],
);

/** Pengajuan pencairan. Saldo dikunci saat diajukan (catatan `payout` di buku besar). */
export const affiliatePayouts = pgTable(
  'affiliate_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: text('number').notNull().unique(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    providerName: text('provider_name').notNull(),
    kind: text('kind').notNull(),
    accountSealed: jsonb('account_sealed').notNull(),
    accountLast4: text('account_last4').notNull(),
    holderName: text('holder_name').notNull(),
    /** requested | paid | rejected | cancelled */
    status: text('status').notNull(),
    note: text('note'),
    transferRef: text('transfer_ref'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedBy: uuid('reviewed_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    cashEntryId: uuid('cash_entry_id').references(() => cashEntries.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('affiliate_payouts_parent_idx').on(t.parentId, t.requestedAt),
    // Satu pengajuan terbuka per akun — dijaga database, bukan hanya kode.
    uniqueIndex('affiliate_payouts_open_uq')
      .on(t.parentId)
      .where(sql`${t.status} = 'requested'`),
  ],
);

/**
 * Buku besar afiliasi: setiap gerakan saldo adalah baris baru (jumlah tidak pernah diubah). Saldo = jumlah baris
 * `available`. Indeks unik menjamin satu bonus per teman, satu komisi per pesanan, dan satu catatan per jenis per
 * pencairan, sehingga tidak ada saldo ganda walau permintaan diulang.
 */
export const affiliateLedger = pgTable(
  'affiliate_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    /** signup_bonus | commission | payout | payout_return | adjustment */
    type: text('type').notNull(),
    /** pending | available | void */
    state: text('state').notNull(),
    amount: integer('amount').notNull(),
    /** Komisi: dasar (harga tanpa kode unik) & persen yang berlaku saat dicatat. */
    baseAmount: integer('base_amount'),
    rateBp: integer('rate_bp'),
    refereeId: uuid('referee_id').references(() => parents.id, { onDelete: 'set null' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    payoutId: uuid('payout_id').references(() => affiliatePayouts.id, { onDelete: 'set null' }),
    /** Komisi bisa dicairkan mulai waktu ini; bonus: batas waktu syarat aktif. */
    availableAt: timestamp('available_at', { withTimezone: true }),
    note: text('note'),
    createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('affiliate_ledger_parent_idx').on(t.parentId, t.createdAt),
    index('affiliate_ledger_pending_idx').on(t.state, t.availableAt),
    uniqueIndex('affiliate_ledger_bonus_uq')
      .on(t.refereeId)
      .where(sql`${t.type} = 'signup_bonus'`),
    uniqueIndex('affiliate_ledger_commission_uq')
      .on(t.orderId)
      .where(sql`${t.type} = 'commission'`),
    uniqueIndex('affiliate_ledger_payout_uq')
      .on(t.payoutId, t.type)
      .where(sql`${t.payoutId} is not null`),
    check('affiliate_ledger_state_ck', sql`${t.state} in ('pending', 'available', 'void')`),
  ],
);

// ------------------------------------------------------------------ AI Gambar (D-068)

/**
 * Gudang gambar AI: setiap gambar dibuat SEKALI di admin lalu dipakai ulang. `fingerprint` =
 * SHA-256(gaya|jenis|subjek|varian|catatan|model|kualitas|ukuran|latar|referensi) — permintaan yang sama
 * memakai baris yang sudah ada (tidak membayar dua kali). Tidak ada data anak di tabel ini.
 */
export const aiImages = pgTable(
  'ai_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fingerprint: text('fingerprint').notNull().unique(),
    kind: text('kind').notNull(),
    subject: text('subject').notNull(),
    label: text('label').notNull(),
    labelEn: text('label_en'),
    theme: text('theme'),
    variant: integer('variant').notNull().default(1),
    prompt: text('prompt').notNull(),
    model: text('model').notNull(),
    quality: text('quality').notNull(),
    size: text('size').notNull(),
    status: text('status').notNull().default('review'),
    mime: text('mime').notNull(),
    data: bytea('data').notNull(),
    bytes: integer('bytes').notNull(),
    costUsd: doublePrecision('cost_usd').notNull().default(0),
    /** Gambar karakter yang dipakai sebagai referensi (mis. Momo), agar karakter konsisten. */
    referenceId: uuid('reference_id'),
    createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedBy: uuid('reviewed_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (t) => [
    index('ai_images_subject_idx').on(t.subject, t.status),
    check('ai_images_status_ck', sql`${t.status} in ('review', 'approved', 'rejected')`),
    check('ai_images_kind_ck', sql`${t.kind} in ('object', 'character', 'scene')`),
  ],
);

/**
 * Log audit & biaya AI: setiap panggilan (berhasil/gagal), penggantian kunci, dan perubahan pengaturan.
 * Dipakai untuk batas biaya harian/bulanan. API key TIDAK PERNAH ditulis di sini.
 */
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    action: text('action').notNull(),
    model: text('model'),
    imageId: uuid('image_id').references(() => aiImages.id, { onDelete: 'set null' }),
    inputTokens: integer('input_tokens'),
    cachedTokens: integer('cached_tokens'),
    outputTokens: integer('output_tokens'),
    costUsd: doublePrecision('cost_usd').notNull().default(0),
    ok: boolean('ok').notNull(),
    detail: text('detail'),
    createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ai_usage_created_idx').on(t.createdAt)],
);

// ------------------------------------------------------------------ video panduan & artikel (D-073)

/** Video panduan YouTube di landing page. Hanya id video (11 karakter) yang disimpan; diputar lewat youtube-nocookie. */
export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    youtubeId: text('youtube_id').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    active: boolean('active').notNull().default(true),
    sort: integer('sort').notNull().default(0),
    createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('videos_active_sort_idx').on(t.active, t.sort)],
);

/** Artikel / berita dari admin: teks + gambar sampul (media), tampil di landing dan /artikel. */
export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    body: text('body').notNull(),
    coverImageId: uuid('cover_image_id').references(() => media.id, { onDelete: 'set null' }),
    /** Semua gambar artikel berurutan (D-076); gambar pertama = sampul (`cover_image_id`). Detail = slider. */
    imageIds: jsonb('image_ids')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: text('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => staffUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('articles_status_published_idx').on(t.status, t.publishedAt),
    check('articles_status_ck', sql`${t.status} in ('draft', 'published')`),
  ],
);
