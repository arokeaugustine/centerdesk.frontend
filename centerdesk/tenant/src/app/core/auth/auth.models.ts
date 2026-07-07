export enum TenantPermission {
  CanViewSupervisorDashboard = 0x10,
  CanViewIndividualDashboard = 0x11,
  CanViewAllTickets = 0x20,
  CanViewTicketDetails = 0x21,
  CanCreateTicket = 0x22,
  CanUpdateTickets = 0x23,
  CanCloseTicket = 0x24,
  CanReopenTicket = 0x25,
  CanAssignTicket = 0x26,
  CanViewTicketSla = 0x27,
  CanAcknowledgeEmail = 0x28,
  CanReplyTicket = 0x29,
  CanForwardTicket = 0x2A,
  CanEscalateTicket = 0x2B,
  CanViewSubTickets = 0x30,
  CanCreateSubTicket = 0x31,
  CanReplySubTicket = 0x32,
  CanViewSubTicketSla = 0x33,
  CanViewSubTicketDetails = 0x34,
  CanViewUsers = 0x40,
  CanAddUsers = 0x41,
  CanEditUser = 0x42,
  CanDeleteUser = 0x43,
  CanViewUserRoles = 0x44,
  CanManageUserPermissions = 0x45,
  CanViewRoles = 0x50,
  CanCreateRole = 0x51,
  CanUpdateRole = 0x52,
  CanDeleteRole = 0x53,
  CanManageRolePermissions = 0x54,
  CanViewShifts = 0x60,
  CanCreateShift = 0x61,
  CanUpdateShift = 0x62,
  CanDeleteShift = 0x63,
  CanManageShiftSchedules = 0x64,
  CanUploadShiftSchedule = 0x65,
  CanViewSla = 0x70,
  CanCreateSla = 0x71,
  CanUpdateSla = 0x72,
  CanDeleteSla = 0x73,
  CanViewResolutionTeams = 0x80,
  CanCreateResolutionTeam = 0x81,
  CanUpdateResolutionTeam = 0x82,
  CanDeleteResolutionTeam = 0x83,
  CanManageResolutionTeamMembers = 0x84,
  CanViewServiceCategories = 0x90,
  CanCreateServiceCategory = 0x91,
  CanUpdateServiceCategory = 0x92,
  CanDeleteServiceCategory = 0x93,
  CanViewReports = 0xA0,
  CanExportReports = 0xA1,
  CanViewConfiguration = 0xB0,
  CanUpdateConfiguration = 0xB1,
  CanManageEmailDesks = 0xB2,
  CanManageEmailFilters = 0xB3,
  CanViewPartners = 0xC0,
  CanManagePartners = 0xC1,
  CanManageSubscription = 0xD0,
  CanViewBilling = 0xD1,
  CanManageTenantUsers = 0xD2,
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
