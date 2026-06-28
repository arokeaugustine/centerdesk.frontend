import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../core/config/api.config';
import { ApiResult } from '../../core/auth/auth.models';

export enum TenantStatus {
  Pending = 0,
  Active = 1,
  Suspended = 2,
  Cancelled = 3,
}

export const TENANT_STATUS_LABEL: Record<TenantStatus, string> = {
  [TenantStatus.Pending]: 'Pending',
  [TenantStatus.Active]: 'Active',
  [TenantStatus.Suspended]: 'Suspended',
  [TenantStatus.Cancelled]: 'Cancelled',
};

export interface TenantItem {
  id: number;
  uid: string;
  name: string;
  slug: string;
  adminEmail: string;
  status: TenantStatus;
  createdAt: string;
  activatedAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: string | null;
}

export interface TenantListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TenantStatus | null;
}

export interface RegisterTenantRequest {
  companyName: string;
  slug: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  phoneNumber: string;
  industry: string;
  planId: number;
  billingCycle: 'monthly' | 'yearly';
}

export interface RegisterTenantContent {
  tenantUid: string;
  companyName: string;
  slug: string;
  paymentUrl: string;
  paymentReference: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getTenants(params: TenantListParams = {}) {
    const { page = 1, pageSize = 20, search, status } = params;
    let httpParams = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (search) {
      httpParams = httpParams.set('search', search);
    }
    if (status != null) {
      httpParams = httpParams.set('status', status);
    }
    return this.http.get<ApiResult<TenantItem[]>>(
      `${this.apiBaseUrl}/api/admin/tenants`,
      { params: httpParams }
    );
  }

  register(body: RegisterTenantRequest) {
    return this.http.post<ApiResult<RegisterTenantContent>>(
      `${this.apiBaseUrl}/api/register`,
      body
    );
  }
}
