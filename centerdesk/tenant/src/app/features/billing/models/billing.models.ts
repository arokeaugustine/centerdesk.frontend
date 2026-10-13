export type BillingCurrency = 'NGN' | 'USD';

export interface CurrentSubscriptionPlan {
  name: string;
  monthlyPriceNaira: number;
  annualPriceNaira: number;
  // Null when this plan has no fixed USD price configured yet.
  monthlyPriceUsd: number | null;
  annualPriceUsd: number | null;
}

// A card saved with Bachs when the tenant paid; renewals in its currency charge it automatically.
export interface SavedCard {
  uid: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  currency: BillingCurrency;
}

// The automatic renewal for the current period, while it isn't settled.
export type RenewalStateName = 'scheduled' | 'processing' | 'retrying' | 'failed' | 'no-card';

export interface RenewalState {
  state: RenewalStateName;
  chargeAttempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  amount: number;
  currency: BillingCurrency;
}

export interface CurrentSubscription {
  uid: string;
  // SubscriptionStatus enum (serialized as int): Trial=0, Active=1, PastDue=2, Suspended=3, Cancelled=4, Expired=5
  status: number;
  // BillingCycle enum (serialized as int): Monthly=0, Annual=1
  billingCycle: number;
  // Set once at signup/checkout and reused for every renewal — not re-selectable afterwards.
  currency: BillingCurrency;
  startDate: string;
  renewalDate: string;
  // Charge the saved card when the period ends. Off = renew by hand from this page.
  autoRenew: boolean;
  // The saved card for this subscription's currency, if any.
  paymentMethod: SavedCard | null;
  renewal: RenewalState | null;
  plan: CurrentSubscriptionPlan;
}

export interface PlanItem {
  id: number;
  name: string;
  description: string | null;
  monthlyPriceNaira: number;
  annualPriceNaira: number;
  // Null when this plan has no fixed USD price configured yet — USD checkout should be
  // disabled for it.
  monthlyPriceUsd: number | null;
  annualPriceUsd: number | null;
  maxUsers: number;
  maxEmailDesks: number;
  maxStorageGb: number;
  hasSla: boolean;
  hasReports: boolean;
  hasApiAccess: boolean;
  sortOrder: number;
  maxUsersDisplay: string;
  maxEmailDesksDisplay: string;
}

export interface UpgradeRequest {
  planId: number;
  billingCycle: 'Monthly' | 'Annual';
  currency: BillingCurrency;
  callbackUrl: string;
}

// Returned by both /api/subscription/upgrade and /api/subscription/renew
export interface UpgradeResult {
  paymentUrl: string;
  reference: string;
  planName: string;
  billingCycle: string;
  currency: BillingCurrency;
  amount: number;
  message: string;
}

export interface VerifyResult {
  status: string; // 'paid' when confirmed; otherwise the pending invoice status
  tenantSlug?: string;
  planName?: string;
  billingCycle?: string;
  currency?: BillingCurrency;
  amount?: number;
  message: string;
}
