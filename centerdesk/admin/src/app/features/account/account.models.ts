export type BillingCurrency = 'NGN' | 'USD';

/** GET /api/account/workspace */
export interface Workspace {
  uid: string;
  name: string;
  slug: string;
  workspaceUrl: string;
  loginUrl: string;
  status: string; // TenantStatus: Pending | Active | Suspended | Cancelled
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  activatedAt: string | null;
}

export interface CurrentSubscriptionPlan {
  name: string;
  monthlyPriceNaira: number;
  annualPriceNaira: number;
  monthlyPriceUsd: number | null;
  annualPriceUsd: number | null;
}

/** A card saved with Bachs at a payment; renewals in its currency charge it automatically. */
export interface SavedCard {
  uid: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  currency: BillingCurrency;
}

export type RenewalStateName = 'scheduled' | 'processing' | 'retrying' | 'failed' | 'no-card';

export interface RenewalState {
  state: RenewalStateName;
  chargeAttempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  amount: number;
  currency: BillingCurrency;
}

/** GET /api/subscription */
export interface CurrentSubscription {
  uid: string;
  /** SubscriptionStatus: Trial=0, Active=1, PastDue=2, Suspended=3, Cancelled=4, Expired=5 */
  status: number;
  /** BillingCycle: Monthly=0, Annual=1 */
  billingCycle: number;
  currency: BillingCurrency;
  startDate: string;
  renewalDate: string;
  trialEndDate: string | null;
  /** Set when the owner cancelled: the subscription runs to renewalDate, then ends. */
  cancelledAt: string | null;
  autoRenew: boolean;
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

/** POST /api/subscription/upgrade and /renew */
export interface CheckoutStart {
  paymentUrl: string;
  reference: string;
  planName: string;
  billingCycle: string;
  currency: BillingCurrency;
  amount: number;
  message: string;
}

/** GET /api/billing/verify */
export interface VerifyResult {
  status: string; // 'paid' once confirmed
  tenantSlug?: string;
  planName?: string;
  billingCycle?: string;
  currency?: BillingCurrency;
  amount?: number;
  message: string;
}

export const SUBSCRIPTION_STATUS: Record<number, string> = {
  0: 'Free trial',
  1: 'Active',
  2: 'Past due',
  3: 'Suspended',
  4: 'Cancelled',
  5: 'Expired',
};
