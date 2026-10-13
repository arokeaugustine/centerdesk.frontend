/**
 * A tenant's WhatsApp Business number connected through Meta's WhatsApp Cloud API — the
 * WhatsApp counterpart of an email desk. The API never returns the access token or app secret,
 * only whether each one is set.
 */
export interface WhatsAppChannel {
  uid: string;
  name: string;
  displayPhoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string | null;
  isActive: boolean;
  aiHandlesAllMessages: boolean;
  sendAcknowledgement: boolean;
  /** Pasted into the Meta app's webhook settings together with webhookUrl. */
  verifyToken: string;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  /** The Callback URL Meta must call for this tenant. */
  webhookUrl: string;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface CreateWhatsAppChannelRequest {
  name: string;
  displayPhoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string | null;
  accessToken: string;
  appSecret: string;
  aiHandlesAllMessages: boolean;
  sendAcknowledgement: boolean;
}

/** Null fields are left unchanged — the token/secret only change when re-entered. */
export interface UpdateWhatsAppChannelRequest {
  name: string | null;
  displayPhoneNumber: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  accessToken: string | null;
  appSecret: string | null;
  isActive: boolean | null;
  aiHandlesAllMessages: boolean | null;
  sendAcknowledgement: boolean | null;
}

export interface WhatsAppConnectionTestResult {
  connected: boolean;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  error: string | null;
}
