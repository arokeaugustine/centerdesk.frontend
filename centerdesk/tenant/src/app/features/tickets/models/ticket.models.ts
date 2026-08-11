export enum TicketStatus {
  New = 0,
  Open = 1,
  InProgress = 2,
  PendingCustomer = 3,
  Resolved = 4,
  Closed = 5,
  Reopened = 6,
  // Set on the parent ticket the moment it's forwarded (see ForwardTicketRequest below);
  // moves back off this status once the resolution team replies or the sub-ticket is returned.
  AwaitingResolutionTeamFeedback = 7,
  // Set on both the sub-ticket and the parent ticket when a resolution-team member sends
  // a sub-ticket back to the original agent instead of resolving it themselves.
  Returned = 8,
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
  uid: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface TicketMessageSender {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TicketMessage {
  uid: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  /** Raw HTML body; rendered sanitized in the thread so links and formatting work. */
  body: string;
  cc: string | null;
  bcc: string | null;
  channel: string;
  isInbound: boolean;
  isRead: boolean;
  /** True for internal-only notes (never sent to the customer) — see AddNoteRequest. */
  isInternal: boolean;
  sentBy: TicketMessageSender | null;
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
  // Not returned by the ticket-detail endpoint today — optional so the view doesn't crash
  // when it's absent (the API's TicketDetailDto omits it).
  statusHistories?: TicketStatusHistoryEntry[];
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

export interface ReplyMessageRequest {
  toEmail: string;
  body: string;
  cc?: string | null;
  bcc?: string | null;
  channel?: string | null;
}

/** Internal-only note on a ticket — see MessagesController.AddNote / CanAddInternalNote. */
export interface AddNoteRequest {
  body: string;
}

/** Forwards a ticket to a named member of a resolution team, creating a sub-ticket. */
export interface ForwardTicketRequest {
  resolutionTeamUid: string;
  assigneeUserUid: string;
  message: string;
  priority?: TicketPriority | null;
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
  [TicketStatus.AwaitingResolutionTeamFeedback]: 'Awaiting Team Feedback',
  [TicketStatus.Returned]: 'Returned',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.Low]: 'Low',
  [TicketPriority.Normal]: 'Normal',
  [TicketPriority.High]: 'High',
  [TicketPriority.Urgent]: 'Urgent',
};
