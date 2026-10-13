import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ShiftService } from '../../services/shift.service';
import { BulkShiftUploadResult, CurrentShiftInfo, Shift, ShiftAssignment } from '../../models/shift.models';
import { UserService } from '../../../users/services/user.service';
import { UserSummary } from '../../../users/models/user.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';
import { Badge } from '../../../../shared/components/badge/badge';
import { Modal } from '../../../../shared/components/modal/modal';

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

@Component({
  selector: 'app-shift-schedule-page',
  imports: [ReactiveFormsModule, Button, InputField, Label, Badge, Modal],
  templateUrl: './shift-schedule-page.html',
})
export class ShiftSchedulePage implements OnInit {
  private readonly shiftService = inject(ShiftService);
  private readonly userService = inject(UserService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly shifts = signal<Shift[]>([]);
  protected readonly users = signal<UserSummary[]>([]);
  protected readonly assignments = signal<ShiftAssignment[]>([]);
  protected readonly current = signal<CurrentShiftInfo[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly canManageSchedules = computed(() =>
    this.permissions.has(TenantPermission.CanManageShiftSchedules)
  );
  protected readonly canUpload = computed(() =>
    this.permissions.has(TenantPermission.CanUploadShiftSchedule)
  );

  protected readonly selectedDate = signal(todayIso());

  protected readonly showBulkUploadModal = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly isUploading = signal(false);
  protected readonly uploadResult = signal<BulkShiftUploadResult | null>(null);
  protected readonly uploadError = signal<string | null>(null);

  protected readonly activeShifts = computed(() => this.shifts().filter((s) => s.isActive));

  protected readonly assignmentsByShift = computed(() => {
    const map = new Map<string, ShiftAssignment[]>();
    for (const a of this.assignments()) {
      const list = map.get(a.shiftUid) ?? [];
      list.push(a);
      map.set(a.shiftUid, list);
    }
    return map;
  });

  protected readonly assignForm = new FormGroup({
    shiftUid: new FormControl('', [Validators.required]),
    userUid: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    if (!this.canManageSchedules() && !this.canUpload()) {
      this.toast.error('You do not have permission to manage shift schedules.');
      this.router.navigate(['/shifts']);
      return;
    }
    this.loadStaticData();
    this.loadSchedule();
    this.loadCurrent();
  }

  private loadStaticData(): void {
    this.shiftService.getAll().subscribe({
      next: (res) => { if (res.success) this.shifts.set(res.content ?? []); },
    });
    this.userService.getAll({ pageSize: 200, isActive: true }).subscribe({
      next: (res) => { if (res.success) this.users.set(res.content?.data ?? []); },
    });
  }

  protected loadSchedule(): void {
    this.isLoading.set(true);
    this.shiftService.getSchedule(this.selectedDate()).subscribe({
      next: (res) => {
        if (res.success) this.assignments.set(res.content ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private loadCurrent(): void {
    this.shiftService.getCurrent().subscribe({
      next: (res) => { if (res.success) this.current.set(res.content ?? []); },
    });
  }

  protected onDateChange(value: string): void {
    this.selectedDate.set(value);
    this.loadSchedule();
  }

  protected onAssign(): void {
    if (this.isSubmitting()) return;
    if (this.assignForm.invalid) { this.assignForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.assignForm.getRawValue();

    this.shiftService.assign({
      shiftUid: v.shiftUid!,
      userUid: v.userUid!,
      date: this.selectedDate(),
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('User assigned to shift.');
          this.assignForm.reset({ shiftUid: '', userUid: '' });
          this.loadSchedule();
        } else {
          this.formError.set(res.message || 'Failed to assign user.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onRemove(assignment: ShiftAssignment): void {
    this.shiftService.removeAssignment(assignment.uid).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Assignment removed.');
          this.loadSchedule();
        } else {
          this.toast.error(res.message || 'Failed to remove assignment.');
        }
      },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || 'An error occurred.'),
    });
  }

  protected goBack(): void {
    this.router.navigate(['/shifts']);
  }

  protected openBulkUpload(): void {
    this.selectedFile.set(null);
    this.uploadResult.set(null);
    this.uploadError.set(null);
    this.showBulkUploadModal.set(true);
  }

  protected closeBulkUpload(): void {
    this.showBulkUploadModal.set(false);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.uploadResult.set(null);
    this.uploadError.set(null);
  }

  protected onBulkUpload(): void {
    const file = this.selectedFile();
    if (!file || this.isUploading()) return;
    this.isUploading.set(true);
    this.uploadError.set(null);
    this.uploadResult.set(null);

    this.shiftService.bulkUpload(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        if (res.success && res.content) {
          this.uploadResult.set(res.content);
          if (res.content.successCount > 0) {
            this.toast.success(`${res.content.successCount} of ${res.content.totalRows} row(s) scheduled.`);
            this.loadSchedule();
          }
          if (res.content.failureCount === 0) {
            this.selectedFile.set(null);
          }
        } else {
          this.uploadError.set(res.message || 'Failed to process the file.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        this.uploadError.set(err.error?.message || 'An error occurred while uploading.');
      },
    });
  }

  /** Builds the template client-side — no backend round trip needed for three static columns. */
  protected downloadTemplate(): void {
    const csv = 'ShiftCode,UserEmail,Date\nAM,agent@example.com,' + this.selectedDate() + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'shift-schedule-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
