/** One bucket of the dashboard traffic chart — see `DashboardSummary.trafficInterval` for its width. */
export interface TrafficPoint {
  /** ISO timestamp for the start of the bucket (UTC, aligned to the bucket boundary). */
  date: string;
  /** Inbound customer mail in this bucket. */
  received: number;
  /** Customer-facing replies sent in this bucket. */
  responses: number;
}

/**
 * `GET /api/reports/dashboard`. Percentages arrive pre-computed (one decimal place) because
 * they are NOT all taken over the same denominator — each `*Percent` is documented with the
 * total it belongs to, and the SLA figures deliberately exclude tickets that carry no SLA.
 */
export interface DashboardSummary {
  from: string;
  to: string;

  /** Inbound customer mail in the window (internal notes excluded). */
  totalMailsReceived: number;
  /** Customer-facing replies sent in the window. */
  totalAnswered: number;
  /** `totalAnswered` over `totalMailsReceived` — can exceed 100 (one mail, several replies). */
  answeredPercent: number;

  /** Tickets created in the window — the denominator for `resolvedByAiPercent`. */
  totalTickets: number;
  /** Tickets closed in the window. */
  resolvedTickets: number;

  /** Tickets the AI auto-response pipeline answered without declining. */
  resolvedByAi: number;
  /** `resolvedByAi` over `totalTickets`. */
  resolvedByAiPercent: number;

  /** Closed, SLA-tracked tickets that beat their due date. */
  resolvedWithinSla: number;
  /** `resolvedWithinSla` over `slaTrackedResolved`. */
  resolvedWithinSlaPercent: number;

  /** Closed, SLA-tracked tickets that missed their due date. */
  resolvedOutsideSla: number;
  /** `resolvedOutsideSla` over `slaTrackedResolved`. */
  resolvedOutsideSlaPercent: number;

  /** Resolved late *plus* still open and already overdue. */
  slaViolated: number;
  /** `slaViolated` over `slaTrackedTickets`. */
  slaViolatedPercent: number;

  /** Tickets that carry a due date at all; tickets without one are excluded from SLA figures. */
  slaTrackedTickets: number;
  /** The closed subset of `slaTrackedTickets`. */
  slaTrackedResolved: number;

  traffic: TrafficPoint[];
  /** `'hour'`, `'day'` or `'week'` — the server picks the width from the window size. */
  trafficInterval: string;
}
