/** `GET /admin/insights` (D-039). */
export type AdminInsights = {
  days: number;
  month: string;
  updatedAt: string;
  users: {
    parents: number;
    children: number;
    selfOnly: number;
    inClass: number;
    admins: number;
    facilitators: number;
    newParents: number;
    newChildren: number;
    active7: number;
    activeN: number;
  };
  sales: {
    revenueTotal: number;
    revenueMonth: number;
    revenuePrevMonth: number;
    paid: number;
    paidMonth: number;
    orders: number;
    awaitingReview: number;
    awaitingPayment: number;
    rejected: number;
    expired: number;
    cancelled: number;
    avgOrder: number;
    successRate: number | null;
    payingFamilies: number;
    payingRate: number | null;
    discountGiven: number;
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
    month: { income: number; expense: number; net: number };
    year: { income: number; expense: number; net: number };
  };
  learning: {
    rounds7: number;
    rounds: number;
    passRate: number | null;
    avgScore: number;
    minutes: number;
    learners: number;
    topBooks: { title: string; domain: string; grade: string; rounds: number; passRate: number }[];
  };
  classes: { open: number; total: number; students: number };
  series: { date: string; revenue: number; orders: number; rounds: number; newUsers: number }[];
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
