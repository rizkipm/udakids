import type {
  BillingSettings,
  DiscountType,
  DOMAINS,
  GRADES,
  MonthSummary,
  OrderStatus,
  Pricing,
  VoiceSettings,
} from '@little-coder/engine';

/** Bentuk respons API billing, keuangan, dan suara Momo untuk area admin (D-035, D-036). */

export type { BillingSettings, VoiceSettings };

export type BookRef = { domain: (typeof DOMAINS)[number]; grade: (typeof GRADES)[number] };

export type PackageRow = {
  id: string;
  name: string;
  description: string;
  scope: 'all' | 'books';
  books: BookRef[];
  durationDays: number | null;
  price: number;
  discountType: DiscountType;
  discountValue: number;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  active: boolean;
  sort: number;
  pricing: Pricing;
  /** Jumlah pesanan lunas (hanya di daftar admin). */
  sold?: number;
};

export type PackageDeleteResult = { deleted: boolean; deactivated: boolean };

export type PaymentMethodRow = {
  id: string;
  kind: 'bank' | 'ewallet';
  provider: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  active: boolean;
  sort: number;
  createdAt: string;
};

export type OrderRow = {
  id: string;
  number: string;
  parentId: string;
  packageId: string | null;
  packageSnapshot: {
    name: string;
    scope: 'all' | 'books';
    books: BookRef[];
    durationDays: number | null;
  };
  methodSnapshot: {
    kind: 'bank' | 'ewallet';
    provider: string;
    accountNumber: string;
    accountName: string;
    instructions: string;
  };
  priceNormal: number;
  discount: number;
  uniqueCode: number;
  amount: number;
  status: OrderStatus;
  expiresAt: string;
  proofMime: string | null;
  proofAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  createdAt: string;
  parentName?: string;
  parentEmail?: string;
  /** Follow up email untuk pesanan belum dibayar: jumlah & waktu terakhir (daftar admin). */
  followUps?: number;
  lastFollowUpAt?: string | null;
};

export type CashEntry = {
  id: string;
  date: string;
  type: 'in' | 'out';
  category: string;
  amount: number;
  description: string;
  orderId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CashMonth = { month: string; summary: MonthSummary; entries: CashEntry[] };

export type FinanceYear = {
  year: number;
  months: MonthSummary[];
  total: { income: number; expense: number; net: number };
};

export type Owner = {
  id: string;
  name: string;
  percentBp: number;
  active: boolean;
  createdAt: string;
};

export type CommissionShare = {
  id: string | null;
  ownerId: string | null;
  ownerName: string;
  percentBp: number;
  net: number;
  amount: number;
  paidAt: string | null;
};

export type Commission = {
  month: string;
  summary: MonthSummary;
  closed: boolean;
  canClose?: boolean;
  shares: CommissionShare[];
};

export type VoiceLine = { text: string; clip: string | null };

export type VoiceOverview = {
  settings: VoiceSettings;
  providerReady: boolean;
  /** Asal API key suara (D-043): env server, diisi admin, atau belum ada. Kunci tidak pernah dikirim. */
  key?: {
    source: 'env' | 'server' | 'admin' | null;
    last4: string | null;
    updatedAt: string | null;
    unreadable?: boolean;
  };
  clips: number;
  bytes: number;
  madeToday: number;
  rev: string;
  lines: Record<string, VoiceLine>;
};

export type VoiceGenerateResult = {
  total: number;
  created: number;
  failed: number;
  skipped: number;
};
