export interface BillingPlan {
  _id: string;
  name: string;
  markupRate?: number;
  isDefault: boolean;
  createdAt: Date | string;
}

export interface TeamBillingPlan {
  _id: string;
  team: string;
  plan: string | BillingPlan;
  effectiveFrom: Date | string;
  createdAt: Date | string;
}

export interface BillingPeriod {
  _id: string;
  team: string;
  plan: string;
  markupRate: number;
  startAt: Date | string;
  endAt: Date | string;
  status: "open" | "closed";
  openingBalance?: number;
  creditsAdded?: number;
  rawCost?: number;
  billedAmount?: number;
  closingBalance?: number;
  closedAt?: Date | string;
}

export interface BillingLedgerEntry {
  _id: string;
  team: string;
  user?: string;
  direction: "credit" | "debit";
  amount: number;
  currency: string;
  rawAmount?: number;
  markupRateApplied?: number;
  billedAmount?: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  providerCost?: number;
  source: string;
  sourceId?: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  isLegacy: boolean;
  legacyNotes?: string;
  createdAt: Date | string;
}

export interface TeamBillingBalance {
  _id: string;
  team: string;
  availableBalance: number;
  totalCredits: number;
  totalRawCosts: number;
  totalBilledCosts: number;
  lastLedgerEntryAt?: Date | string;
  lastReconciledAt?: Date | string;
  version?: number;
  updatedAt: Date | string;
}

export interface PendingPlanChange {
  plan: BillingPlan;
  effectiveFrom: Date | string;
}

export interface RunningTotals {
  totalCredits?: number;
  totalRawCosts?: number;
  totalBilledCosts?: number;
}

export interface BalanceSummary {
  balance: number;
  credits: number;
  costs?: number;
  markedUpCosts: number;
  plan: BillingPlan;
}

export interface BillingPeriodReport {
  _id: string;
  team: string;
  startAt: Date | string;
  endAt: Date | string;
  openingBalance: number;
  creditsAdded: number;
  rawCost?: number;
  billedAmount: number;
  closingBalance: number;
  closedAt: Date | string;
}
