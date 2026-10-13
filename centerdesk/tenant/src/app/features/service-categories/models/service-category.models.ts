export interface ServiceSubCategory {
  uid: string;
  name: string;
  description: string | null;
  isActive: boolean;
  // The sub-category's own SLA timeframe — null means "no SLA set", in which case tickets
  // categorised under it won't get a DueDate/SlaStatus. Previously this lived on a separate
  // ServiceSla entity managed on its own page; it's now just two plain fields here.
  resolutionTimeHours: number | null;
  responseTimeMinutes: number | null;
  // Admin-set policy gate for the AI auto-response feature: only tickets categorised under a
  // sub-category with this true are ever eligible for an AI-drafted reply.
  aiHandlingEnabled: boolean;
}

export interface ServiceCategory {
  uid: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  subCategories: ServiceSubCategory[];
}

export interface CreateServiceCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateServiceCategoryRequest {
  name?: string;
  description?: string | null;
}

export interface CreateSubCategoryRequest {
  name: string;
  description?: string | null;
  resolutionTimeHours?: number | null;
  responseTimeMinutes?: number | null;
  aiHandlingEnabled: boolean;
}

export interface UpdateSubCategoryRequest {
  name?: string;
  description?: string | null;
  resolutionTimeHours?: number | null;
  responseTimeMinutes?: number | null;
  aiHandlingEnabled: boolean;
}
