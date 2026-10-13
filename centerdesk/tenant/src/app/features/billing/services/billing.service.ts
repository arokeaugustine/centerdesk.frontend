import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { BillingCurrency, CurrentSubscription, PlanItem, UpgradeResult, VerifyResult } from '../models/billing.models';

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

  initiateUpgrade(planId: number, billingCycle: 'Monthly' | 'Annual', currency: BillingCurrency) {
    return this.http.post<ApiResult<UpgradeResult>>(
      `${this.apiBaseUrl}/api/subscription/upgrade`,
      { planId, billingCycle, currency, callbackUrl: this.callbackUrl() }
    );
  }

  renew() {
    return this.http.post<ApiResult<UpgradeResult>>(
      `${this.apiBaseUrl}/api/subscription/renew`,
      { callbackUrl: this.callbackUrl() }
    );
  }

  // Bachs sends the customer back with ?checkout_id=…; our own reference works too.
  verifyPayment(lookup: { checkoutId?: string; reference?: string }) {
    let params = new HttpParams();
    if (lookup.checkoutId) params = params.set('checkoutId', lookup.checkoutId);
    if (lookup.reference) params = params.set('reference', lookup.reference);
    return this.http.get<ApiResult<VerifyResult>>(
      `${this.apiBaseUrl}/api/billing/verify`,
      { params }
    );
  }

  setAutoRenew(enabled: boolean) {
    return this.http.put<ApiResult<{ autoRenew: boolean }>>(
      `${this.apiBaseUrl}/api/subscription/auto-renew`,
      { enabled }
    );
  }

  removePaymentMethod(uid: string) {
    return this.http.delete<ApiResult<unknown>>(
      `${this.apiBaseUrl}/api/subscription/payment-methods/${uid}`
    );
  }

  // The current tenant's own origin (subdomain) + callback route. Bachs redirects the
  // user's browser back here after payment, so it must match the tenant host.
  private callbackUrl(): string {
    return `${window.location.origin}/billing/payment-callback`;
  }
}
