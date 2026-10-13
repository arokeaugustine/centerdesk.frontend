export interface EmailDesk {
  id: number;
  uid: string;
  name: string;
  emailAddress: string;
  isDefault: boolean;
  isActive: boolean;
  imapHost: string;
  imapPort: number;
  imapUseSsl: boolean;
  imapUsername: string;
  smtpHost: string;
  smtpPort: number;
  smtpUseTls: boolean;
  smtpUsername: string;
  createdAt: string;
  lastSyncedAt: string | null;
  // Tenant-level override of the AI auto-response policy gate: when true, every ticket that
  // comes in through this desk is AI-eligible regardless of its sub-category's own
  // aiHandlingEnabled flag — for tenants who'd rather not configure eligibility category by
  // category and just want "AI handles all my mail" for this mailbox.
  aiHandlesAllMail: boolean;
}

export interface CreateEmailDeskRequest {
  name: string;
  emailAddress: string;
  isDefault: boolean;
  imapHost: string;
  imapPort: number;
  imapUseSsl: boolean;
  imapUsername: string;
  imapPassword: string;
  smtpHost: string;
  smtpPort: number;
  smtpUseTls: boolean;
  smtpUsername: string;
  smtpPassword: string;
  aiHandlesAllMail: boolean;
}

export interface UpdateEmailDeskRequest {
  name?: string | null;
  isDefault?: boolean | null;
  isActive?: boolean | null;
  imapHost?: string | null;
  imapPort?: number | null;
  imapUseSsl?: boolean | null;
  imapUsername?: string | null;
  imapPassword?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUseTls?: boolean | null;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  aiHandlesAllMail?: boolean | null;
}

export interface TestConnectionResult {
  connected: boolean;
}
