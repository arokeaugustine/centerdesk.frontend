/** Mirrors the anonymous payload shapes sent by TicketService/SubTicketService/ShiftReflowJob via INotificationService.NotifyUserAsync. */

export interface TicketAssignedPayload {
  ticketUid: string;
  ticketNumber: string;
  subject: string;
  reason: string;
}

export interface SubTicketForwardedPayload {
  subTicketUid: string;
  subTicketNumber: string;
  ticketNumber: string;
  subject: string;
  forwardedBy: string;
}

export interface SubTicketReturnedPayload {
  subTicketUid: string;
  subTicketNumber: string;
  ticketUid: string;
  ticketNumber: string;
  remark: string | null;
}

export type NotificationEventName = 'TicketAssigned' | 'SubTicketForwarded' | 'SubTicketReturned';

export interface NotificationItem {
  id: string;
  event: NotificationEventName;
  message: string;
  /** Router link to navigate to when this notification is clicked, if any. */
  link: string[] | null;
  receivedAt: string;
  read: boolean;
}
