import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
      { planId, billingCycle, callbackUrl: this.callbackUrl() }
    );
  }

  renew() {
    return this.http.post<ApiResult<UpgradeResult>>(
      `${this.apiBaseUrl}/api/subscription/renew`,
      { callbackUrl: this.callbackUrl() }
    );
  }

  verifyPayment(reference: string) {
    const params = new HttpParams().set('reference', reference);
    return this.http.get<ApiResult<VerifyResult>>(
      `${this.apiBaseUrl}/api/billing/verify`,
      { params }
    );
  }

  // The current tenant's own origin (subdomain) + callback route. Paystack redirects
  // the user's browser back here after payment, so it must match the tenant host.
  private callbackUrl(): string {
    return `${window.location.origin}/billing/payment-callback`;
  }
}
