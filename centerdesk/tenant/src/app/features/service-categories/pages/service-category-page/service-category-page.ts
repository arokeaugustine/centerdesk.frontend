import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServiceCategoryService } from '../../services/service-category.service';
import { ServiceCategory, ServiceSubCategory } from '../../models/service-category.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

type ModalType = 'createCategory' | 'editCategory' | 'deleteCategory' | 'subcategories' | null;

@Component({
  selector: 'app-service-category-page',
  imports: [ReactiveFormsModule, Button, InputField, Label],
  templateUrl: './service-category-page.html',
})
export class ServiceCategoryPage implements OnInit {
  private readonly svc = inject(ServiceCategoryService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly activeModal = signal<ModalType>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly modalError = signal<string | null>(null);

  protected readonly selectedCategory = signal<ServiceCategory | null>(null);

  protected readonly deletingUid = signal<string | null>(null);
  protected readonly editingSubUid = signal<string | null>(null);
  protected readonly deletingSubUid = signal<string | null>(null);
  protected readonly isAddingSubcategory = signal(false);

  protected searchTerm = '';

  protected readonly canCreate = computed(() => this.permissions.has(TenantPermission.CanCreateServiceCategory));
  protected readonly canUpdate = computed(() => this.permissions.has(TenantPermission.CanUpdateServiceCategory));
  protected readonly canDelete = computed(() => this.permissions.has(TenantPermission.CanDeleteServiceCategory));

  protected readonly filteredCategories = computed(() => {
    const term = this.searchTerm.toLowerCase();
    if (!term) return this.categories();
    return this.categories().filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.description?.toLowerCase().includes(term) ?? false)
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

  protected readonly addSubForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    description: new FormControl(''),
  });

  protected readonly editSubForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    description: new FormControl(''),
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.isLoading.set(true);
    this.svc.getAll().subscribe({
      next: (res) => {
        if (res.success) this.categories.set(res.content ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected onSearch(): void {
    this.categories.update(c => [...c]);
  }

  protected openCreate(): void {
    this.createForm.reset();
    this.modalError.set(null);
    this.activeModal.set('createCategory');
  }

  protected openEdit(cat: ServiceCategory): void {
    this.selectedCategory.set(cat);
    this.editForm.reset({ name: cat.name, description: cat.description ?? '' });
    this.modalError.set(null);
    this.activeModal.set('editCategory');
  }

  protected openDelete(cat: ServiceCategory): void {
    this.selectedCategory.set(cat);
    this.modalError.set(null);
    this.activeModal.set('deleteCategory');
  }

  protected openSubcategories(cat: ServiceCategory): void {
    this.selectedCategory.set(cat);
    this.editingSubUid.set(null);
    this.addSubForm.reset();
    this.editSubForm.reset();
    this.activeModal.set('subcategories');
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.modalError.set(null);
    this.editingSubUid.set(null);
  }

  protected onSubmitCreate(): void {
    if (this.isSubmitting()) return;
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.modalError.set(null);
    const v = this.createForm.getRawValue();
    this.svc.create({ name: v.name!, description: v.description || null }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Category created.');
          this.closeModal();
          this.loadCategories();
        } else {
          this.modalError.set(res.message || 'Failed to create category.');
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
    const cat = this.selectedCategory();
    if (!cat) return;
    this.isSubmitting.set(true);
    this.modalError.set(null);
    const v = this.editForm.getRawValue();
    this.svc.update(cat.uid, { name: v.name!, description: v.description || null }).subscribe({
      next: (res) => {
        if (res.success) {
          this.categories.update(list =>
            list.map(c => c.uid === cat.uid ? { ...c, name: res.content.name, description: res.content.description } : c)
          );
          this.toast.success('Category updated.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to update category.');
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
    const cat = this.selectedCategory();
    if (!cat || this.deletingUid()) return;
    this.deletingUid.set(cat.uid);
    this.modalError.set(null);
    this.svc.delete(cat.uid).subscribe({
      next: () => {
        this.categories.update(list => list.filter(c => c.uid !== cat.uid));
        this.toast.success(`"${cat.name}" deleted.`);
        this.closeModal();
        this.deletingUid.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'Cannot delete this category.');
        this.deletingUid.set(null);
      },
    });
  }

  protected onAddSubcategory(): void {
    if (this.isAddingSubcategory()) return;
    if (this.addSubForm.invalid) { this.addSubForm.markAllAsTouched(); return; }
    const cat = this.selectedCategory();
    if (!cat) return;
    this.isAddingSubcategory.set(true);
    const v = this.addSubForm.getRawValue();
    this.svc.createSubCategory(cat.uid, { name: v.name!, description: v.description || null }).subscribe({
      next: (res) => {
        if (res.success) {
          const newSub: ServiceSubCategory = { uid: res.content.uid, name: res.content.name, description: v.description || null, isActive: true };
          this.categories.update(list =>
            list.map(c => c.uid === cat.uid ? { ...c, subCategories: [...c.subCategories, newSub] } : c)
          );
          this.selectedCategory.update(c => c ? { ...c, subCategories: [...c.subCategories, newSub] } : c);
          this.addSubForm.reset();
          this.toast.success('Subcategory added.');
        } else {
          this.toast.error(res.message || 'Failed to add subcategory.');
        }
        this.isAddingSubcategory.set(false);
      },
      error: () => this.isAddingSubcategory.set(false),
    });
  }

  protected startEditSub(sub: ServiceSubCategory): void {
    this.editingSubUid.set(sub.uid);
    this.editSubForm.reset({ name: sub.name, description: sub.description ?? '' });
  }

  protected cancelEditSub(): void {
    this.editingSubUid.set(null);
    this.editSubForm.reset();
  }

  protected onSaveSubcategory(): void {
    if (this.isSubmitting()) return;
    if (this.editSubForm.invalid) { this.editSubForm.markAllAsTouched(); return; }
    const subUid = this.editingSubUid();
    const cat = this.selectedCategory();
    if (!subUid || !cat) return;
    this.isSubmitting.set(true);
    const v = this.editSubForm.getRawValue();
    this.svc.updateSubCategory(subUid, { name: v.name!, description: v.description || null }).subscribe({
      next: (res) => {
        if (res.success) {
          const updateSub = (subs: ServiceSubCategory[]) =>
            subs.map(s => s.uid === subUid ? { ...s, name: res.content.name, description: res.content.description } : s);
          this.categories.update(list =>
            list.map(c => c.uid === cat.uid ? { ...c, subCategories: updateSub(c.subCategories) } : c)
          );
          this.selectedCategory.update(c => c ? { ...c, subCategories: updateSub(c.subCategories) } : c);
          this.toast.success('Subcategory updated.');
          this.cancelEditSub();
        } else {
          this.toast.error(res.message || 'Failed to update subcategory.');
        }
        this.isSubmitting.set(false);
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  protected onDeleteSubcategory(sub: ServiceSubCategory): void {
    if (this.deletingSubUid()) return;
    this.deletingSubUid.set(sub.uid);
    const cat = this.selectedCategory();
    if (!cat) return;
    this.svc.deleteSubCategory(sub.uid).subscribe({
      next: () => {
        const filterSub = (subs: ServiceSubCategory[]) => subs.filter(s => s.uid !== sub.uid);
        this.categories.update(list =>
          list.map(c => c.uid === cat.uid ? { ...c, subCategories: filterSub(c.subCategories) } : c)
        );
        this.selectedCategory.update(c => c ? { ...c, subCategories: filterSub(c.subCategories) } : c);
        this.toast.success('Subcategory removed.');
        this.deletingSubUid.set(null);
      },
      error: () => this.deletingSubUid.set(null),
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
