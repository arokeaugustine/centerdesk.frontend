import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { RoleService } from '../../../roles/services/role.service';
import { RoleSummary } from '../../../roles/models/role.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  UserDetail,
  hexToPermission,
  permissionToHex,
} from '../../models/user.models';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

type ModalType = 'edit' | 'password' | 'deactivate' | 'permissions' | null;

@Component({
  selector: 'app-user-detail-page',
  imports: [ReactiveFormsModule, NgClass, Button, InputField, Label],
  templateUrl: './user-detail-page.html',
})
export class UserDetailPage implements OnInit {
  protected readonly uid = input.required<string>();

  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly user = signal<UserDetail | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly activeModal = signal<ModalType>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly modalError = signal<string | null>(null);

  protected readonly isDeactivating = signal(false);
  protected readonly isReactivating = signal(false);
  protected readonly assigningRole = signal(false);
  protected readonly removingRoleUid = signal<string | null>(null);
  protected readonly savingPermissions = signal(false);

  protected readonly availableRoles = signal<RoleSummary[]>([]);
  protected readonly assignableRoles = computed(() => {
    const u = this.user();
    if (!u) return this.availableRoles();
    const assigned = new Set(u.roles.map(r => r.uid));
    return this.availableRoles().filter(r => !assigned.has(r.uid));
  });

  protected readonly permissionGroups = PERMISSION_GROUPS;
  protected readonly permissionLabels = PERMISSION_LABELS;
  protected readonly selectedPermissions = signal<Set<TenantPermission>>(new Set());

  protected readonly canEdit = computed(() => this.permissions.has(TenantPermission.CanEditUser));
  protected readonly canDeactivate = computed(() => this.permissions.has(TenantPermission.CanDeleteUser));
  protected readonly canManagePermissions = computed(() => this.permissions.has(TenantPermission.CanManageUserPermissions));

  protected readonly editForm = new FormGroup({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl('', [Validators.required]),
    phoneNumber: new FormControl(''),
    unit: new FormControl(''),
    group: new FormControl(''),
    division: new FormControl(''),
    isAdmin: new FormControl(false),
  });

  protected readonly passwordForm = new FormGroup({
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
  }, { validators: this.passwordsMatch });

  protected readonly deactivateForm = new FormGroup({
    remark: new FormControl(''),
  });

  protected readonly assignRoleForm = new FormGroup({
    roleUid: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    this.loadUser(this.uid());
    this.roleService.getAll().subscribe({
      next: (res) => { if (res.success) this.availableRoles.set(res.content ?? []); },
      error: () => {},
    });
  }

  private loadUser(uid: string): void {
    this.isLoading.set(true);
    this.userService.getOne(uid).subscribe({
      next: (res) => {
        if (res.success) this.user.set(res.content);
        else this.router.navigate(['/users']);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/users']);
      },
    });
  }

  protected goBack(): void { this.router.navigate(['/users']); }

  protected openModal(type: ModalType): void {
    this.modalError.set(null);
    const u = this.user();
    if (type === 'edit' && u) {
      this.editForm.reset({
        firstName: u.firstName, lastName: u.lastName,
        phoneNumber: u.phoneNumber ?? '', unit: u.unit ?? '',
        group: u.group ?? '', division: u.division ?? '', isAdmin: u.isAdmin,
      });
    }
    if (type === 'password') this.passwordForm.reset();
    if (type === 'deactivate') this.deactivateForm.reset();
    if (type === 'permissions' && u) {
      const set = new Set<TenantPermission>();
      for (const hex of u.directPermissions) {
        const p = hexToPermission(hex);
        if (p !== null) set.add(p);
      }
      this.selectedPermissions.set(set);
    }
    this.activeModal.set(type);
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.modalError.set(null);
  }

  protected onSaveEdit(): void {
    if (this.isSubmitting()) return;
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const v = this.editForm.getRawValue();
    this.userService.update(this.uid(), {
      firstName: v.firstName || null,
      lastName: v.lastName || null,
      phoneNumber: v.phoneNumber || null,
      unit: v.unit || null,
      group: v.group || null,
      division: v.division || null,
      isAdmin: v.isAdmin,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.user.update(u => u ? { ...u, firstName: v.firstName!, lastName: v.lastName!, phoneNumber: v.phoneNumber || null, unit: v.unit || null, group: v.group || null, division: v.division || null } : u);
          this.toast.success('Profile updated.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to update.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onResetPassword(): void {
    if (this.isSubmitting()) return;
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const newPassword = this.passwordForm.getRawValue().newPassword!;
    this.userService.resetPassword(this.uid(), newPassword).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Password reset successfully.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to reset password.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onDeactivate(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    const remark = this.deactivateForm.getRawValue().remark || undefined;
    this.userService.deactivate(this.uid(), remark).subscribe({
      next: (res) => {
        if (res.success) {
          this.user.update(u => u ? { ...u, isActive: false } : u);
          this.toast.success('User deactivated.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to deactivate.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onReactivate(): void {
    if (this.isReactivating()) return;
    this.isReactivating.set(true);
    this.userService.reactivate(this.uid()).subscribe({
      next: () => {
        this.user.update(u => u ? { ...u, isActive: true, deactivatedAt: null, deactivationRemark: null } : u);
        this.toast.success('User reactivated.');
        this.isReactivating.set(false);
      },
      error: () => this.isReactivating.set(false),
    });
  }

  protected onAssignRole(): void {
    if (this.assigningRole()) return;
    if (this.assignRoleForm.invalid) { this.assignRoleForm.markAllAsTouched(); return; }
    const roleUid = this.assignRoleForm.getRawValue().roleUid!;
    this.assigningRole.set(true);
    this.userService.assignRole(this.uid(), roleUid).subscribe({
      next: () => {
        this.toast.success('Role assigned.');
        this.assignRoleForm.setValue({ roleUid: '' });
        this.loadUser(this.uid());
        this.assigningRole.set(false);
      },
      error: () => this.assigningRole.set(false),
    });
  }

  protected onRemoveRole(roleUid: string): void {
    if (this.removingRoleUid()) return;
    this.removingRoleUid.set(roleUid);
    this.userService.removeRole(this.uid(), roleUid).subscribe({
      next: () => {
        this.user.update(u => u ? { ...u, roles: u.roles.filter(r => r.uid !== roleUid) } : u);
        this.toast.success('Role removed.');
        this.removingRoleUid.set(null);
      },
      error: () => this.removingRoleUid.set(null),
    });
  }

  protected togglePermission(p: TenantPermission): void {
    this.selectedPermissions.update(set => {
      const next = new Set(set);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  }

  protected isPermissionSelected(p: TenantPermission): boolean {
    return this.selectedPermissions().has(p);
  }

  protected onSavePermissions(): void {
    if (this.savingPermissions()) return;
    this.savingPermissions.set(true);
    const hexList = [...this.selectedPermissions()].map(permissionToHex);
    this.userService.setDirectPermissions(this.uid(), hexList).subscribe({
      next: (res) => {
        if (res.success) {
          this.user.update(u => u ? { ...u, directPermissions: hexList } : u);
          this.toast.success('Permissions saved.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to save permissions.');
        }
        this.savingPermissions.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.savingPermissions.set(false);
      },
    });
  }

  protected permissionLabel(hex: string): string {
    const p = hexToPermission(hex);
    return p !== null ? (this.permissionLabels[p] ?? hex) : hex;
  }

  protected initials(u: UserDetail): string {
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  }

  protected formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  private passwordsMatch(control: AbstractControl) {
    const pw = control.get('newPassword')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return pw === confirm ? null : { mismatch: true };
  }
}
