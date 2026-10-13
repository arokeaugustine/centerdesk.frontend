import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { KnowledgeBaseDocument } from '../../models/knowledge-base.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

@Component({
  selector: 'app-knowledge-base-page',
  imports: [ReactiveFormsModule, NgClass, DatePipe, Button, InputField, Label],
  templateUrl: './knowledge-base-page.html',
})
export class KnowledgeBasePage implements OnInit {
  private readonly knowledgeBaseService = inject(KnowledgeBaseService);
  private readonly toast = inject(ToastService);

  protected readonly documents = signal<KnowledgeBaseDocument[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isDeactivating = signal(false);

  protected readonly showUploadModal = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly showDeactivateConfirm = signal(false);
  protected readonly deactivatingDocument = signal<KnowledgeBaseDocument | null>(null);

  protected readonly activeCount = computed(() => this.documents().filter(d => d.isActive).length);

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.isLoading.set(true);
    this.knowledgeBaseService.getAll().subscribe({
      next: (res) => {
        if (res.success) {
          this.documents.set(res.content);
        } else {
          this.toast.error(res.message || 'Failed to load knowledge base documents.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  protected openUpload(): void {
    this.form.reset({ title: '', content: '' });
    this.formError.set(null);
    this.showUploadModal.set(true);
  }

  protected closeUpload(): void {
    this.showUploadModal.set(false);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    this.knowledgeBaseService.upload({ title: v.title, content: v.content }).subscribe({
      next: (res) => {
        if (res.success) {
          this.showUploadModal.set(false);
          this.toast.success('Document uploaded — it will be searchable once embedding finishes.');
          this.loadDocuments();
        } else {
          this.formError.set(res.message || 'Failed to upload document.');
          this.toast.error(res.message || 'Failed to upload document.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected openDeactivate(document: KnowledgeBaseDocument): void {
    this.deactivatingDocument.set(document);
    this.showDeactivateConfirm.set(true);
  }

  protected closeDeactivate(): void {
    this.showDeactivateConfirm.set(false);
    this.deactivatingDocument.set(null);
  }

  protected onDeactivate(): void {
    if (this.isDeactivating()) return;
    const document = this.deactivatingDocument();
    if (!document) return;

    this.isDeactivating.set(true);
    this.knowledgeBaseService.deactivate(document.uid).subscribe({
      next: () => {
        this.documents.update(docs => docs.map(d => d.uid === document.uid ? { ...d, isActive: false } : d));
        this.showDeactivateConfirm.set(false);
        this.deactivatingDocument.set(null);
        this.isDeactivating.set(false);
        this.toast.success(`"${document.title}" removed from the AI knowledge base.`);
      },
      error: () => {
        this.isDeactivating.set(false);
      },
    });
  }
}
