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
  // Dashboard
  [TenantPermission.CanViewSupervisorDashboard]: 'View Supervisor Dashboard',
  [TenantPermission.CanViewIndividualDashboard]: 'View Individual Dashboard',
  // Tickets
  [TenantPermission.CanViewAllTickets]: 'View All Tickets',
  [TenantPermission.CanViewTicketDetails]: 'View Ticket Details',
  [TenantPermission.CanCreateTicket]: 'Create Tickets',
  [TenantPermission.CanUpdateTickets]: 'Update Tickets',
  [TenantPermission.CanCloseTicket]: 'Close Tickets',
  [TenantPermission.CanReopenTicket]: 'Reopen Tickets',
  [TenantPermission.CanAssignTicket]: 'Assign Tickets',
  [TenantPermission.CanViewTicketSla]: 'View Ticket SLA',
  [TenantPermission.CanAcknowledgeEmail]: 'Acknowledge Email',
  [TenantPermission.CanReplyTicket]: 'Reply to Tickets',
  [TenantPermission.CanForwardTicket]: 'Forward Tickets',
  [TenantPermission.CanEscalateTicket]: 'Escalate Tickets',
  // Sub-Tickets
  [TenantPermission.CanViewSubTickets]: 'View Sub-Tickets',
  [TenantPermission.CanCreateSubTicket]: 'Create Sub-Tickets',
  [TenantPermission.CanReplySubTicket]: 'Reply to Sub-Tickets',
  [TenantPermission.CanViewSubTicketSla]: 'View Sub-Ticket SLA',
  [TenantPermission.CanViewSubTicketDetails]: 'View Sub-Ticket Details',
  // Users
  [TenantPermission.CanViewUsers]: 'View Users',
  [TenantPermission.CanAddUsers]: 'Add Users',
  [TenantPermission.CanEditUser]: 'Edit Users',
  [TenantPermission.CanDeleteUser]: 'Deactivate Users',
  [TenantPermission.CanViewUserRoles]: 'View User Roles',
  [TenantPermission.CanManageUserPermissions]: 'Manage User Permissions',
  // Roles
  [TenantPermission.CanViewRoles]: 'View Roles',
  [TenantPermission.CanCreateRole]: 'Create Roles',
  [TenantPermission.CanUpdateRole]: 'Update Roles',
  [TenantPermission.CanDeleteRole]: 'Delete Roles',
  [TenantPermission.CanManageRolePermissions]: 'Manage Role Permissions',
  // Shifts
  [TenantPermission.CanViewShifts]: 'View Shifts',
  [TenantPermission.CanCreateShift]: 'Create Shifts',
  [TenantPermission.CanUpdateShift]: 'Update Shifts',
  [TenantPermission.CanDeleteShift]: 'Delete Shifts',
  [TenantPermission.CanManageShiftSchedules]: 'Manage Shift Schedules',
  [TenantPermission.CanUploadShiftSchedule]: 'Upload Shift Schedule',
  // SLA
  [TenantPermission.CanViewSla]: 'View SLA',
  [TenantPermission.CanCreateSla]: 'Create SLA',
  [TenantPermission.CanUpdateSla]: 'Update SLA',
  [TenantPermission.CanDeleteSla]: 'Delete SLA',
  // Resolution Teams
  [TenantPermission.CanViewResolutionTeams]: 'View Resolution Teams',
  [TenantPermission.CanCreateResolutionTeam]: 'Create Resolution Teams',
  [TenantPermission.CanUpdateResolutionTeam]: 'Update Resolution Teams',
  [TenantPermission.CanDeleteResolutionTeam]: 'Delete Resolution Teams',
  [TenantPermission.CanManageResolutionTeamMembers]: 'Manage Team Members',
  // Service Categories
  [TenantPermission.CanViewServiceCategories]: 'View Service Categories',
  [TenantPermission.CanCreateServiceCategory]: 'Create Service Categories',
  [TenantPermission.CanUpdateServiceCategory]: 'Update Service Categories',
  [TenantPermission.CanDeleteServiceCategory]: 'Delete Service Categories',
  // Reports
  [TenantPermission.CanViewReports]: 'View Reports',
  [TenantPermission.CanExportReports]: 'Export Reports',
  // Configuration
  [TenantPermission.CanViewConfiguration]: 'View Configuration',
  [TenantPermission.CanUpdateConfiguration]: 'Update Configuration',
  [TenantPermission.CanManageEmailDesks]: 'Manage Email Desks',
  [TenantPermission.CanManageEmailFilters]: 'Manage Email Filters',
  // Partners
  [TenantPermission.CanViewPartners]: 'View Partners',
  [TenantPermission.CanManagePartners]: 'Manage Partners',
  // Subscription
  [TenantPermission.CanManageSubscription]: 'Manage Subscription',
  [TenantPermission.CanViewBilling]: 'View Billing',
  [TenantPermission.CanManageTenantUsers]: 'Manage Tenant Users',
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
      TenantPermission.CanAssignTicket, TenantPermission.CanViewTicketSla,
      TenantPermission.CanAcknowledgeEmail, TenantPermission.CanReplyTicket,
      TenantPermission.CanForwardTicket, TenantPermission.CanEscalateTicket,
    ],
  },
  {
    label: 'Sub-Tickets',
    permissions: [
      TenantPermission.CanViewSubTickets, TenantPermission.CanCreateSubTicket,
      TenantPermission.CanReplySubTicket, TenantPermission.CanViewSubTicketSla,
      TenantPermission.CanViewSubTicketDetails,
    ],
  },
  {
    label: 'Users',
    permissions: [
      TenantPermission.CanViewUsers, TenantPermission.CanAddUsers,
      TenantPermission.CanEditUser, TenantPermission.CanDeleteUser,
      TenantPermission.CanViewUserRoles, TenantPermission.CanManageUserPermissions,
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
    label: 'Shifts',
    permissions: [
      TenantPermission.CanViewShifts, TenantPermission.CanCreateShift,
      TenantPermission.CanUpdateShift, TenantPermission.CanDeleteShift,
      TenantPermission.CanManageShiftSchedules, TenantPermission.CanUploadShiftSchedule,
    ],
  },
  {
    label: 'SLA',
    permissions: [
      TenantPermission.CanViewSla, TenantPermission.CanCreateSla,
      TenantPermission.CanUpdateSla, TenantPermission.CanDeleteSla,
    ],
  },
  {
    label: 'Resolution Teams',
    permissions: [
      TenantPermission.CanViewResolutionTeams, TenantPermission.CanCreateResolutionTeam,
      TenantPermission.CanUpdateResolutionTeam, TenantPermission.CanDeleteResolutionTeam,
      TenantPermission.CanManageResolutionTeamMembers,
    ],
  },
  {
    label: 'Service Categories',
    permissions: [
      TenantPermission.CanViewServiceCategories, TenantPermission.CanCreateServiceCategory,
      TenantPermission.CanUpdateServiceCategory, TenantPermission.CanDeleteServiceCategory,
    ],
  },
  {
    label: 'Reports',
    permissions: [TenantPermission.CanViewReports, TenantPermission.CanExportReports],
  },
  {
    label: 'Configuration',
    permissions: [
      TenantPermission.CanViewConfiguration, TenantPermission.CanUpdateConfiguration,
      TenantPermission.CanManageEmailDesks, TenantPermission.CanManageEmailFilters,
    ],
  },
  {
    label: 'Partners',
    permissions: [TenantPermission.CanViewPartners, TenantPermission.CanManagePartners],
  },
  {
    label: 'Billing',
    permissions: [
      TenantPermission.CanViewBilling, TenantPermission.CanManageSubscription,
      TenantPermission.CanManageTenantUsers,
    ],
  },
];
