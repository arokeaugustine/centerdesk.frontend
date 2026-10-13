export interface Shift {
  uid: string;
  name: string;
  code: string;
  /** "HH:mm:ss" as returned by the API (TimeOnly). */
  startTime: string;
  /** "HH:mm:ss" as returned by the API (TimeOnly). */
  endTime: string;
  isActive: boolean;
  createdAt: string;
}

export interface ShiftAssignment {
  uid: string;
  shiftUid: string;
  shiftName: string;
  /** "yyyy-MM-dd" as returned by the API (DateOnly). */
  date: string;
  userUid: string;
  userFirstName: string;
  userLastName: string;
  createdAt: string;
}

export interface CurrentShiftInfo {
  shift: Shift;
  usersOnShift: ShiftAssignment[];
}

export interface CreateShiftRequest {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
}

export interface UpdateShiftRequest {
  name?: string | null;
  code?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isActive?: boolean | null;
}

export interface AssignShiftRequest {
  shiftUid: string;
  userUid: string;
  date: string;
}

export interface BulkShiftUploadRowResult {
  rowNumber: number;
  shiftCode: string;
  userEmail: string;
  /** "yyyy-MM-dd", or null if the row's date couldn't be parsed. */
  date: string | null;
  success: boolean;
  error: string | null;
}

export interface BulkShiftUploadResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  rows: BulkShiftUploadRowResult[];
}

/** Trims a "HH:mm:ss" API time value down to "HH:mm" for use in a native time input. */
export function toTimeInputValue(apiTime: string): string {
  return apiTime?.length >= 5 ? apiTime.slice(0, 5) : apiTime ?? '';
}

/** Expands a "HH:mm" time-input value out to "HH:mm:ss" for the API. */
export function toApiTimeValue(inputTime: string): string {
  return inputTime?.length === 5 ? `${inputTime}:00` : inputTime;
}
