import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { EmailDeskService } from '../../services/email-desk.service';
import { EmailDesk } from '../../models/email-desk.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

@Component({
  selector: 'app-email-desk-page',
  imports: [ReactiveFormsModule, NgClass, Button, InputField, Label],
  templateUrl: './email-desk-page.html',
})
export class EmailDeskPage implements OnInit {
  private readonly emailDeskService = inject(EmailDeskService);
  private readonly toast = inject(ToastService);

  protected readonly desks = signal<EmailDesk[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly testingUid = signal<string | null>(null);
  protected readonly testResults = signal<Record<string, boolean>>({});

  protected readonly modalMode = signal<'create' | 'edit' | null>(null);
  protected readonly showFormModal = computed(() => this.modalMode() !== null);
  protected readonly editingDesk = signal<EmailDesk | null>(null);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly deletingDesk = signal<EmailDesk | null>(null);

  protected readonly formError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    emailAddress: new FormControl('', [Validators.required, Validators.email]),
    isDefault: new FormControl(false),
    isActive: new FormControl(true),
    imapHost: new FormControl('', [Validators.required]),
    imapPort: new FormControl('993', [Validators.required]),
    imapUseSsl: new FormControl(true),
    imapUsername: new FormControl('', [Validators.required]),
    imapPassword: new FormControl(''),
    smtpHost: new FormControl('', [Validators.required]),
    smtpPort: new FormControl('587', [Validators.required]),
    smtpUseTls: new FormControl(true),
    smtpUsername: new FormControl('', [Validators.required]),
    smtpPassword: new FormControl(''),
  });

  ngOnInit(): void {
    this.loadDesks();
  }

  private loadDesks(): void {
    this.isLoading.set(true);
    this.emailDeskService.getAll().subscribe({
      next: (res) => {
        if (res.success) {
          this.desks.set(res.content);
        } else {
          this.toast.error(res.message || 'Failed to load email desks.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.form.reset({
      name: '', emailAddress: '', isDefault: false, isActive: true,
      imapHost: '', imapPort: '993', imapUseSsl: true, imapUsername: '', imapPassword: '',
      smtpHost: '', smtpPort: '587', smtpUseTls: true, smtpUsername: '', smtpPassword: '',
    });
    this.form.controls.emailAddress.enable();
    this.form.controls.imapPassword.setValidators([Validators.required]);
    this.form.controls.smtpPassword.setValidators([Validators.required]);
    this.form.controls.imapPassword.updateValueAndValidity();
    this.form.controls.smtpPassword.updateValueAndValidity();
    this.editingDesk.set(null);
    this.formError.set(null);
    this.modalMode.set('create');
  }

  protected openEdit(desk: EmailDesk): void {
    this.form.reset({
      name: desk.name,
      emailAddress: desk.emailAddress,
      isDefault: desk.isDefault,
      isActive: desk.isActive,
      imapHost: desk.imapHost,
      imapPort: String(desk.imapPort),
      imapUseSsl: desk.imapUseSsl,
      imapUsername: desk.imapUsername,
      imapPassword: '',
      smtpHost: desk.smtpHost,
      smtpPort: String(desk.smtpPort),
      smtpUseTls: desk.smtpUseTls,
      smtpUsername: desk.smtpUsername,
      smtpPassword: '',
    });
    this.form.controls.emailAddress.disable();
    this.form.controls.imapPassword.clearValidators();
    this.form.controls.smtpPassword.clearValidators();
    this.form.controls.imapPassword.updateValueAndValidity();
    this.form.controls.smtpPassword.updateValueAndValidity();
    this.editingDesk.set(desk);
    this.formError.set(null);
    this.modalMode.set('edit');
  }

  protected closeForm(): void {
    this.modalMode.set(null);
    this.editingDesk.set(null);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.modalMode() === 'create' ? this.doCreate() : this.doUpdate();
  }

  private doCreate(): void {
    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    this.emailDeskService.create({
      name: v.name!,
      emailAddress: v.emailAddress!,
      isDefault: v.isDefault ?? false,
      imapHost: v.imapHost!,
      imapPort: parseInt(v.imapPort!),
      imapUseSsl: v.imapUseSsl ?? true,
      imapUsername: v.imapUsername!,
      imapPassword: v.imapPassword!,
      smtpHost: v.smtpHost!,
      smtpPort: parseInt(v.smtpPort!),
      smtpUseTls: v.smtpUseTls ?? true,
      smtpUsername: v.smtpUsername!,
      smtpPassword: v.smtpPassword!,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.desks.update(d => [...d, res.content]);
          this.modalMode.set(null);
          this.toast.success('Email desk created successfully.');
        } else {
          this.formError.set(res.message || 'Failed to create email desk.');
          this.toast.error(res.message || 'Failed to create email desk.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  private doUpdate(): void {
    this.isSubmitting.set(true);
    this.formError.set(null);
    const desk = this.editingDesk()!;
    const v = this.form.getRawValue();

    this.emailDeskService.update(desk.uid, {
      name: v.name || null,
      isDefault: v.isDefault,
      isActive: v.isActive,
      imapHost: v.imapHost || null,
      imapPort: v.imapPort ? parseInt(v.imapPort) : null,
      imapUseSsl: v.imapUseSsl,
      imapUsername: v.imapUsername || null,
      imapPassword: v.imapPassword || null,
      smtpHost: v.smtpHost || null,
      smtpPort: v.smtpPort ? parseInt(v.smtpPort) : null,
      smtpUseTls: v.smtpUseTls,
      smtpUsername: v.smtpUsername || null,
      smtpPassword: v.smtpPassword || null,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.desks.update(d => d.map(x => x.uid === desk.uid ? res.content : x));
          this.modalMode.set(null);
          this.editingDesk.set(null);
          this.toast.success('Email desk updated successfully.');
        } else {
          this.formError.set(res.message || 'Failed to update email desk.');
          this.toast.error(res.message || 'Failed to update email desk.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected openDelete(desk: EmailDesk): void {
    this.deletingDesk.set(desk);
    this.showDeleteConfirm.set(true);
  }

  protected closeDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingDesk.set(null);
  }

  protected onDelete(): void {
    if (this.isDeleting()) return;
    const desk = this.deletingDesk();
    if (!desk) return;

    this.isDeleting.set(true);
    this.emailDeskService.delete(desk.uid).subscribe({
      next: () => {
        this.desks.update(d => d.filter(x => x.uid !== desk.uid));
        this.showDeleteConfirm.set(false);
        this.deletingDesk.set(null);
        this.isDeleting.set(false);
        this.toast.success(`"${desk.name}" deleted.`);
      },
      error: () => {
        this.isDeleting.set(false);
      },
    });
  }

  protected testConnection(desk: EmailDesk): void {
    if (this.testingUid()) return;
    this.testingUid.set(desk.uid);

    this.emailDeskService.testConnection(desk.uid).subscribe({
      next: (res) => {
        if (res.success) {
          const connected = res.content.connected;
          this.testResults.update(r => ({ ...r, [desk.uid]: connected }));
          if (connected) {
            this.toast.success(`"${desk.name}" IMAP connection successful.`);
          } else {
            this.toast.error(`"${desk.name}" IMAP connection failed. Check your settings.`);
          }
        } else {
          this.testResults.update(r => ({ ...r, [desk.uid]: false }));
          this.toast.error(res.message || 'Connection test failed.');
        }
        this.testingUid.set(null);
      },
      error: () => {
        this.testResults.update(r => ({ ...r, [desk.uid]: false }));
        this.testingUid.set(null);
      },
    });
  }

  protected getTestResult(uid: string): boolean | undefined {
    return this.testResults()[uid];
  }
}
