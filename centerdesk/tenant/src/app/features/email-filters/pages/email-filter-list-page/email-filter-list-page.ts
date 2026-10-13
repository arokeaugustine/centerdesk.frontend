import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmailFilterService } from '../../services/email-filter.service';
import {
  EmailFilter, FILTER_ACTIONS, FILTER_TYPES, SET_CATEGORY_PREFIX, SET_SUBCATEGORY_PREFIX,
} from '../../models/email-filter.models';
import { EmailDeskService } from '../../../email-desks/services/email-desk.service';
import { EmailDesk } from '../../../email-desks/models/email-desk.models';
import { ServiceCategoryService } from '../../../service-categories/services/service-category.service';
import { ServiceCategory } from '../../../service-categories/models/service-category.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';
import { Modal } from '../../../../shared/components/modal/modal';
import { Badge } from '../../../../shared/components/badge/badge';
import { Table } from '../../../../shared/components/table/table';
import { TableHeader } from '../../../../shared/components/table/table-header';
import { TableBody } from '../../../../shared/components/table/table-body';
import { TableRow } from '../../../../shared/components/table/table-row';
import { TableCell } from '../../../../shared/components/table/table-cell';

type ModalType = 'create' | 'edit' | null;

/** Flattened sub-category option for the "Set sub-category" dropdown — tagged with its parent
 *  category name since sub-categories aren't unique by name across categories. */
interface SubCategoryOption {
  uid: string;
  label: string;
}

@Component({
  selector: 'app-email-filter-list-page',
  imports: [
    ReactiveFormsModule, Button, InputField, Label, Modal, Badge,
    Table, TableHeader, TableBody, TableRow, TableCell,
  ],
  templateUrl: './email-filter-list-page.html',
})
export class EmailFilterListPage implements OnInit {
  private readonly filterService = inject(EmailFilterService);
  private readonly emailDeskService = inject(EmailDeskService);
  private readonly categoryService = inject(ServiceCategoryService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly filters = signal<EmailFilter[]>([]);
  protected readonly emailDesks = signal<EmailDesk[]>([]);
  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly isLoading = signal(false);

  protected readonly activeModal = signal<ModalType>(null);
  protected readonly editingUid = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly filterTypes = FILTER_TYPES;
  protected readonly filterActions = FILTER_ACTIONS;

  protected readonly canManage = computed(() => this.permissions.has(TenantPermission.CanManageEmailFilters));

  // Flat list of every active sub-category across every category, each labelled
  // "Category → Subcategory" — a simpler single-select than a cascading category/subcategory
  // picker, since a filter rule only ever targets one specific sub-category.
  protected readonly subCategoryOptions = computed<SubCategoryOption[]>(() =>
    this.categories().flatMap((c) =>
      c.subCategories.map((s) => ({ uid: s.uid, label: `${c.name} → ${s.name}` }))
    )
  );

  protected readonly form = new FormGroup({
    emailDeskUid: new FormControl('', [Validators.required]),
    filterType: new FormControl('SenderDomain', [Validators.required]),
    filterValue: new FormControl('', [Validators.required]),
    action: new FormControl('Reject', [Validators.required]),
    categoryUid: new FormControl(''),
    subCategoryUid: new FormControl(''),
  });

  protected readonly isSetCategory = computed(() => this.form.get('action')?.value === 'SetCategory');
  protected readonly isSetSubCategory = computed(() => this.form.get('action')?.value === 'SetSubCategory');

  ngOnInit(): void {
    this.emailDeskService.getAll().subscribe({
      next: (res) => { if (res.success) this.emailDesks.set(res.content ?? []); },
    });
    this.categoryService.getAll().subscribe({
      next: (res) => { if (res.success) this.categories.set(res.content ?? []); },
    });
    this.load();

    this.form.get('action')?.valueChanges.subscribe(() => {
      this.form.get('categoryUid')?.updateValueAndValidity();
      this.form.get('subCategoryUid')?.updateValueAndValidity();
    });
  }

  private load(): void {
    this.isLoading.set(true);
    this.filterService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.filters.set(res.content ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected openCreate(): void {
    this.form.reset({
      emailDeskUid: '', filterType: 'SenderDomain', filterValue: '', action: 'Reject',
      categoryUid: '', subCategoryUid: '',
    });
    this.formError.set(null);
    this.editingUid.set(null);
    this.activeModal.set('create');
  }

  protected openEdit(filter: EmailFilter): void {
    const isSetCategory = filter.action.startsWith(SET_CATEGORY_PREFIX);
    const isSetSubCategory = filter.action.startsWith(SET_SUBCATEGORY_PREFIX);
    this.form.reset({
      emailDeskUid: filter.emailDeskUid,
      filterType: filter.filterType,
      filterValue: filter.filterValue,
      action: isSetSubCategory ? 'SetSubCategory' : isSetCategory ? 'SetCategory' : filter.action,
      categoryUid: isSetCategory ? filter.action.slice(SET_CATEGORY_PREFIX.length) : '',
      subCategoryUid: isSetSubCategory ? filter.action.slice(SET_SUBCATEGORY_PREFIX.length) : '',
    });
    this.formError.set(null);
    this.editingUid.set(filter.uid);
    this.activeModal.set('edit');
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.formError.set(null);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.isSetCategory() && !this.form.get('categoryUid')?.value) {
      this.formError.set('Select a service category.');
      return;
    }
    if (this.isSetSubCategory() && !this.form.get('subCategoryUid')?.value) {
      this.formError.set('Select a sub-category.');
      return;
    }
    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();
    const action = v.action === 'SetCategory' ? `${SET_CATEGORY_PREFIX}${v.categoryUid}`
      : v.action === 'SetSubCategory' ? `${SET_SUBCATEGORY_PREFIX}${v.subCategoryUid}`
      : v.action!;

    const editUid = this.editingUid();
    const req = editUid
      ? this.filterService.update(editUid, { filterType: v.filterType, filterValue: v.filterValue, action })
      : this.filterService.create({
          emailDeskUid: v.emailDeskUid!, filterType: v.filterType!, filterValue: v.filterValue!, action,
        });

    req.subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(editUid ? 'Filter updated.' : 'Filter created.');
          this.activeModal.set(null);
          this.load();
        } else {
          this.formError.set(res.message || 'Failed to save filter.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onDeactivate(filter: EmailFilter): void {
    this.filterService.deactivate(filter.uid).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Filter deactivated.');
          this.load();
        } else {
          this.toast.error(res.message || 'Failed to deactivate filter.');
        }
      },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || 'An error occurred.'),
    });
  }

  protected describeAction(action: string): string {
    if (action.startsWith(SET_SUBCATEGORY_PREFIX)) {
      const subCategoryUid = action.slice(SET_SUBCATEGORY_PREFIX.length);
      const option = this.subCategoryOptions().find((s) => s.uid === subCategoryUid);
      return `Set sub-category: ${option?.label ?? 'Unknown'}`;
    }
    if (action.startsWith(SET_CATEGORY_PREFIX)) {
      const categoryUid = action.slice(SET_CATEGORY_PREFIX.length);
      const category = this.categories().find((c) => c.uid === categoryUid);
      return `Set category: ${category?.name ?? 'Unknown'}`;
    }
    return this.filterActions.find((a) => a.value === action)?.label ?? action;
  }
}
