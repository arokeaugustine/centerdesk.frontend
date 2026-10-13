import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { CreateEmailFilterRequest, EmailFilter, UpdateEmailFilterRequest } from '../models/email-filter.models';

@Injectable({ providedIn: 'root' })
export class EmailFilterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private get base() {
    return `${this.baseUrl}/api/email-filters`;
  }

  getAll(emailDeskUid?: string | null) {
    let params = new HttpParams();
    if (emailDeskUid) params = params.set('emailDeskUid', emailDeskUid);
    return this.http.get<ApiResult<EmailFilter[]>>(this.base, { params });
  }

  create(req: CreateEmailFilterRequest) {
    return this.http.post<ApiResult<EmailFilter>>(this.base, req);
  }

  update(uid: string, req: UpdateEmailFilterRequest) {
    return this.http.put<ApiResult<EmailFilter>>(`${this.base}/${uid}`, req);
  }

  deactivate(uid: string) {
    return this.http.delete<ApiResult<string>>(`${this.base}/${uid}`);
  }
}
