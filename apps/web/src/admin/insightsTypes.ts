import type { Period } from './period';

/** `GET /admin/insights?days=|year=&month=` (D-039, D-099, D-100). */
export type AdminInsights = {
  period: Period;
  /** Tahun data pertama (untuk pilihan filter tahun). */
  firstYear: number | null;
  updatedAt: string;
  users: {
    /** Per akhir periode (akun aktif). */
    parents: number;
    children: number;
    selfOnly: number;
    inClass: number;
    admins: number;
    facilitators: number;
    /** Daftar di dalam periode. */
    newParents: number;
    newChildren: number;
    /** Saat ini: anak aktif 7 hari terakhir. */
    active7: number;
  };
  sales: {
    revenueTotal: number;
    revenue: number;
    revenuePrev: number;
    paid: number;
    paidPrev: number;
    /** Pesanan yang dibuat di periode ini, menurut statusnya sekarang. */
    orders: number;
    awaitingReview: number;
    awaitingPayment: number;
    rejected: number;
    expired: number;
    cancelled: number;
    createdPaid: number;
    avgOrder: number;
    successRate: number | null;
    payingFamilies: number;
    payingRate: number | null;
    discountGiven: number;
    /** Kode unik transfer yang ikut dalam pendapatan periode. */
    uniqueCode: number;
    /** Antrean saat ini (tidak mengikuti filter). */
    queue: { review: number; payment: number };
    review: {
      reviewed: number;
      medianHours: number | null;
      p90Hours: number | null;
      oldestPendingHours: number | null;
    };
    topPackages: { name: string; sold: number; revenue: number }[];
  };
  recentOrders: {
    id: string;
    number: string;
    amount: number;
    status: string;
    createdAt: string;
    package: string;
    parentName: string;
  }[];
  finance: {
    period: { income: number; expense: number; net: number };
    year: { year: number; income: number; expense: number; net: number };
  };
  learning: {
    rounds: number;
    roundsPrev: number;
    passRate: number | null;
    avgScore: number;
    minutes: number;
    learners: number;
    learnersPrev: number;
    topBooks: { title: string; domain: string; grade: string; rounds: number; passRate: number }[];
    /** Anak periode pembanding yang kembali bermain di periode ini. */
    retention: { prev: number; returned: number; fresh: number; rate: number | null };
    domains: { domain: string; rounds: number; learners: number; passRate: number }[];
    /** Jumlah ronde per kelompok skor 0–9, 10–19, …, 90–100. */
    scoreBands: number[];
    /** Kohort minggu ronde pertama; `active[w]` = anak yang bermain di minggu ke-w. */
    cohorts: { week: string; size: number; active: number[] }[];
    /** 7 baris (Senin..Minggu) × 24 jam, waktu Jakarta. */
    heatmap: number[][];
  };
  /** Keluarga yang daftar di periode ini. */
  funnel: {
    registered: number;
    verified: number;
    withChild: number;
    active: number;
    paying: number;
  };
  classes: { open: number; total: number; students: number };
  /** Per hari ("YYYY-MM-DD") atau per bulan ("YYYY-MM") sesuai `period.bucket`. */
  series: {
    date: string;
    revenue: number;
    paid: number;
    orders: number;
    rounds: number;
    passed: number;
    learners: number;
    newParents: number;
    newChildren: number;
    newUsers: number;
  }[];
  /** 12 bulan yang berakhir di bulan akhir periode. */
  months: {
    month: string;
    revenue: number;
    paid: number;
    newParents: number;
    rounds: number;
    learners: number;
    income: number;
    expense: number;
  }[];
};

/** `GET /facilitator/insights` (D-039). */
export type FacilitatorInsights = {
  totals: {
    classes: number;
    students: number;
    active7: number;
    rounds7: number;
    passRate7: number | null;
  };
  classes: {
    id: string;
    code: string;
    eventName: string;
    frozen: boolean;
    closed: boolean;
    students: number;
    active7: number;
    rounds7: number;
    avgScore7: number | null;
    passRate7: number | null;
  }[];
  series: { date: string; rounds: number }[];
  needsHelp: {
    childId: string;
    nickname: string;
    momoColor: string;
    className: string;
    level: string;
    best: number;
    attempts: number;
  }[];
  recent: {
    nickname: string;
    momoColor: string;
    className: string;
    level: string;
    score: number;
    ts: string;
  }[];
};
