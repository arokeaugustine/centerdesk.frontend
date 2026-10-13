export type KnowledgeBaseSourceType = 'Manual' | 'ResolvedTicket';

export interface KnowledgeBaseDocument {
  uid: string;
  title: string;
  sourceType: KnowledgeBaseSourceType;
  // Set only when sourceType is 'ResolvedTicket' — the ticket this article was auto-ingested
  // from (see TicketService.CloseAsync -> KnowledgeBaseHelper.IngestResolvedTicketAsync).
  sourceTicketNumber: string | null;
  isActive: boolean;
  createdAt: string;
  chunkCount: number;
  // How many of this document's chunks actually have an embedding — a document uploaded while
  // the embedding provider was unreachable can have chunkCount > 0 with embeddedChunkCount 0;
  // AiAutoResponseJob re-embeds missing chunks in the background, so this catches up on its own.
  embeddedChunkCount: number;
}

export interface UploadKnowledgeBaseRequest {
  title: string;
  content: string;
}
