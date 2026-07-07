export interface CurrentSubscriptionPlan {
  name: string;
  monthlyPriceNaira: number;
  annualPriceNaira: number;
}

export interface CurrentSubscription {
  uid: string;
  status: number;     // 1=active, 2=expired, 3=trial, 0=inactive
  billingCycle: number; // 1=monthly, 2=annual
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
}

export interface UpgradeResult {
  paymentUrl: string;
  reference: string;
  planName: string;
  billingCycle: string;
  amountNaira: number;
  message: string;
}

export interface VerifyResult {
  planName: string;
  billingCycle: string;
  amountNaira: number;
  message: string;
}
