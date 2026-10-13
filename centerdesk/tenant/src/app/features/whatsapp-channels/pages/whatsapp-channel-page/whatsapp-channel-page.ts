import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { WhatsAppChannelService } from '../../services/whatsapp-channel.service';
import { WhatsAppChannel } from '../../models/whatsapp-channel.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

@Component({
  selector: 'app-whatsapp-channel-page',
  imports: [ReactiveFormsModule, NgClass, DatePipe, Button, InputField, Label],
  templateUrl: './whatsapp-channel-page.html',
})
export class WhatsAppChannelPage implements OnInit {
  private readonly channelService = inject(WhatsAppChannelService);
  private readonly toast = inject(ToastService);

  protected readonly channels = signal<WhatsAppChannel[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isDeactivating = signal(false);
  protected readonly testingUid = signal<string | null>(null);

  protected readonly modalMode = signal<'create' | 'edit' | null>(null);
  protected readonly showFormModal = computed(() => this.modalMode() !== null);
  protected readonly editingChannel = signal<WhatsAppChannel | null>(null);
  protected readonly formError = signal<string | null>(null);

  // "Connect to Meta" instructions: webhook URL + verify token for one channel.
  protected readonly setupChannel = signal<WhatsAppChannel | null>(null);

  protected readonly deactivatingChannel = signal<WhatsAppChannel | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    displayPhoneNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phoneNumberId: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern('^[0-9]+$')] }),
    businessAccountId: new FormControl('', { nonNullable: true }),
    accessToken: new FormControl('', { nonNullable: true }),
    appSecret: new FormControl('', { nonNullable: true }),
    isActive: new FormControl<boolean>(true, { nonNullable: true }),
    aiHandlesAllMessages: new FormControl<boolean>(false, { nonNullable: true }),
    sendAcknowledgement: new FormControl<boolean>(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadChannels();
  }

  private loadChannels(): void {
    this.isLoading.set(true);
    this.channelService.getAll().subscribe({
      next: (res) => {
        if (res.success) {
          this.channels.set(res.content);
        } else {
          this.toast.error(res.message || 'Failed to load WhatsApp numbers.');
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected openCreate(): void {
    this.form.reset({
      name: '', displayPhoneNumber: '', phoneNumberId: '', businessAccountId: '',
      accessToken: '', appSecret: '', isActive: true, aiHandlesAllMessages: false, sendAcknowledgement: true,
    });
    // Both secrets are mandatory when connecting a number; on edit they're "leave blank to keep".
    this.setSecretsRequired(true);
    this.editingChannel.set(null);
    this.formError.set(null);
    this.modalMode.set('create');
  }

  protected openEdit(channel: WhatsAppChannel): void {
    this.form.reset({
      name: channel.name,
      displayPhoneNumber: channel.displayPhoneNumber,
      phoneNumberId: channel.phoneNumberId,
      businessAccountId: channel.businessAccountId ?? '',
      accessToken: '',
      appSecret: '',
      isActive: channel.isActive,
      aiHandlesAllMessages: channel.aiHandlesAllMessages,
      sendAcknowledgement: channel.sendAcknowledgement,
    });
    this.setSecretsRequired(false);
    this.editingChannel.set(channel);
    this.formError.set(null);
    this.modalMode.set('edit');
  }

  private setSecretsRequired(required: boolean): void {
    for (const control of [this.form.controls.accessToken, this.form.controls.appSecret]) {
      control.setValidators(required ? [Validators.required] : []);
      control.updateValueAndValidity();
    }
  }

  protected closeForm(): void {
    this.modalMode.set(null);
    this.editingChannel.set(null);
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

    this.channelService.create({
      name: v.name.trim(),
      displayPhoneNumber: v.displayPhoneNumber.trim(),
      phoneNumberId: v.phoneNumberId.trim(),
      businessAccountId: v.businessAccountId.trim() || null,
      accessToken: v.accessToken.trim(),
      appSecret: v.appSecret.trim(),
      aiHandlesAllMessages: v.aiHandlesAllMessages,
      sendAcknowledgement: v.sendAcknowledgement,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.channels.update(list => [...list, res.content]);
          this.modalMode.set(null);
          this.toast.success('WhatsApp number added. Finish by connecting the webhook in your Meta app.');
          // The number can't receive anything until the webhook is set up — show how right away.
          this.setupChannel.set(res.content);
        } else {
          this.formError.set(res.message || 'Failed to add WhatsApp number.');
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
    const channel = this.editingChannel();
    if (!channel) return;
    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.form.getRawValue();

    this.channelService.update(channel.uid, {
      name: v.name.trim() || null,
      displayPhoneNumber: v.displayPhoneNumber.trim() || null,
      phoneNumberId: v.phoneNumberId.trim() || null,
      businessAccountId: v.businessAccountId.trim(),
      accessToken: v.accessToken.trim() || null,
      appSecret: v.appSecret.trim() || null,
      isActive: v.isActive,
      aiHandlesAllMessages: v.aiHandlesAllMessages,
      sendAcknowledgement: v.sendAcknowledgement,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.channels.update(list => list.map(c => (c.uid === channel.uid ? res.content : c)));
          this.modalMode.set(null);
          this.editingChannel.set(null);
          this.toast.success('WhatsApp number updated.');
        } else {
          this.formError.set(res.message || 'Failed to update WhatsApp number.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected openSetup(channel: WhatsAppChannel): void {
    this.setupChannel.set(channel);
  }

  protected closeSetup(): void {
    this.setupChannel.set(null);
  }

  protected copy(value: string, label: string): void {
    navigator.clipboard.writeText(value).then(
      () => this.toast.success(`${label} copied.`),
      () => this.toast.error(`Couldn't copy — select the ${label.toLowerCase()} and copy it manually.`),
    );
  }

  protected testConnection(channel: WhatsAppChannel): void {
    if (this.testingUid()) return;
    this.testingUid.set(channel.uid);

    this.channelService.testConnection(channel.uid).subscribe({
      next: (res) => {
        if (res.success && res.content.connected) {
          const who = res.content.verifiedName ? ` (${res.content.verifiedName})` : '';
          this.toast.success(`Connected to ${res.content.displayPhoneNumber ?? channel.displayPhoneNumber}${who}.`);
        } else {
          this.toast.error(res.content?.error || res.message || 'Meta rejected the phone number ID or access token.');
        }
        this.testingUid.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.toast.error(err.error?.message || 'Connection test failed.');
        this.testingUid.set(null);
      },
    });
  }

  protected openDeactivate(channel: WhatsAppChannel): void {
    this.deactivatingChannel.set(channel);
  }

  protected closeDeactivate(): void {
    this.deactivatingChannel.set(null);
  }

  protected onDeactivate(): void {
    const channel = this.deactivatingChannel();
    if (!channel || this.isDeactivating()) return;
    this.isDeactivating.set(true);

    this.channelService.deactivate(channel.uid).subscribe({
      next: () => {
        this.channels.update(list => list.map(c => (c.uid === channel.uid ? { ...c, isActive: false } : c)));
        this.deactivatingChannel.set(null);
        this.isDeactivating.set(false);
        this.toast.success(`"${channel.name}" deactivated.`);
      },
      error: () => this.isDeactivating.set(false),
    });
  }
}
