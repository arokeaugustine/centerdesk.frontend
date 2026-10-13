import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../core/config/api.config';
import { ApiResult } from '../../core/auth/auth.models';
import { SILENT_ERRORS } from '../../core/http/error.interceptor';
import { BillingCurrency, CheckoutStart, CurrentSubscription, PlanItem, VerifyResult, Workspace } from './account.models';

/**
 * The account area's API: the owner's workspace and its subscription. Calls run inside the owner's
 * workspace (the tenant interceptor adds X-Tenant-Slug); the API also checks the token belongs to it.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_BASE_URL);
  private readonly silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

  workspace() {
    return this.http.get<ApiResult<Workspace>>(`${this.api}/api/account/workspace`, this.silent());
  }

  subscription() {
    return this.http.get<ApiResult<CurrentSubscription>>(`${this.api}/api/subscription`, this.silent());
  }

  plans() {
    return this.http.get<ApiResult<PlanItem[]>>(`${this.api}/api/plans`, this.silent());
  }

  upgrade(planId: number, billingCycle: 'Monthly' | 'Annual', currency: BillingCurrency) {
    return this.http.post<ApiResult<CheckoutStart>>(`${this.api}/api/subscription/upgrade`,
      { planId, billingCycle, currency, callbackUrl: this.callbackUrl() }, this.silent());
  }

  renew() {
    return this.http.post<ApiResult<CheckoutStart>>(`${this.api}/api/subscription/renew`,
      { callbackUrl: this.callbackUrl() }, this.silent());
  }

  cancel(reason: string) {
    return this.http.post<ApiResult<{ accessUntil: string; message: string }>>(`${this.api}/api/subscription/cancel`,
      { reason }, this.silent());
  }

  setAutoRenew(enabled: boolean) {
    return this.http.put<ApiResult<{ autoRenew: boolean }>>(`${this.api}/api/subscription/auto-renew`, { enabled }, this.silent());
  }

  removeCard(uid: string) {
    return this.http.delete<ApiResult<unknown>>(`${this.api}/api/subscription/payment-methods/${uid}`, this.silent());
  }

  /** Bachs sends the owner back with ?checkout_id=…; our own reference works too. */
  verify(lookup: { checkoutId?: string | null; reference?: string | null }) {
    let params = new HttpParams();
    if (lookup.checkoutId) params = params.set('checkoutId', lookup.checkoutId);
    if (lookup.reference) params = params.set('reference', lookup.reference);
    return this.http.get<ApiResult<VerifyResult>>(`${this.api}/api/billing/verify`, { params, ...this.silent() });
  }

  /** Where Bachs returns the owner after paying: this site's account area (the API only accepts our own hosts). */
  private callbackUrl(): string {
    return `${window.location.origin}/account/billing/payment-callback`;
  }
}

export function formatMoney(amount: number, currency: BillingCurrency): string {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatDate(iso: string | null | undefined, withYear = true): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) });
}

export function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/** Errors from the API in words a customer can act on. */
export function apiMessage(err: { status?: number; error?: { message?: string } } | null | undefined, fallback: string): string {
  if (!err) return fallback;
  if (err.status === 0) return 'We couldn’t reach CenterDesk. Check your connection and try again.';
  if (err.status === 402) return 'Your workspace needs an active plan for that.';
  return err.error?.message || fallback;
}
