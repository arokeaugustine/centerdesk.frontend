import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RoleService } from '../../services/role.service';
import { AvailablePermissionGroup, RoleDetail, RoleSummary } from '../../models/role.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { PERMISSION_LABELS } from '../../../users/models/user.models';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

type ModalType = 'create' | 'edit' | 'users' | 'permissions' | 'delete' | null;

@Component({
  selector: 'app-role-list-page',
  imports: [ReactiveFormsModule, Button, InputField, Label],
  templateUrl: './role-list-page.html',
})
export class RoleListPage implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly roles = signal<RoleSummary[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly activeModal = signal<ModalType>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly modalError = signal<string | null>(null);
  protected readonly deletingUid = signal<string | null>(null);

  protected readonly selectedRole = signal<RoleSummary | null>(null);
  protected readonly roleDetail = signal<RoleDetail | null>(null);
  protected readonly isLoadingDetail = signal(false);

  protected readonly permissionGroups = signal<AvailablePermissionGroup[]>([]);
  protected readonly selectedPermissions = signal<Set<string>>(new Set());
  protected readonly isSavingPermissions = signal(false);

  protected searchTerm = '';

  protected readonly canCreate = computed(() => this.permissions.has(TenantPermission.CanCreateRole));
  protected readonly canUpdate = computed(() => this.permissions.has(TenantPermission.CanUpdateRole));
  protected readonly canDelete = computed(() => this.permissions.has(TenantPermission.CanDeleteRole));
  protected readonly canViewUsers = computed(() => this.permissions.has(TenantPermission.CanViewUsers));
  protected readonly canManagePermissions = computed(() => this.permissions.has(TenantPermission.CanManageRolePermissions));

  protected readonly filteredRoles = computed(() => {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.roles();
    return this.roles().filter(r =>
      r.name.toLowerCase().includes(term) ||
      (r.description?.toLowerCase().includes(term) ?? false)
    );
  });

  protected readonly createForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    description: new FormControl(''),
  });

  protected readonly editForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    description: new FormControl(''),
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadAvailablePermissions();
  }

  private loadRoles(): void {
    this.isLoading.set(true);
    this.roleService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.roles.set(res.content ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private loadAvailablePermissions(): void {
    this.roleService.getAvailablePermissions().subscribe({
      next: (res) => { if (res.success) this.permissionGroups.set(res.content ?? []); },
      error: () => {},
    });
  }

  protected onSearch(): void {
    this.roles.update(r => [...r]);
  }

  protected openCreate(): void {
    this.createForm.reset();
    this.modalError.set(null);
    this.activeModal.set('create');
  }

  protected openEdit(role: RoleSummary): void {
    this.selectedRole.set(role);
    this.editForm.reset({ name: role.name, description: role.description ?? '' });
    this.modalError.set(null);
    this.activeModal.set('edit');
  }

  protected openUsers(role: RoleSummary): void {
    this.selectedRole.set(role);
    this.roleDetail.set(null);
    this.isLoadingDetail.set(true);
    this.activeModal.set('users');
    this.roleService.getOne(role.uid).subscribe({
      next: (res) => {
        if (res.success) this.roleDetail.set(res.content);
        this.isLoadingDetail.set(false);
      },
      error: () => this.isLoadingDetail.set(false),
    });
  }

  protected openPermissions(role: RoleSummary): void {
    this.selectedRole.set(role);
    this.selectedPermissions.set(new Set(role.permissions));
    this.activeModal.set('permissions');
  }

  protected openDelete(role: RoleSummary): void {
    this.selectedRole.set(role);
    this.modalError.set(null);
    this.activeModal.set('delete');
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.modalError.set(null);
  }

  protected isPermissionSelected(name: string): boolean {
    return this.selectedPermissions().has(name);
  }

  protected togglePermission(name: string): void {
    this.selectedPermissions.update(s => {
      const next = new Set(s);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  protected onSavePermissions(): void {
    const role = this.selectedRole();
    if (!role || this.isSavingPermissions()) return;
    this.isSavingPermissions.set(true);
    const permList = Array.from(this.selectedPermissions());
    this.roleService.setPermissions(role.uid, permList).subscribe({
      next: (res) => {
        if (res.success) {
          this.roles.update(list =>
            list.map(r => r.uid === role.uid ? { ...r, permissions: permList } : r)
          );
          this.toast.success('Permissions updated.');
          this.closeModal();
        } else {
          this.toast.error(res.message || 'Failed to update permissions.');
        }
        this.isSavingPermissions.set(false);
      },
      error: () => this.isSavingPermissions.set(false),
    });
  }

  protected onSubmitCreate(): void {
    if (this.isSubmitting()) return;
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.modalError.set(null);
    const v = this.createForm.getRawValue();
    this.roleService.create({ name: v.name!, description: v.description || null }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Role created.');
          this.closeModal();
          this.loadRoles();
        } else {
          this.modalError.set(res.message || 'Failed to create role.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onSubmitEdit(): void {
    if (this.isSubmitting()) return;
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const role = this.selectedRole();
    if (!role) return;
    this.isSubmitting.set(true);
    this.modalError.set(null);
    const v = this.editForm.getRawValue();
    this.roleService.update(role.uid, { name: v.name!, description: v.description || null }).subscribe({
      next: (res) => {
        if (res.success) {
          this.roles.update(list =>
            list.map(r => r.uid === role.uid ? { ...r, name: res.content.name, description: res.content.description } : r)
          );
          this.toast.success('Role updated.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to update role.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onConfirmDelete(): void {
    const role = this.selectedRole();
    if (!role || this.deletingUid()) return;
    this.deletingUid.set(role.uid);
    this.modalError.set(null);
    this.roleService.delete(role.uid).subscribe({
      next: () => {
        this.roles.update(list => list.filter(r => r.uid !== role.uid));
        this.toast.success(`"${role.name}" deleted.`);
        this.closeModal();
        this.deletingUid.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'Cannot delete this role.');
        this.deletingUid.set(null);
      },
    });
  }

  protected viewUser(uid: string): void {
    this.closeModal();
    this.router.navigate(['/users', uid]);
  }

  protected permissionLabel(name: string): string {
    const val = TenantPermission[name as keyof typeof TenantPermission];
    return val !== undefined ? (PERMISSION_LABELS[val] ?? name) : name;
  }

  protected userInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
