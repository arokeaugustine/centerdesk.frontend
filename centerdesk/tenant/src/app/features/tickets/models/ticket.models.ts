export enum TicketStatus {
  New = 0,
  Open = 1,
  InProgress = 2,
  PendingCustomer = 3,
  Resolved = 4,
  Closed = 5,
  Reopened = 6,
}

export enum TicketPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3,
}

export interface TicketUser {
  id: number;
  uid: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

export interface TicketAttachment {
  id: number;
  uid: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface TicketMessage {
  id: number;
  uid: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  body: string;
  cc: string | null;
  channel: string;
  isInbound: boolean;
  isRead: boolean;
  sentBy: number | null;
  createdAt: string;
  attachments: TicketAttachment[];
}

export interface TicketStatusHistoryEntry {
  id: number;
  ticketId: number;
  status: TicketStatus;
  remark: string | null;
  changedBy: number | null;
  changedAt: string;
}

export interface TicketEmailDesk {
  uid: string;
  name: string;
  emailAddress: string;
  isDefault: boolean;
}

export interface TicketSummary {
  uid: string;
  ticketNumber: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: string | null;
  slaStatus: string | null;
  isClosed: boolean;
  dueDate: string | null;
  createdAt: string;
  assignedTo: TicketUser | null;
  emailDesk: TicketEmailDesk | null;
  serviceCategory: { uid: string; name: string } | null;
}

export interface TicketListContent {
  total: number;
  page: number;
  pageSize: number;
  data: TicketSummary[];
}

export interface Ticket {
  id: number;
  uid: string;
  ticketNumber: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: string | null;
  emailDeskId: number | null;
  serviceCategoryId: number | null;
  serviceSubCategoryId: number | null;
  serviceSlaId: number | null;
  slaStatus: string | null;
  isClosed: boolean;
  closedAt: string | null;
  dueDate: string | null;
  resolutionSummary: string | null;
  clientFeedback: string | null;
  clientRemark: string | null;
  createdAt: string;
  assignedTo: TicketUser | null;
  closedByNavigation: TicketUser | null;
  emailDesk: TicketEmailDesk | null;
  messages: TicketMessage[];
  statusHistories: TicketStatusHistoryEntry[];
}

export interface CreateTicketRequest {
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  priority: TicketPriority;
  emailDeskId?: number | null;
  serviceCategoryId?: number | null;
  serviceSubCategoryId?: number | null;
  source?: string | null;
}

export interface AssignTicketRequest {
  assignToUserId: number;
}

export interface UpdateTicketStatusRequest {
  status: TicketStatus;
  remark?: string | null;
}

export interface CloseTicketRequest {
  resolutionSummary: string;
}

export interface ReopenTicketRequest {
  remark: string;
}

export interface TicketSearchQuery {
  search?: string;
  status?: TicketStatus | null;
  priority?: TicketPriority | null;
  assignedTo?: number | null;
  emailDeskId?: number | null;
  page?: number;
  pageSize?: number;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.New]: 'New',
  [TicketStatus.Open]: 'Open',
  [TicketStatus.InProgress]: 'In Progress',
  [TicketStatus.PendingCustomer]: 'Pending Customer',
  [TicketStatus.Resolved]: 'Resolved',
  [TicketStatus.Closed]: 'Closed',
  [TicketStatus.Reopened]: 'Reopened',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.Low]: 'Low',
  [TicketPriority.Normal]: 'Normal',
  [TicketPriority.High]: 'High',
  [TicketPriority.Urgent]: 'Urgent',
};
