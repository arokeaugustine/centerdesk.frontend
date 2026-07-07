import { TenantPermission } from '../../../core/auth/auth.models';

export interface UserRoleSummary {
  uid: string;
  name: string;
}

export interface UserRoleDetail {
  uid: string;
  name: string;
  permissions: string[];
}

export interface UserSummary {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  unit: string | null;
  group: string | null;
  division: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  roles: UserRoleSummary[];
}

export interface UserDetail extends UserSummary {
  deactivatedAt: string | null;
  deactivationRemark: string | null;
  roles: UserRoleDetail[];
  directPermissions: string[];
}

export interface UserListContent {
  total: number;
  page: number;
  pageSize: number;
  data: UserSummary[];
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  unit?: string | null;
  group?: string | null;
  division?: string | null;
  isAdmin?: boolean;
  roleUids?: string[];
}

export interface UpdateUserRequest {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  unit?: string | null;
  group?: string | null;
  division?: string | null;
  isAdmin?: boolean | null;
}

export interface UserSearchQuery {
  search?: string;
  isActive?: boolean | null;
  page?: number;
  pageSize?: number;
}

export function permissionToHex(p: TenantPermission): string {
  return p.toString(16).padStart(4, '0');
}

export function hexToPermission(hex: string): TenantPermission | null {
  const value = parseInt(hex, 16);
  const valid = Object.values(TenantPermission) as number[];
  return valid.includes(value) ? (value as TenantPermission) : null;
}

export const PERMISSION_LABELS: Partial<Record<TenantPermission, string>> = {
  [TenantPermission.CanViewSupervisorDashboard]: 'View Supervisor Dashboard',
  [TenantPermission.CanViewIndividualDashboard]: 'View Individual Dashboard',
  [TenantPermission.CanViewAllTickets]: 'View All Tickets',
  [TenantPermission.CanViewTicketDetails]: 'View Ticket Details',
  [TenantPermission.CanCreateTicket]: 'Create Tickets',
  [TenantPermission.CanUpdateTickets]: 'Update Tickets',
  [TenantPermission.CanCloseTicket]: 'Close Tickets',
  [TenantPermission.CanReopenTicket]: 'Reopen Tickets',
  [TenantPermission.CanAssignTicket]: 'Assign Tickets',
  [TenantPermission.CanReplyTicket]: 'Reply to Tickets',
  [TenantPermission.CanForwardTicket]: 'Forward Tickets',
  [TenantPermission.CanEscalateTicket]: 'Escalate Tickets',
  [TenantPermission.CanViewUsers]: 'View Users',
  [TenantPermission.CanAddUsers]: 'Add Users',
  [TenantPermission.CanEditUser]: 'Edit Users',
  [TenantPermission.CanDeleteUser]: 'Deactivate Users',
  [TenantPermission.CanManageUserPermissions]: 'Manage User Permissions',
  [TenantPermission.CanViewRoles]: 'View Roles',
  [TenantPermission.CanCreateRole]: 'Create Roles',
  [TenantPermission.CanUpdateRole]: 'Update Roles',
  [TenantPermission.CanDeleteRole]: 'Delete Roles',
  [TenantPermission.CanManageRolePermissions]: 'Manage Role Permissions',
  [TenantPermission.CanViewConfiguration]: 'View Configuration',
  [TenantPermission.CanUpdateConfiguration]: 'Update Configuration',
  [TenantPermission.CanManageEmailDesks]: 'Manage Email Desks',
  [TenantPermission.CanViewBilling]: 'View Billing',
  [TenantPermission.CanManageSubscription]: 'Manage Subscription',
  [TenantPermission.CanViewReports]: 'View Reports',
  [TenantPermission.CanExportReports]: 'Export Reports',
};

export const PERMISSION_GROUPS: { label: string; permissions: TenantPermission[] }[] = [
  {
    label: 'Dashboard',
    permissions: [TenantPermission.CanViewSupervisorDashboard, TenantPermission.CanViewIndividualDashboard],
  },
  {
    label: 'Tickets',
    permissions: [
      TenantPermission.CanViewAllTickets, TenantPermission.CanViewTicketDetails,
      TenantPermission.CanCreateTicket, TenantPermission.CanUpdateTickets,
      TenantPermission.CanCloseTicket, TenantPermission.CanReopenTicket,
      TenantPermission.CanAssignTicket, TenantPermission.CanReplyTicket,
      TenantPermission.CanForwardTicket, TenantPermission.CanEscalateTicket,
    ],
  },
  {
    label: 'Users',
    permissions: [
      TenantPermission.CanViewUsers, TenantPermission.CanAddUsers,
      TenantPermission.CanEditUser, TenantPermission.CanDeleteUser,
      TenantPermission.CanManageUserPermissions,
    ],
  },
  {
    label: 'Roles',
    permissions: [
      TenantPermission.CanViewRoles, TenantPermission.CanCreateRole,
      TenantPermission.CanUpdateRole, TenantPermission.CanDeleteRole,
      TenantPermission.CanManageRolePermissions,
    ],
  },
  {
    label: 'Configuration',
    permissions: [
      TenantPermission.CanViewConfiguration, TenantPermission.CanUpdateConfiguration,
      TenantPermission.CanManageEmailDesks,
    ],
  },
  {
    label: 'Reports',
    permissions: [TenantPermission.CanViewReports, TenantPermission.CanExportReports],
  },
  {
    label: 'Billing',
    permissions: [TenantPermission.CanViewBilling, TenantPermission.CanManageSubscription],
  },
];
