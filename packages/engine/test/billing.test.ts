import { describe, expect, it } from 'vitest';
import {
  accessFrom,
  billingSettingsSchema,
  commissionShares,
  DEFAULT_BILLING_SETTINGS,
  entitlementEnd,
  formatRupiah,
  monthSummary,
  needsPurchase,
  packageInputSchema,
  pickUniqueCode,
  pricing,
  sniffProofType,
  totalPercentBp,
  UNIQUE_CODE_MAX,
  withAccess,
  createRng,
  type Access,
} from '../src/index.js';

const base = {
  name: 'Akses Semua',
  scope: 'all' as const,
  durationDays: null,
  price: 35_000,
};

describe('paket & diskon (D-036)', () => {
  it('skema: default diskon none; buku wajib bila scope books', () => {
    const p = packageInputSchema.parse(base);
    expect(p).toMatchObject({ discountType: 'none', discountValue: 0, active: true, books: [] });
    expect(packageInputSchema.safeParse({ ...base, scope: 'books' }).success).toBe(false);
    expect(
      packageInputSchema.safeParse({
        ...base,
        scope: 'books',
        books: [{ domain: 'math', grade: 'sd1' }],
      }).success,
    ).toBe(true);
  });

  it('skema menolak diskon yang tidak masuk akal', () => {
    const bad = (x: object) => packageInputSchema.safeParse({ ...base, ...x }).success;
    expect(bad({ discountType: 'percent', discountValue: 0 })).toBe(false);
    expect(bad({ discountType: 'percent', discountValue: 95 })).toBe(false);
    expect(bad({ discountType: 'amount', discountValue: 34_500 })).toBe(false); // sisa < Rp1.000
    expect(bad({ price: 500 })).toBe(false);
    expect(bad({ price: 35_000.5 })).toBe(false);
    expect(
      bad({
        discountType: 'percent',
        discountValue: 20,
        discountStartsAt: '2026-10-10T00:00:00+07:00',
        discountEndsAt: '2026-10-01T00:00:00+07:00',
      }),
    ).toBe(false);
  });

  it('harga normal, potongan, harga akhir', () => {
    const now = new Date('2026-10-05T00:00:00Z');
    expect(pricing(packageInputSchema.parse(base), now)).toEqual({
      normal: 35_000,
      discount: 0,
      final: 35_000,
      discountActive: false,
    });
    const pct = packageInputSchema.parse({ ...base, discountType: 'percent', discountValue: 20 });
    expect(pricing(pct, now)).toMatchObject({
      discount: 7_000,
      final: 28_000,
      discountActive: true,
    });
    const amt = packageInputSchema.parse({
      ...base,
      discountType: 'amount',
      discountValue: 10_000,
    });
    expect(pricing(amt, now).final).toBe(25_000);
  });

  it('diskon hanya berlaku di dalam periodenya', () => {
    const p = packageInputSchema.parse({
      ...base,
      discountType: 'percent',
      discountValue: 50,
      discountStartsAt: '2026-10-01T00:00:00Z',
      discountEndsAt: '2026-10-08T00:00:00Z',
    });
    expect(pricing(p, new Date('2026-09-30T23:59:59Z')).discountActive).toBe(false);
    expect(pricing(p, new Date('2026-10-01T00:00:00Z')).final).toBe(17_500);
    expect(pricing(p, new Date('2026-10-08T00:00:00Z')).final).toBe(35_000);
  });
});

describe('kode unik transfer (D-036)', () => {
  it('1–499 dan total selalu ganjil, mis. 35.000 → 35.xxx ganjil', () => {
    const rand = (() => {
      const r = createRng(7);
      return () => r.next();
    })();
    for (const price of [35_000, 35_001, 49_900, 1_000]) {
      for (let i = 0; i < 200; i++) {
        const c = pickUniqueCode(price, [], rand)!;
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(UNIQUE_CODE_MAX);
        expect((price + c) % 2).toBe(1);
      }
    }
  });

  it('tidak memakai total yang sedang dipegang pesanan lain; habis → undefined', () => {
    const used = new Set<number>();
    const rand = (() => {
      const r = createRng(3);
      return () => r.next();
    })();
    for (let i = 0; i < 250; i++) {
      const c = pickUniqueCode(35_000, used, rand);
      expect(c).toBeDefined();
      expect(used.has(35_000 + c!)).toBe(false);
      used.add(35_000 + c!);
    }
    expect(pickUniqueCode(35_000, used, rand)).toBeUndefined(); // 250 kode ganjil 1..499 habis
    expect(pickUniqueCode(36_000, used, rand)).toBeDefined(); // harga lain tidak terpengaruh
  });

  it('rand = 0.999… tetap di dalam batas', () => {
    expect(pickUniqueCode(35_000, [], () => 0.999999999)).toBe(499);
    expect(pickUniqueCode(35_000, [], () => 0)).toBe(1);
  });
});

describe('akses level berbayar', () => {
  const access = (x: Partial<Access> = {}): Access => ({
    paywall: true,
    freeLevels: 2,
    all: false,
    books: [],
    ...x,
  });
  const node = (order: number, grade = 'sd1') => ({ domain: 'math', grade, order });

  it('level 1–2 gratis, level 3+ perlu paket', () => {
    expect(needsPurchase(access(), node(1))).toBe(false);
    expect(needsPurchase(access(), node(2))).toBe(false);
    expect(needsPurchase(access(), node(3))).toBe(true);
    expect(needsPurchase(access({ freeLevels: 0 }), node(1))).toBe(true);
  });

  it('paket semua / buku tertentu membuka; paywall mati = semua terbuka', () => {
    expect(needsPurchase(access({ all: true }), node(9))).toBe(false);
    expect(needsPurchase(access({ books: ['math/sd1'] }), node(9))).toBe(false);
    expect(needsPurchase(access({ books: ['math/sd1'] }), node(9, 'sd2'))).toBe(true);
    expect(needsPurchase(access({ paywall: false }), node(9))).toBe(false);
  });

  it('withAccess menandai level berbayar sebagai paid, status lain tetap', () => {
    const nodes = [1, 2, 3].map((o) => ({ id: `l${o}`, ...node(o) }));
    const st = withAccess({ l1: 'passed', l2: 'open', l3: 'locked' }, nodes, access());
    expect(st).toEqual({ l1: 'passed', l2: 'open', l3: 'paid' });
  });

  it('accessFrom: gabungan hak yang masih berlaku', () => {
    const now = new Date('2026-10-05T00:00:00Z');
    const a = accessFrom(
      { paywall: true, freeLevels: 2 },
      [
        { scope: 'books', books: [{ domain: 'sains', grade: 'tk' }], endsAt: null },
        {
          scope: 'books',
          books: [{ domain: 'math', grade: 'sd1' }],
          endsAt: '2026-10-01T00:00:00Z',
        },
        { scope: 'all', books: [], endsAt: '2026-10-04T00:00:00Z' },
      ],
      now,
    );
    expect(a).toEqual({ paywall: true, freeLevels: 2, all: false, books: ['sains/tk'] });
  });

  it('masa aktif: selamanya = null; diperpanjang dari akhir yang masih berjalan', () => {
    const now = new Date('2026-10-01T00:00:00Z');
    expect(entitlementEnd(null, now)).toBeNull();
    expect(entitlementEnd(30, now)).toBe('2026-10-31T00:00:00.000Z');
    expect(entitlementEnd(30, now, '2026-10-11T00:00:00.000Z')).toBe('2026-11-10T00:00:00.000Z');
    expect(entitlementEnd(30, now, '2026-09-01T00:00:00.000Z')).toBe('2026-10-31T00:00:00.000Z');
  });

  it('pengaturan default: paywall aktif, 2 level gratis', () => {
    expect(billingSettingsSchema.parse(DEFAULT_BILLING_SETTINGS)).toEqual({
      paywall: true,
      freeLevels: 2,
      orderExpiryHours: 24,
      classFullAccess: true,
    });
  });
});

describe('buku kas & komisi owner', () => {
  const entries = [
    { date: '2026-10-01', type: 'in' as const, amount: 35_111 },
    { date: '2026-10-15', type: 'in' as const, amount: 70_223 },
    { date: '2026-10-20', type: 'out' as const, amount: 50_000 },
    { date: '2026-11-01', type: 'in' as const, amount: 99_999 },
    { date: '2026-01-10', type: 'out' as const, amount: 1 }, // bulan lain
  ];

  it('laba bersih per bulan', () => {
    expect(monthSummary(entries, '2026-10')).toEqual({
      month: '2026-10',
      income: 105_334,
      expense: 50_000,
      net: 55_334,
    });
    expect(monthSummary(entries, '2026-12')).toEqual({
      month: '2026-12',
      income: 0,
      expense: 0,
      net: 0,
    });
  });

  it('komisi = persen × laba bersih (dibulatkan ke bawah); rugi → 0', () => {
    const owners = [
      { id: 'a', percentBp: 1_250, active: true }, // 12,5%
      { id: 'b', percentBp: 3_000, active: true },
      { id: 'c', percentBp: 5_000, active: false },
    ];
    expect(commissionShares(55_334, owners).map((s) => [s.owner.id, s.amount])).toEqual([
      ['a', 6_916],
      ['b', 16_600],
    ]);
    expect(commissionShares(-10_000, owners).every((s) => s.amount === 0)).toBe(true);
    expect(totalPercentBp(owners)).toBe(4_250);
  });

  it('format rupiah', () => {
    expect(formatRupiah(35_111)).toBe('Rp35.111');
  });
});

describe('bukti transfer', () => {
  it('jenis file dikenali dari isi', () => {
    expect(sniffProofType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffProofType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe('image/png');
    expect(sniffProofType(new TextEncoder().encode('RIFF....WEBPVP8 '))).toBe('image/webp');
    expect(sniffProofType(new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(sniffProofType(new TextEncoder().encode('<html>'))).toBeUndefined();
    expect(sniffProofType(new Uint8Array())).toBeUndefined();
  });
});

describe('status Free / Premium (D-041)', () => {
  const now = new Date('2026-10-05T00:00:00Z');
  it('premium (semua buku) > paket buku > free; yang kedaluwarsa diabaikan', async () => {
    const { planStatus } = await import('../src/index.js');
    expect(planStatus([], now)).toEqual({ tier: 'free', source: null, endsAt: null, books: [] });
    expect(
      planStatus(
        [{ scope: 'books', books: [{ domain: 'math', grade: 'sd1' }], endsAt: null }],
        now,
      ),
    ).toMatchObject({ tier: 'books', books: ['math/sd1'], endsAt: null, source: 'purchase' });
    expect(
      planStatus(
        [
          { scope: 'all', books: [], endsAt: '2026-10-01T00:00:00Z', source: 'admin' },
          { scope: 'books', books: [{ domain: 'math', grade: 'sd1' }], endsAt: null },
        ],
        now,
      ).tier,
    ).toBe('books');
    expect(
      planStatus(
        [
          { scope: 'all', books: [], endsAt: '2026-11-01T00:00:00Z', source: 'purchase' },
          { scope: 'all', books: [], endsAt: null, source: 'admin' },
        ],
        now,
      ),
    ).toEqual({ tier: 'premium', source: 'admin', endsAt: null, books: [] });
  });

  it('pemberian premium: hanya per anak (bukan sekeluarga)', async () => {
    const { premiumGrantSchema } = await import('../src/index.js');
    const id = '00000000-0000-4000-8000-000000000001';
    expect(premiumGrantSchema.safeParse({ childId: id, durationDays: 30 }).success).toBe(true);
    expect(premiumGrantSchema.safeParse({ childId: id, durationDays: null }).success).toBe(true);
    expect(premiumGrantSchema.safeParse({ parentId: id, durationDays: null }).success).toBe(false);
    expect(premiumGrantSchema.safeParse({ durationDays: null }).success).toBe(false);
  });
});
