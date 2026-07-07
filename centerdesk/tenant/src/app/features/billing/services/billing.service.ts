import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { CurrentSubscription, PlanItem, UpgradeResult, VerifyResult } from '../models/billing.models';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getCurrentSubscription() {
    return this.http.get<ApiResult<CurrentSubscription>>(
      `${this.apiBaseUrl}/api/subscription`
    );
  }

  getPlans() {
    return this.http.get<ApiResult<PlanItem[]>>(
      `${this.apiBaseUrl}/api/plans`
    );
  }

  initiateUpgrade(planId: number, billingCycle: 'Monthly' | 'Annual') {
    return this.http.post<ApiResult<UpgradeResult>>(
      `${this.apiBaseUrl}/api/subscription/upgrade`,
      { planId, billingCycle }
    );
  }

  verifyPayment(reference: string) {
    return this.http.get<ApiResult<VerifyResult>>(
      `${this.apiBaseUrl}/api/subscription/verify/${reference}`
    );
  }
}
