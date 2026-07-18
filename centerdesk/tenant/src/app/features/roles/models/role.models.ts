export interface RoleSummary {
  uid: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  permissions: string[];
  userCount: number;
}

export interface RoleDetail extends RoleSummary {
  users: RoleUser[];
}

export interface RoleUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string | null;
  permissions?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string | null;
}

export interface AvailablePermission {
  name: string;
}

export interface AvailablePermissionGroup {
  group: string;
  permissions: AvailablePermission[];
}
