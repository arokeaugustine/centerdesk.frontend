import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import {
  AgentSlaRow, CsatResponseRow, InteractionDimension, InteractionRow, ReportKind,
  TeamPerformanceRow, TenantReport, TicketRegisterRow,
} from '../models/report.models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** from/to are ISO date strings ("yyyy-MM-dd"); both optional — server defaults to the last 30 days. */
  getOverview(from?: string | null, to?: string | null) {
    return this.http.get<ApiResult<TenantReport>>(
      `${this.baseUrl}/api/reports/overview`, { params: this.range(from, to) });
  }

  /** Every ticket raised in the window; optionally one service category only. */
  getTicketRegister(from?: string | null, to?: string | null, serviceCategoryUid?: string | null) {
    let params = this.range(from, to);
    if (serviceCategoryUid) params = params.set('serviceCategoryUid', serviceCategoryUid);

    return this.http.get<ApiResult<TicketRegisterRow[]>>(
      `${this.baseUrl}/api/reports/tickets`, { params });
  }

  getAgentSla(from?: string | null, to?: string | null, userUid?: string | null) {
    let params = this.range(from, to);
    if (userUid) params = params.set('userUid', userUid);

    return this.http.get<ApiResult<AgentSlaRow[]>>(
      `${this.baseUrl}/api/reports/agent-sla`, { params });
  }

  getTeamPerformance(from?: string | null, to?: string | null, teamUid?: string | null) {
    let params = this.range(from, to);
    if (teamUid) params = params.set('teamUid', teamUid);

    return this.http.get<ApiResult<TeamPerformanceRow[]>>(
      `${this.baseUrl}/api/reports/team-performance`, { params });
  }

  getInteractions(from: string | null, to: string | null, dimension: InteractionDimension) {
    return this.http.get<ApiResult<InteractionRow[]>>(
      `${this.baseUrl}/api/reports/interactions`,
      { params: this.range(from, to).set('dimension', dimension) });
  }

  getCsatResponses(from?: string | null, to?: string | null) {
    return this.http.get<ApiResult<CsatResponseRow[]>>(
      `${this.baseUrl}/api/reports/csat`, { params: this.range(from, to) });
  }

  /**
   * Downloads a report as .xlsx. Returned as a blob rather than a plain link because the
   * endpoint needs the Authorization and X-Tenant-Slug headers the interceptors attach —
   * an <a href> would arrive unauthenticated.
   */
  exportReport(
    kind: ReportKind,
    from: string | null,
    to: string | null,
    options: { serviceCategoryUid?: string | null; userUid?: string | null; teamUid?: string | null;
      dimension?: InteractionDimension } = {},
  ) {
    let params = this.range(from, to).set('kind', kind);

    if (options.serviceCategoryUid) params = params.set('serviceCategoryUid', options.serviceCategoryUid);
    if (options.userUid) params = params.set('userUid', options.userUid);
    if (options.teamUid) params = params.set('teamUid', options.teamUid);
    if (options.dimension) params = params.set('dimension', options.dimension);

    return this.http.get(`${this.baseUrl}/api/reports/export`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  private range(from?: string | null, to?: string | null): HttpParams {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return params;
  }
}
