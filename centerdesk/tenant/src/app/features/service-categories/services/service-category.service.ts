import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import {
  CreateServiceCategoryRequest,
  CreateSubCategoryRequest,
  ServiceCategory,
  UpdateServiceCategoryRequest,
  UpdateSubCategoryRequest,
} from '../models/service-category.models';

@Injectable({ providedIn: 'root' })
export class ServiceCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private get base() { return `${this.baseUrl}/api/service-categories`; }

  getAll() {
    return this.http.get<ApiResult<ServiceCategory[]>>(this.base);
  }

  create(req: CreateServiceCategoryRequest) {
    return this.http.post<ApiResult<{ uid: string; name: string }>>(this.base, req);
  }

  update(uid: string, req: UpdateServiceCategoryRequest) {
    return this.http.put<ApiResult<{ uid: string; name: string; description: string | null }>>(`${this.base}/${uid}`, req);
  }

  delete(uid: string) {
    return this.http.delete(`${this.base}/${uid}`, { observe: 'response' });
  }

  createSubCategory(categoryUid: string, req: CreateSubCategoryRequest) {
    return this.http.post<ApiResult<{ uid: string; name: string }>>(`${this.base}/${categoryUid}/sub-categories`, req);
  }

  updateSubCategory(subUid: string, req: UpdateSubCategoryRequest) {
    return this.http.put<ApiResult<{ uid: string; name: string; description: string | null }>>(`${this.base}/sub-categories/${subUid}`, req);
  }

  deleteSubCategory(subUid: string) {
    return this.http.delete(`${this.base}/sub-categories/${subUid}`, { observe: 'response' });
  }
}
