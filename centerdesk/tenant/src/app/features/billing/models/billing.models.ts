export interface CurrentSubscriptionPlan {
  name: string;
  monthlyPriceNaira: number;
  annualPriceNaira: number;
}

export interface CurrentSubscription {
  uid: string;
  // SubscriptionStatus enum (serialized as int): Trial=0, Active=1, PastDue=2, Suspended=3, Cancelled=4, Expired=5
  status: number;
  // BillingCycle enum (serialized as int): Monthly=0, Annual=1
  billingCycle: number;
  startDate: string;
  renewalDate: string;
  plan: CurrentSubscriptionPlan;
}

export interface PlanItem {
  id: number;
  name: string;
  description: string | null;
  monthlyPriceNaira: number;
  annualPriceNaira: number;
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
  callbackUrl: string;
}

// Returned by both /api/subscription/upgrade and /api/subscription/renew
export interface UpgradeResult {
  paymentUrl: string;
  reference: string;
  planName: string;
  billingCycle: string;
  amountNaira: number;
  message: string;
}

export interface VerifyResult {
  status: string; // 'paid' when confirmed; otherwise the pending invoice status
  tenantSlug?: string;
  planName?: string;
  billingCycle?: string;
  amountNaira?: number;
  message: string;
}
