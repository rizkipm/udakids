import { z } from 'zod';
import { DOMAINS, GRADES } from '../generator/template.js';
import type { LevelStatus } from '../scoring/quiz.js';

/**
 * Paket berbayar, harga + diskon, kode unik transfer manual, akses level, buku kas, dan komisi owner
 * (D-036). Semua uang dalam rupiah bulat (integer). Fungsi murni: waktu & acak selalu dari parameter.
 */

export const DISCOUNT_TYPES = ['none', 'percent', 'amount'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/** Kode unik ditambahkan ke harga agar transfer mudah dicocokkan: 1–499, total selalu ganjil. */
export const UNIQUE_CODE_MIN = 1;
export const UNIQUE_CODE_MAX = 499;
export const MIN_PRICE = 1_000;
export const MAX_PRICE = 100_000_000;

const isoDate = z.iso.datetime({ offset: true });
const bookRef = z.strictObject({ domain: z.enum(DOMAINS), grade: z.enum(GRADES) });

export const packageInputSchema = z
  .strictObject({
    name: z.string().trim().min(3, 'nama paket minimal 3 karakter').max(80),
    description: z.string().trim().max(300).default(''),
    /** `all` = semua buku (termasuk buku baru); `books` = buku tertentu. */
    scope: z.enum(['all', 'books']),
    books: z.array(bookRef).max(50).default([]),
    /** `null` = selamanya. */
    durationDays: z.number().int().min(1).max(3650).nullable(),
    price: z.number().int().min(MIN_PRICE).max(MAX_PRICE),
    discountType: z.enum(DISCOUNT_TYPES).default('none'),
    discountValue: z.number().int().min(0).default(0),
    discountStartsAt: isoDate.nullable().default(null),
    discountEndsAt: isoDate.nullable().default(null),
    active: z.boolean().default(true),
    sort: z.number().int().min(0).max(999).default(0),
  })
  .superRefine((p, ctx) => {
    if (p.scope === 'books' && p.books.length === 0)
      ctx.addIssue({ code: 'custom', path: ['books'], message: 'pilih minimal satu buku' });
    if (p.discountType === 'percent' && (p.discountValue < 1 || p.discountValue > 90))
      ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'diskon persen 1–90' });
    if (
      p.discountType === 'amount' &&
      (p.discountValue < 1 || p.price - p.discountValue < MIN_PRICE)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['discountValue'],
        message: `harga setelah diskon minimal Rp${MIN_PRICE.toLocaleString('id-ID')}`,
      });
    if (p.discountStartsAt && p.discountEndsAt && p.discountEndsAt <= p.discountStartsAt)
      ctx.addIssue({
        code: 'custom',
        path: ['discountEndsAt'],
        message: 'akhir diskon harus setelah awal',
      });
  });
export type PackageInput = z.infer<typeof packageInputSchema>;

export type Pricing = {
  normal: number;
  discount: number;
  final: number;
  /** Diskon sedang berlaku (sesuai periode). */
  discountActive: boolean;
};

type Priced = Pick<
  PackageInput,
  'price' | 'discountType' | 'discountValue' | 'discountStartsAt' | 'discountEndsAt'
>;

/** Harga normal, potongan, dan harga akhir pada waktu `now`. */
export function pricing(p: Priced, now: Date): Pricing {
  const t = now.getTime();
  const inWindow =
    (!p.discountStartsAt || Date.parse(p.discountStartsAt) <= t) &&
    (!p.discountEndsAt || Date.parse(p.discountEndsAt) > t);
  let discount = 0;
  if (inWindow && p.discountType === 'percent')
    discount = Math.floor((p.price * p.discountValue) / 100);
  if (inWindow && p.discountType === 'amount') discount = p.discountValue;
  discount = Math.max(0, Math.min(discount, p.price - MIN_PRICE));
  return { normal: p.price, discount, final: p.price - discount, discountActive: discount > 0 };
}

/**
 * Pilih kode unik 1–499 sehingga `base + kode` GANJIL dan belum dipakai pesanan lain yang masih
 * menunggu (`usedTotals`). Contoh: 35.000 → 35.111. `undefined` bila semua kode terpakai.
 */
export function pickUniqueCode(
  base: number,
  usedTotals: Iterable<number>,
  rand: () => number,
): number | undefined {
  const used = new Set(usedTotals);
  const free: number[] = [];
  for (let c = UNIQUE_CODE_MIN; c <= UNIQUE_CODE_MAX; c++) {
    if ((base + c) % 2 === 1 && !used.has(base + c)) free.push(c);
  }
  if (free.length === 0) return undefined;
  return free[Math.min(free.length - 1, Math.floor(rand() * free.length))];
}

// ---------------------------------------------------------------- akses level berbayar

export type Access = {
  /** Kunci berbayar aktif (diatur admin). */
  paywall: boolean;
  /** Level 1..freeLevels tiap topik gratis. */
  freeLevels: number;
  /** Punya akses semua buku. */
  all: boolean;
  /** Buku yang sudah dibuka: `domain/grade`. */
  books: readonly string[];
};

export const FREE_ACCESS: Access = { paywall: false, freeLevels: 0, all: true, books: [] };

export const bookKey = (b: { domain: string; grade: string }) => `${b.domain}/${b.grade}`;

/** Level ini perlu dibuka dengan paket? (level > freeLevels di buku yang belum dibeli). */
export function needsPurchase(
  access: Access,
  node: { domain: string; grade: string; order: number },
): boolean {
  if (!access.paywall || access.all) return false;
  if (node.order <= access.freeLevels) return false;
  return !access.books.includes(bookKey(node));
}

export type PlayStatus = LevelStatus | 'paid';

/** Status level + kunci berbayar: level berbayar yang belum dibeli menjadi `paid`. */
export function withAccess(
  statuses: Readonly<Record<string, LevelStatus>>,
  nodes: readonly { id: string; domain: string; grade: string; order: number }[],
  access: Access,
): Record<string, PlayStatus> {
  const out: Record<string, PlayStatus> = { ...statuses };
  for (const n of nodes) if (n.id in out && needsPurchase(access, n)) out[n.id] = 'paid';
  return out;
}

/** Hak akses dari paket yang sudah dibayar dan masih berlaku pada `now`. */
export function accessFrom(
  base: { paywall: boolean; freeLevels: number },
  entitlements: readonly {
    scope: 'all' | 'books';
    books: readonly { domain: string; grade: string }[];
    endsAt: string | null;
  }[],
  now: Date,
): Access {
  const live = entitlements.filter((e) => !e.endsAt || Date.parse(e.endsAt) > now.getTime());
  return {
    paywall: base.paywall,
    freeLevels: base.freeLevels,
    all: live.some((e) => e.scope === 'all'),
    books: [...new Set(live.flatMap((e) => e.books.map(bookKey)))].sort(),
  };
}

/** Akhir masa aktif: diperpanjang dari masa aktif paket yang sama yang masih berjalan. */
export function entitlementEnd(
  durationDays: number | null,
  now: Date,
  currentEnd?: string | null,
): string | null {
  if (durationDays === null) return null;
  const from =
    currentEnd && Date.parse(currentEnd) > now.getTime() ? Date.parse(currentEnd) : now.getTime();
  return new Date(from + durationDays * 86_400_000).toISOString();
}

// ---------------------------------------------------------------- buku kas & komisi

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'bulan YYYY-MM');
export const monthSchema = month;

export const cashEntryInputSchema = z.strictObject({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'tanggal YYYY-MM-DD'),
  type: z.enum(['in', 'out']),
  category: z.string().trim().min(2).max(40),
  amount: z.number().int().min(1).max(10_000_000_000),
  description: z.string().trim().max(200).default(''),
});
export type CashEntryInput = z.infer<typeof cashEntryInputSchema>;

/** Persen komisi disimpan dalam basis poin (1% = 100) agar bisa 12,5%. */
export const ownerInputSchema = z.strictObject({
  name: z.string().trim().min(2).max(60),
  percentBp: z.number().int().min(1).max(10_000),
  active: z.boolean().default(true),
});
export type OwnerInput = z.infer<typeof ownerInputSchema>;

export type MonthSummary = { month: string; income: number; expense: number; net: number };

/** Pemasukan, pengeluaran, dan laba bersih satu bulan (tanggal `YYYY-MM-DD`). */
export function monthSummary(
  entries: readonly { date: string; type: 'in' | 'out'; amount: number }[],
  m: string,
): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (!e.date.startsWith(`${m}-`)) continue;
    if (e.type === 'in') income += e.amount;
    else expense += e.amount;
  }
  return { month: m, income, expense, net: income - expense };
}

/** Total persen owner aktif tidak boleh lebih dari 100%. */
export const totalPercentBp = (owners: readonly { percentBp: number; active: boolean }[]) =>
  owners.filter((o) => o.active).reduce((a, o) => a + o.percentBp, 0);

/**
 * Komisi tiap owner = persen × laba bersih bulan itu (dibulatkan ke bawah). Laba ≤ 0 → komisi 0.
 */
export function commissionShares<T extends { id: string; percentBp: number; active: boolean }>(
  net: number,
  owners: readonly T[],
): { owner: T; amount: number }[] {
  return owners
    .filter((o) => o.active)
    .map((owner) => ({
      owner,
      amount: net > 0 ? Math.floor((net * owner.percentBp) / 10_000) : 0,
    }));
}

/** Format rupiah untuk tampilan, mis. 35111 → "Rp35.111". */
export const formatRupiah = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;

// ---------------------------------------------------------------- input lain (admin & orang tua)

export const paymentMethodInputSchema = z.strictObject({
  kind: z.enum(['bank', 'ewallet']),
  /** Nama bank / e-wallet, mis. "BCA", "GoPay". */
  provider: z.string().trim().min(2).max(40),
  accountNumber: z
    .string()
    .trim()
    .min(4)
    .max(40)
    .regex(/^[0-9A-Za-z .-]+$/, 'nomor rekening/akun hanya angka, huruf, spasi, titik, strip'),
  accountName: z.string().trim().min(2).max(60),
  instructions: z.string().trim().max(300).default(''),
  active: z.boolean().default(true),
  sort: z.number().int().min(0).max(999).default(0),
});
export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;

export const orderCreateSchema = z.strictObject({ packageId: z.uuid(), methodId: z.uuid() });
export const orderRejectSchema = z.strictObject({ reason: z.string().trim().min(3).max(200) });

export const ORDER_STATUSES = [
  'awaiting_payment',
  'awaiting_review',
  'paid',
  'rejected',
  'expired',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
/** Pesanan yang kode unik/totalnya masih "dipegang". */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ['awaiting_payment', 'awaiting_review'];

export const PROOF_MAX_BYTES = 2 * 1024 * 1024;
export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;

/** Kenali jenis file bukti dari isinya (bukan dari nama/ekstensi). */
export function sniffProofType(bytes: Uint8Array): (typeof PROOF_TYPES)[number] | undefined {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg';
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png';
  if (
    b(0) === 0x52 &&
    b(1) === 0x49 &&
    b(2) === 0x46 &&
    b(3) === 0x46 &&
    b(8) === 0x57 &&
    b(9) === 0x45 &&
    b(10) === 0x42 &&
    b(11) === 0x50
  )
    return 'image/webp';
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return 'application/pdf';
  return undefined;
}

export const billingSettingsSchema = z.strictObject({
  paywall: z.boolean(),
  freeLevels: z.number().int().min(0).max(10),
  orderExpiryHours: z.number().int().min(1).max(168),
  /** Anak di kelas workshop yang masih buka mendapat akses penuh (sekolah/event sudah membayar). */
  classFullAccess: z.boolean(),
});
export type BillingSettings = z.infer<typeof billingSettingsSchema>;
export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  paywall: true,
  freeLevels: 2,
  orderExpiryHours: 24,
  classFullAccess: true,
};

// ---------------------------------------------------------------- status Free / Premium (D-041)

export type EntitlementLike = {
  scope: 'all' | 'books' | string;
  books: readonly { domain: string; grade: string }[];
  endsAt: string | null;
  source?: 'purchase' | 'admin' | string;
};
export type PlanTier = 'premium' | 'books' | 'free';
export type PlanStatus = {
  tier: PlanTier;
  /** Asal Premium/paket yang paling lama berlaku. */
  source: 'purchase' | 'admin' | null;
  /** `null` = selamanya (bila tier ≠ free). */
  endsAt: string | null;
  books: string[];
};

/**
 * Status langganan dari hak akses yang masih berlaku: Premium (semua buku), Paket buku (sebagian), atau
 * Free (hanya level gratis). Untuk anak, gabungkan hak keluarga + hak anak itu sendiri.
 */
export function planStatus(entitlements: readonly EntitlementLike[], now: Date): PlanStatus {
  const t = now.getTime();
  const live = entitlements.filter((e) => !e.endsAt || Date.parse(e.endsAt) > t);
  const pick = (list: readonly EntitlementLike[]) =>
    [...list].sort((a, b) =>
      a.endsAt === null ? -1 : b.endsAt === null ? 1 : Date.parse(b.endsAt) - Date.parse(a.endsAt),
    )[0];
  const all = live.filter((e) => e.scope === 'all');
  if (all.length) {
    const best = pick(all)!;
    return {
      tier: 'premium',
      source: best.source === 'admin' ? 'admin' : 'purchase',
      endsAt: best.endsAt,
      books: [],
    };
  }
  if (live.length) {
    const best = pick(live)!;
    return {
      tier: 'books',
      source: best.source === 'admin' ? 'admin' : 'purchase',
      endsAt: best.endsAt,
      books: [...new Set(live.flatMap((e) => e.books.map(bookKey)))].sort(),
    };
  }
  return { tier: 'free', source: null, endsAt: null, books: [] };
}

/**
 * Admin memberi Premium (semua buku) ke SATU anak — tanpa pembayaran/buku kas (D-041). Anak di keluarga
 * diatur per anak (saudaranya tidak ikut), anak yang daftar sendiri per orang.
 */
export const premiumGrantSchema = z.strictObject({
  childId: z.uuid(),
  /** `null` = selamanya. */
  durationDays: z.number().int().min(1).max(3650).nullable(),
  note: z.string().trim().max(200).default(''),
});
export type PremiumGrant = z.infer<typeof premiumGrantSchema>;

/** Filter daftar pengguna admin (keluarga / anak) dengan paging. */
export const userListQuerySchema = z.object({
  search: z.string().trim().max(80).default(''),
  status: z.enum(['all', 'premium', 'free']).default('all'),
  active: z.enum(['all', 'active', 'inactive']).default('all'),
  type: z.enum(['all', 'family', 'self', 'class']).default('all'),
  sort: z.enum(['newest', 'oldest', 'name', 'recent']).default('newest'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [10, 20, 50].includes(n), 'pageSize 10/20/50')
    .default(20),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
