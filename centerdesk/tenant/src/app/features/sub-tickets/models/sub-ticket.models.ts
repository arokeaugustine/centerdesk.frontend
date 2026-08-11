import { TicketMessage, TicketPriority, TicketStatus } from '../../tickets/models/ticket.models';

export interface SubTicketAssignee {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SubTicketSummary {
  uid: string;
  subTicketNumber: string;
  ticketUid: string;
  ticketNumber: string;
  resolutionTeamUid: string;
  resolutionTeamName: string;
  /**
   * Server-enforced: a resolution-team member can only reply directly to the customer
   * (see SubTicketReplyCustomerRequest) when the team this flag belongs to has it set.
   * Otherwise they must relay the reply back to the original agent instead.
   */
  resolutionTeamCanReplyToCustomer: boolean;
  assignedTo: SubTicketAssignee | null;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  slaStatus: string | null;
  isClosed: boolean;
  dueDate: string | null;
  createdAt: string;
}

/** Internal collaboration message between the forwarding agent and the resolution-team member. */
export interface SubTicketReplyRequest {
  body: string;
}

/** Replies to the ORIGINAL external customer directly from the sub-ticket. */
export interface SubTicketReplyCustomerRequest {
  body: string;
  sendAsStatus: TicketStatus;
}

export interface CloseSubTicketRequest {
  resolutionSummary?: string | null;
}

export interface ReturnSubTicketRequest {
  remark?: string | null;
}

export type { TicketMessage };
