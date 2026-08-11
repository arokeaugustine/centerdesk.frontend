import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { EMPTY, interval } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { SubTicketService } from '../../services/sub-ticket.service';
import { SubTicketSummary } from '../../models/sub-ticket.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from '../../../tickets/models/ticket.models';
import { Button } from '../../../../shared/components/button/button';
import { Label } from '../../../../shared/components/label/label';
import { Modal } from '../../../../shared/components/modal/modal';
import { environment } from '../../../../../environments/environment';

type ModalType = 'reply-customer' | 'close' | 'return' | null;

@Component({
  selector: 'app-sub-ticket-detail-page',
  imports: [ReactiveFormsModule, NgClass, Button, Label, Modal],
  templateUrl: './sub-ticket-detail-page.html',
})
export class SubTicketDetailPage implements OnInit {
  protected readonly uid = input.required<string>();

  private readonly subTicketService = inject(SubTicketService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly subTicket = signal<SubTicketSummary | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly messages = signal<TicketMessage[]>([]);
  protected readonly messagesLoading = signal(false);
  protected readonly isReplying = signal(false);
  protected readonly replyError = signal<string | null>(null);

  protected readonly activeModal = signal<ModalType>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly modalError = signal<string | null>(null);

  protected readonly canReplyInternal = computed(() =>
    this.permissions.has(TenantPermission.CanReplySubTicket)
  );
  // Server also requires the sub-ticket's ResolutionTeam.CanReplyToCustomer flag to be
  // true — this permission alone is not sufficient, so the button stays gated on both.
  protected readonly canReplyCustomer = computed(
    () =>
      this.permissions.has(TenantPermission.CanReplyToCustomerFromSubTicket) &&
      !!this.subTicket()?.resolutionTeamCanReplyToCustomer
  );

  protected readonly replyForm = new FormGroup({
    body: new FormControl('', [Validators.required]),
  });

  protected readonly replyCustomerForm = new FormGroup({
    body: new FormControl('', [Validators.required]),
    sendAsStatus: new FormControl(String(TicketStatus.Open), [Validators.required]),
  });

  protected readonly closeForm = new FormGroup({
    resolutionSummary: new FormControl(''),
  });

  protected readonly returnForm = new FormGroup({
    remark: new FormControl(''),
  });

  protected readonly sendAsStatusOptions = [
    { value: String(TicketStatus.Open), label: 'Open (awaiting further reply)' },
    { value: String(TicketStatus.PendingCustomer), label: TICKET_STATUS_LABELS[TicketStatus.PendingCustomer] },
    { value: String(TicketStatus.Closed), label: 'Closed (also closes the parent ticket)' },
  ];

  ngOnInit(): void {
    const uid = this.uid();
    this.load(uid);
    this.loadMessages(uid);
    this.startPolling(uid);
  }

  private startPolling(uid: string): void {
    interval(environment.ticketPollIntervalMs)
      .pipe(
        filter(() => !document.hidden),
        switchMap(() => this.subTicketService.getMessages(uid).pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res.success && res.content) this.mergeNewMessages(res.content);
      });
  }

  private mergeNewMessages(fresh: TicketMessage[]): void {
    const known = new Set(this.messages().map((m) => m.uid));
    const incoming = fresh.filter((m) => !known.has(m.uid));
    if (incoming.length > 0) this.messages.update((list) => [...list, ...incoming]);
  }

  private load(uid: string): void {
    this.isLoading.set(true);
    this.subTicketService.getOne(uid).subscribe({
      next: (res) => {
        if (res.success) this.subTicket.set(res.content);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Unable to open this sub-ticket.');
      },
    });
  }

  private loadMessages(uid: string): void {
    this.messagesLoading.set(true);
    this.subTicketService.getMessages(uid).subscribe({
      next: (res) => {
        if (res.success && res.content) this.messages.set(res.content);
        this.messagesLoading.set(false);
      },
      error: () => this.messagesLoading.set(false),
    });
  }

  protected goToParent(): void {
    const t = this.subTicket();
    if (t) this.router.navigate(['/tickets', t.ticketUid]);
  }

  protected onReplyInternal(): void {
    if (this.isReplying()) return;
    if (this.replyForm.invalid) { this.replyForm.markAllAsTouched(); return; }
    this.isReplying.set(true);
    this.replyError.set(null);

    this.subTicketService.reply(this.uid(), { body: this.replyForm.getRawValue().body! }).subscribe({
      next: (res) => {
        if (res.success && res.content) {
          this.messages.update((list) => [...list, res.content]);
          this.replyForm.reset();
          this.toast.success('Internal reply sent.');
        } else {
          this.replyError.set(res.message || 'Failed to send reply.');
        }
        this.isReplying.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.replyError.set(err.error?.message || 'An error occurred.');
        this.isReplying.set(false);
      },
    });
  }

  protected openModal(type: ModalType): void {
    this.modalError.set(null);
    if (type === 'reply-customer') this.replyCustomerForm.reset({ body: '', sendAsStatus: String(TicketStatus.Open) });
    if (type === 'close') this.closeForm.reset();
    if (type === 'return') this.returnForm.reset();
    this.activeModal.set(type);
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.modalError.set(null);
  }

  protected onReplyCustomer(): void {
    if (this.isSubmitting()) return;
    if (this.replyCustomerForm.invalid) { this.replyCustomerForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const v = this.replyCustomerForm.getRawValue();

    this.subTicketService.replyToCustomer(this.uid(), {
      body: v.body!,
      sendAsStatus: Number(v.sendAsStatus!) as TicketStatus,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          if (res.content) this.messages.update((list) => [...list, res.content]);
          this.toast.success('Reply sent to the customer.');
          this.closeModal();
          this.load(this.uid());
        } else {
          this.modalError.set(res.message || 'Failed to send reply.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        // Covers both "not found" and the server-side CanReplyToCustomer team-flag denial.
        this.modalError.set(err.error?.message || 'This team is not permitted to reply directly to customers.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onClose(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    this.subTicketService.close(this.uid(), {
      resolutionSummary: this.closeForm.getRawValue().resolutionSummary || null,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.subTicket.set(res.content);
          this.toast.success('Sub-ticket closed.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to close sub-ticket.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onReturn(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    this.subTicketService.return(this.uid(), {
      remark: this.returnForm.getRawValue().remark || null,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.subTicket.set(res.content);
          this.toast.success('Sub-ticket returned to the original agent.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to return sub-ticket.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected statusLabel(status: TicketStatus): string {
    return TICKET_STATUS_LABELS[status];
  }

  protected priorityLabel(priority: TicketPriority): string {
    return TICKET_PRIORITY_LABELS[priority];
  }

  protected statusBadgeClass(status: TicketStatus): string {
    const map: Partial<Record<TicketStatus, string>> = {
      [TicketStatus.New]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      [TicketStatus.Open]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      [TicketStatus.InProgress]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      [TicketStatus.PendingCustomer]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      [TicketStatus.Resolved]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      [TicketStatus.Closed]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      [TicketStatus.Reopened]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      [TicketStatus.Returned]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] ?? '';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
