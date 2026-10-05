export interface TicketsByStatus {
  status: string;
  count: number;
}

export interface AgentPerformance {
  userUid: string;
  firstName: string;
  lastName: string;
  assignedCount: number;
  closedCount: number;
}

export interface TenantReport {
  from: string;
  to: string;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  slaBreachedCount: number;
  averageResolutionHours: number;
  byStatus: TicketsByStatus[];
  byAgent: AgentPerformance[];
}

/** One ticket, flattened — the register behind `GET /api/reports/tickets`. */
export interface TicketRegisterRow {
  ticketNumber: string;
  createdAt: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  source: string | null;
  emailDesk: string | null;
  status: string;
  priority: string;
  serviceCategory: string | null;
  subCategory: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  closedAt: string | null;
  closedBy: string | null;
  resolutionHours: number | null;
  slaStatus: string | null;
  /** "Within SLA" | "Outside SLA" | "Open - overdue" | "Open - on track" | "Not tracked". */
  slaOutcome: string;
  answeredByAi: boolean;
  aiDeclinedReason: string | null;
  resolutionSummary: string | null;
  csatRating: number | null;
}

/** Per-agent SLA scorecard. Counts split closed/open by whether the due date was met. */
export interface AgentSlaRow {
  agent: string;
  email: string;
  totalTickets: number;
  closedWithinSla: number;
  closedOutsideSla: number;
  openWithinSla: number;
  openOutsideSla: number;
  /** Tickets with no due date — excluded from the compliance figure rather than counted as met. */
  notTracked: number;
  compliancePercent: number;
}

/** Resolution-team throughput over sub-tickets, by team and member. */
export interface TeamPerformanceRow {
  team: string;
  parentTeam: string | null;
  member: string;
  subTickets: number;
  closed: number;
  open: number;
  closedWithinSla: number;
  closedOutsideSla: number;
  averageResolutionHours: number;
}

/** A grouped count with its share of the total. */
export interface InteractionRow {
  item: string;
  frequency: number;
  percentage: number;
}

/** One satisfaction response, for a ticket closed in the window. */
export interface CsatResponseRow {
  ticketNumber: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  rating: number;
  remark: string | null;
  closedBy: string | null;
  closedAt: string | null;
}

/** Which column the interactions report groups on. Must match the API's InteractionDimension. */
export type InteractionDimension = 'Channel' | 'Category' | 'SubCategory' | 'Status' | 'Priority';

/** Which report to export. Must match the API's ReportKind. */
export type ReportKind =
  | 'Overview'
  | 'Dashboard'
  | 'TicketRegister'
  | 'AgentSla'
  | 'TeamPerformance'
  | 'Interactions'
  | 'Csat';
