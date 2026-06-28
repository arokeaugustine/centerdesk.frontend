import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../core/config/api.config';
import { ApiResult } from '../../core/auth/auth.models';

export interface SubscriptionItem {
  id: number;
  uid: string;
  name: string;
  slug: string;
  adminEmail: string;
  status: number;
  createdAt: string;
  activatedAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: string | null;
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
    const { page = 1, pageSize = 10 } = params;
    const httpParams = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http.get<ApiResult<SubscriptionItem[]>>(
      `${this.apiBaseUrl}/api/admin/subscriptions`,
      { params: httpParams }
    );
  }
}
