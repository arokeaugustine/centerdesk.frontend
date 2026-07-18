import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { UserSummary } from '../../models/user.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { RoleService } from '../../../roles/services/role.service';
import { RoleSummary } from '../../../roles/models/role.models';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

@Component({
  selector: 'app-user-list-page',
  imports: [ReactiveFormsModule, NgClass, Button, InputField, Label],
  templateUrl: './user-list-page.html',
})
export class UserListPage implements OnInit {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly users = signal<UserSummary[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly totalItems = signal(0);
  protected readonly currentPage = signal(1);
  protected readonly hasNextPage = signal(false);
  protected readonly hasPreviousPage = signal(false);

  protected searchTerm = '';
  protected filterActive: 'all' | 'active' | 'inactive' = 'all';

  protected readonly showCreateModal = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly deactivatingUid = signal<string | null>(null);
  protected readonly reactivatingUid = signal<string | null>(null);

  protected readonly availableRoles = signal<RoleSummary[]>([]);

  protected readonly canAdd = computed(() => this.permissions.has(TenantPermission.CanAddUsers));
  protected readonly canEdit = computed(() => this.permissions.has(TenantPermission.CanEditUser));
  protected readonly canDeactivate = computed(() => this.permissions.has(TenantPermission.CanDeleteUser));
  protected readonly canView = computed(() => this.permissions.has(TenantPermission.CanViewUsers));

  protected readonly createForm = new FormGroup({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phoneNumber: new FormControl(''),
    unit: new FormControl(''),
    group: new FormControl(''),
    division: new FormControl(''),
    roleUid: new FormControl(''),
  });

  ngOnInit(): void {
    this.loadUsers(1);
    this.loadRoles();
  }

  private loadRoles(): void {
    this.roleService.getAll().subscribe({
      next: (res) => { if (res.success) this.availableRoles.set(res.content ?? []); },
      error: () => {},
    });
  }

  private loadUsers(page: number): void {
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.userService.getAll({
      page,
      pageSize: 20,
      search: this.searchTerm || undefined,
      isActive: this.filterActive === 'all' ? undefined : this.filterActive === 'active',
    }).subscribe({
      next: (res) => {
        if (res.success && res.content) {
          const { data, total, page: p, pageSize } = res.content;
          this.users.set(data ?? []);
          this.totalItems.set(total);
          this.currentPage.set(p);
          this.hasNextPage.set(p * pageSize < total);
          this.hasPreviousPage.set(p > 1);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected onSearch(): void { this.loadUsers(1); }
  protected onFilterChange(value: 'all' | 'active' | 'inactive'): void {
    this.filterActive = value;
    this.loadUsers(1);
  }
  protected nextPage(): void { if (this.hasNextPage()) this.loadUsers(this.currentPage() + 1); }
  protected prevPage(): void { if (this.hasPreviousPage()) this.loadUsers(this.currentPage() - 1); }

  protected viewUser(uid: string): void { this.router.navigate(['/users', uid]); }

  protected openCreate(): void {
    this.createForm.reset();
    this.formError.set(null);
    this.showCreateModal.set(true);
  }

  protected closeCreate(): void { this.showCreateModal.set(false); }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.createForm.getRawValue();

    this.userService.create({
      firstName: v.firstName!,
      lastName: v.lastName!,
      email: v.email!,
      phoneNumber: v.phoneNumber || null,
      unit: v.unit || null,
      group: v.group || null,
      division: v.division || null,
      roleUids: v.roleUid ? [v.roleUid] : undefined,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('User created successfully.');
          this.showCreateModal.set(false);
          this.router.navigate(['/users', res.content.uid]);
        } else {
          this.formError.set(res.message || 'Failed to create user.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected deactivateUser(user: UserSummary): void {
    if (this.deactivatingUid()) return;
    this.deactivatingUid.set(user.uid);
    this.userService.deactivate(user.uid).subscribe({
      next: () => {
        this.users.update(list => list.map(u => u.uid === user.uid ? { ...u, isActive: false } : u));
        this.toast.success(`${user.firstName} ${user.lastName} deactivated.`);
        this.deactivatingUid.set(null);
      },
      error: () => this.deactivatingUid.set(null),
    });
  }

  protected reactivateUser(user: UserSummary): void {
    if (this.reactivatingUid()) return;
    this.reactivatingUid.set(user.uid);
    this.userService.reactivate(user.uid).subscribe({
      next: () => {
        this.users.update(list => list.map(u => u.uid === user.uid ? { ...u, isActive: true } : u));
        this.toast.success(`${user.firstName} ${user.lastName} reactivated.`);
        this.reactivatingUid.set(null);
      },
      error: () => this.reactivatingUid.set(null),
    });
  }

  protected initials(user: UserSummary): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
