export interface ServiceSubCategory {
  uid: string;
  name: string;
  description: string | null;
  isActive: boolean;
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
}

export interface UpdateSubCategoryRequest {
  name?: string;
  description?: string | null;
}
