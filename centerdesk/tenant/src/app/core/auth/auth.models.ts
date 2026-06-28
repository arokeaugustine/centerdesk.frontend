export interface User {
  id: string;
  email: string;
  userName: string;
  roles: string[];
  userType: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginContent {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  userName: string;
  email: string;
  tenantSlug: string | null;
}

export interface Paging {
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResult<T> {
  success: boolean;
  type: number;
  title: string | null;
  status: string | null;
  detail: string | null;
  instance: string | null;
  validationErrors: Record<string, string[]> | null;
  message: string;
  code: string | null;
  path: string | null;
  content: T;
  paging: Paging | null;
}
