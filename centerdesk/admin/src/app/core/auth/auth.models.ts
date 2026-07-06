export enum AdminPermission {
  CanViewTenants = 0x10,
  CanProfileTenant = 0x11,
  CanSuspendTenant = 0x12,
  CanReactivateTenant = 0x13,
  CanViewSubscriptions = 0x20,
  CanManageSubscriptions = 0x21,
  CanViewInvoices = 0x22,
  CanViewPlans = 0x30,
  CanManagePlans = 0x31,
  CanViewAdmins = 0x40,
  CanCreateAdmin = 0x41,
  CanUpdateAdmin = 0x42,
  CanDeactivateAdmin = 0x43,
  CanManageAdminPermissions = 0x44,
  CanViewSystemConfig = 0x50,
  CanManageSystemConfig = 0x51,
}

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
