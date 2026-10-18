/** Mirrors the API's TenantSettingsDto — the workspace's operational switches. */
export interface TenantSettings {
  /** Hand new tickets to a customer-service agent automatically instead of leaving them unassigned. */
  autoAssignTickets: boolean;
  slaEnabled: boolean;
  emailNotificationEnabled: boolean;
  /** IANA id that shift start/end times are read in. */
  timeZoneId: string;
  /**
   * How many active users would actually receive auto-assigned tickets. Zero means the toggle
   * has nothing to act on, which is worth saying out loud rather than letting it look broken.
   */
  customerServiceAgentCount: number;
}

/** Partial update — only the fields sent are written. */
export interface UpdateTenantSettingsRequest {
  autoAssignTickets?: boolean;
  slaEnabled?: boolean;
  emailNotificationEnabled?: boolean;
  timeZoneId?: string;
}
