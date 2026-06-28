import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../core/config/api.config';
import { ApiResult } from '../../core/auth/auth.models';

export interface SubscriptionTenant {
  uid: string;
  name: string;
  slug: string;
  adminEmail: string;
}

export interface SubscriptionPlan {
  name: string;
  monthlyPriceNaira: number;
  annualPriceNaira: number;
}

export interface SubscriptionItem {
  uid: string;
  status: number;
  billingCycle: number;
  startDate: string;
  renewalDate: string;
  tenant: SubscriptionTenant;
  plan: SubscriptionPlan;
}

export interface SubscriptionListParams {
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getSubscriptions(params: SubscriptionListParams = {}) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const httpParams = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http.get<ApiResult<SubscriptionItem[]>>(
      `${this.apiBaseUrl}/api/admin/subscriptions`,
      { params: httpParams }
    );
  }
}
