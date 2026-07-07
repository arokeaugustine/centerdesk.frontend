import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserDetail,
  UserListContent,
  UserSearchQuery,
} from '../models/user.models';
import { ApiResult } from '../../../core/auth/auth.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(query: UserSearchQuery = {}) {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 20));
    if (query.search) params = params.set('search', query.search);
    if (query.isActive != null) params = params.set('isActive', String(query.isActive));
    return this.http.get<ApiResult<UserListContent>>(`${this.baseUrl}/api/users`, { params });
  }

  getOne(uid: string) {
    return this.http.get<ApiResult<UserDetail>>(`${this.baseUrl}/api/users/${uid}`);
  }

  create(req: CreateUserRequest) {
    return this.http.post<ApiResult<{ uid: string; email: string }>>(`${this.baseUrl}/api/users`, req);
  }

  update(uid: string, req: UpdateUserRequest) {
    return this.http.put<ApiResult<{ uid: string; firstName: string; lastName: string; email: string }>>(`${this.baseUrl}/api/users/${uid}`, req);
  }

  deactivate(uid: string, remark?: string | null) {
    return this.http.post<ApiResult<string>>(`${this.baseUrl}/api/users/${uid}/deactivate`, { remark: remark ?? null });
  }

  reactivate(uid: string) {
    return this.http.post<ApiResult<string>>(`${this.baseUrl}/api/users/${uid}/reactivate`, {});
  }

  resetPassword(uid: string, newPassword: string) {
    return this.http.post<ApiResult<string>>(`${this.baseUrl}/api/users/${uid}/reset-password`, { newPassword });
  }

  assignRole(uid: string, roleUid: string) {
    return this.http.post<ApiResult<string>>(`${this.baseUrl}/api/users/${uid}/roles/${roleUid}`, {});
  }

  removeRole(uid: string, roleUid: string) {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/api/users/${uid}/roles/${roleUid}`);
  }

  setDirectPermissions(uid: string, permissions: string[]) {
    return this.http.put<ApiResult<string>>(`${this.baseUrl}/api/users/${uid}/permissions`, { permissions });
  }
}
