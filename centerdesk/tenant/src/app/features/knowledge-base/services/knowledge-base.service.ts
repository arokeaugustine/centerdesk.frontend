import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { KnowledgeBaseDocument, UploadKnowledgeBaseRequest } from '../models/knowledge-base.models';

@Injectable({ providedIn: 'root' })
export class KnowledgeBaseService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private get base() {
    return `${this.apiBaseUrl}/api/knowledge-base`;
  }

  getAll() {
    return this.http.get<ApiResult<KnowledgeBaseDocument[]>>(this.base);
  }

  upload(request: UploadKnowledgeBaseRequest) {
    return this.http.post<ApiResult<KnowledgeBaseDocument>>(this.base, request);
  }

  deactivate(uid: string) {
    return this.http.delete<ApiResult<string>>(`${this.base}/${uid}`);
  }
}
