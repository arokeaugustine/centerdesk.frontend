import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ShiftService } from '../../services/shift.service';
import { Shift, toApiTimeValue, toTimeInputValue } from '../../models/shift.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';
import { Modal } from '../../../../shared/components/modal/modal';
import { Badge } from '../../../../shared/components/badge/badge';

type ModalType = 'create' | 'edit' | null;

@Component({
  selector: 'app-shift-list-page',
  imports: [
    ReactiveFormsModule, Button, InputField, Label, Modal, Badge,
  ],
  templateUrl: './shift-list-page.html',
})
export class ShiftListPage implements OnInit {
  private readonly shiftService = inject(ShiftService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly shifts = signal<Shift[]>([]);
  protected readonly isLoading = signal(false);

  protected readonly activeModal = signal<ModalType>(null);
  protected readonly editingUid = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly canCreate = computed(() => this.permissions.has(TenantPermission.CanCreateShift));
  protected readonly canUpdate = computed(() => this.permissions.has(TenantPermission.CanUpdateShift));
  protected readonly canDelete = computed(() => this.permissions.has(TenantPermission.CanDeleteShift));
  protected readonly canManageSchedules = computed(() =>
    this.permissions.has(TenantPermission.CanManageShiftSchedules)
  );

  protected readonly form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    code: new FormControl('', [Validators.required]),
    startTime: new FormControl('09:00', [Validators.required]),
    endTime: new FormControl('17:00', [Validators.required]),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.shiftService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.shifts.set(res.content ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected openSchedule(): void {
    this.router.navigate(['/shifts/schedule']);
  }

  protected openCreate(): void {
    this.form.reset({ name: '', code: '', startTime: '09:00', endTime: '17:00' });
    this.formError.set(null);
    this.editingUid.set(null);
    this.activeModal.set('create');
  }

  protected openEdit(shift: Shift): void {
    this.form.reset({
      name: shift.name,
      code: shift.code,
      startTime: toTimeInputValue(shift.startTime),
      endTime: toTimeInputValue(shift.endTime),
    });
    this.formError.set(null);
    this.editingUid.set(shift.uid);
    this.activeModal.set('edit');
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.formError.set(null);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    const payload = {
      name: v.name!,
      code: v.code!,
      startTime: toApiTimeValue(v.startTime!),
      endTime: toApiTimeValue(v.endTime!),
    };

    const editUid = this.editingUid();
    const req = editUid ? this.shiftService.update(editUid, payload) : this.shiftService.create(payload);

    req.subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(editUid ? 'Shift updated.' : 'Shift created.');
          this.activeModal.set(null);
          this.load();
        } else {
          this.formError.set(res.message || 'Failed to save shift.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onDeactivate(shift: Shift): void {
    this.shiftService.deactivate(shift.uid).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Shift deactivated.');
          this.load();
        } else {
          this.toast.error(res.message || 'Failed to deactivate shift.');
        }
      },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || 'An error occurred.'),
    });
  }

  protected formatTime(apiTime: string): string {
    const [h, m] = toTimeInputValue(apiTime).split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }
}
