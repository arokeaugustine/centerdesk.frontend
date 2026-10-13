export interface EmailFilter {
  uid: string;
  emailDeskUid: string;
  emailDeskName: string;
  filterType: string;
  filterValue: string;
  action: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateEmailFilterRequest {
  emailDeskUid: string;
  filterType: string;
  filterValue: string;
  action: string;
}

export interface UpdateEmailFilterRequest {
  filterType?: string | null;
  filterValue?: string | null;
  action?: string | null;
  isActive?: boolean | null;
}

/** Recognized by EmailSyncJob.EvaluateFiltersAsync when matching an inbound email. */
export const FILTER_TYPES = [
  { value: 'SenderDomain', label: 'Sender Domain' },
  { value: 'SenderEmail', label: 'Sender Email' },
  { value: 'SubjectContains', label: 'Subject Contains' },
] as const;

/**
 * Recognized by EmailSyncJob.EvaluateFiltersAsync. "SetCategory" and "SetSubCategory" are
 * special cases handled by the UI: stored server-side as the literal strings
 * "SetCategory:{serviceCategoryUid}" / "SetSubCategory:{serviceSubCategoryUid}".
 */
export const FILTER_ACTIONS = [
  { value: 'Reject', label: 'Reject email' },
  { value: 'SetPriorityHigh', label: 'Set priority: High' },
  { value: 'SetPriorityLow', label: 'Set priority: Low' },
  { value: 'SetPriorityNormal', label: 'Set priority: Normal' },
  { value: 'SetCategory', label: 'Set service category…' },
  { value: 'SetSubCategory', label: 'Set sub-category…' },
] as const;

export const SET_CATEGORY_PREFIX = 'SetCategory:';
export const SET_SUBCATEGORY_PREFIX = 'SetSubCategory:';
