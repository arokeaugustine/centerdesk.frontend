import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { EMPTY, interval } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { TicketService } from '../../services/ticket.service';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  ForwardTicketRequest,
  ReplyMessageRequest,
  Ticket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from '../../models/ticket.models';
import { SubTicketSummary } from '../../../sub-tickets/models/sub-ticket.models';
import { TeamService } from '../../../teams/services/team.service';
import { ResolutionTeam } from '../../../teams/models/team.models';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';
import { Modal } from '../../../../shared/components/modal/modal';
import { environment } from '../../../../../environments/environment';

type ModalType = 'assign' | 'status' | 'close' | 'reopen' | 'forward' | 'note' | null;

@Component({
  selector: 'app-ticket-detail-page',
  imports: [ReactiveFormsModule, NgClass, Button, InputField, Label, Modal],
  templateUrl: './ticket-detail-page.html',
})
export class TicketDetailPage implements OnInit {
  protected readonly uid = input.required<string>();

  private readonly ticketService = inject(TicketService);
  private readonly teamService = inject(TeamService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // How often the open conversation polls for newly-synced mail (from environment config).
  private static readonly POLL_INTERVAL_MS = environment.ticketPollIntervalMs;

  protected readonly ticket = signal<Ticket | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly activeModal = signal<ModalType>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly modalError = signal<string | null>(null);

  protected readonly messages = signal<TicketMessage[]>([]);
  protected readonly messagesLoading = signal(false);
  protected readonly isReplying = signal(false);
  protected readonly replyError = signal<string | null>(null);

  protected readonly subTickets = signal<SubTicketSummary[]>([]);
  protected readonly teams = signal<ResolutionTeam[]>([]);

  // Attachments are hidden until the user reveals them per message.
  protected readonly expandedAttachments = signal<ReadonlySet<string>>(new Set());

  protected readonly canAssign = computed(() =>
    this.permissions.has(TenantPermission.CanAssignTicket)
  );
  protected readonly canUpdateStatus = computed(() =>
    this.permissions.has(TenantPermission.CanUpdateTickets)
  );
  protected readonly canClose = computed(() =>
    this.permissions.has(TenantPermission.CanCloseTicket)
  );
  protected readonly canReopen = computed(() =>
    this.permissions.has(TenantPermission.CanReopenTicket)
  );
  // Fixed to match the server-side fix: the reply endpoint is gated on CanReplyTicket,
  // not CanCreateTicket (that was letting anyone who could create a ticket also reply
  // as the tenant regardless of whether they held the actual reply permission).
  protected readonly canReply = computed(() =>
    this.permissions.has(TenantPermission.CanReplyTicket)
  );
  protected readonly canAddNote = computed(() =>
    this.permissions.has(TenantPermission.CanAddInternalNote)
  );
  protected readonly canForward = computed(() =>
    this.permissions.has(TenantPermission.CanForwardTicket)
  );
  protected readonly canViewSubTickets = computed(() =>
    this.permissions.has(TenantPermission.CanViewSubTickets)
  );

  protected readonly updateStatusOptions = [
    { value: String(TicketStatus.Open), label: TICKET_STATUS_LABELS[TicketStatus.Open] },
    { value: String(TicketStatus.InProgress), label: TICKET_STATUS_LABELS[TicketStatus.InProgress] },
    { value: String(TicketStatus.PendingCustomer), label: TICKET_STATUS_LABELS[TicketStatus.PendingCustomer] },
    { value: String(TicketStatus.Resolved), label: TICKET_STATUS_LABELS[TicketStatus.Resolved] },
  ];

  protected readonly assignForm = new FormGroup({
    assignToUserId: new FormControl('', [Validators.required, Validators.pattern('^[1-9][0-9]*$')]),
  });

  protected readonly statusForm = new FormGroup({
    status: new FormControl('', [Validators.required]),
    remark: new FormControl(''),
  });

  protected readonly closeForm = new FormGroup({
    resolutionSummary: new FormControl('', [Validators.required]),
  });

  protected readonly reopenForm = new FormGroup({
    remark: new FormControl('', [Validators.required]),
  });

  protected readonly replyForm = new FormGroup({
    toEmail: new FormControl('', [Validators.required, Validators.email]),
    cc: new FormControl(''),
    body: new FormControl('', [Validators.required]),
  });

  protected readonly noteForm = new FormGroup({
    body: new FormControl('', [Validators.required]),
  });

  protected readonly forwardForm = new FormGroup({
    resolutionTeamUid: new FormControl('', [Validators.required]),
    assigneeUserUid: new FormControl('', [Validators.required]),
    message: new FormControl('', [Validators.required]),
    priority: new FormControl(''),
  });

  ngOnInit(): void {
    const uid = this.uid();
    // Fire both requests in parallel — the conversation no longer waits for the
    // ticket fetch to finish before it starts loading.
    this.loadTicket(uid);
    this.loadMessages(uid);
    this.startMessagePolling(uid);
    if (this.canViewSubTickets()) this.loadSubTickets(uid);
  }

  // Poll for newly-synced mail while the conversation is open, so replies/new inbound
  // messages appear without a manual refresh. Pauses when the tab is hidden, skips
  // overlapping requests (switchMap), and swallows transient errors.
  private startMessagePolling(uid: string): void {
    interval(TicketDetailPage.POLL_INTERVAL_MS)
      .pipe(
        filter(() => !document.hidden),
        switchMap(() => this.ticketService.getMessages(uid).pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res.success && res.content) this.mergeNewMessages(res.content);
      });
  }

  // Append only messages we don't already have (matched by uid), preserving existing
  // order and optimistic read-state — @for tracks by uid so unchanged rows don't re-render.
  private mergeNewMessages(fresh: TicketMessage[]): void {
    const known = new Set(this.messages().map((m) => m.uid));
    const incoming = fresh.filter((m) => !known.has(m.uid));
    if (incoming.length === 0) return;

    this.messages.update((list) => [...list, ...incoming]);
    this.markInboundRead(this.uid(), incoming);
  }

  private loadTicket(uid: string): void {
    this.isLoading.set(true);
    this.ticketService.getOne(uid).subscribe({
      next: (res) => {
        if (res.success) {
          this.ticket.set(res.content);
          this.replyForm.patchValue({ toEmail: res.content.senderEmail });
        }
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Unable to open this ticket.');
        this.router.navigate(['/tickets']);
      },
    });
  }

  private loadMessages(uid: string): void {
    this.messagesLoading.set(true);
    this.ticketService.getMessages(uid).subscribe({
      next: (res) => {
        if (res.success && res.content) {
          this.messages.set(res.content);
          this.markInboundRead(uid, res.content);
        }
        this.messagesLoading.set(false);
      },
      error: () => this.messagesLoading.set(false),
    });
  }

  private loadSubTickets(uid: string): void {
    this.ticketService.getSubTickets(uid).subscribe({
      next: (res) => {
        if (res.success && res.content) this.subTickets.set(res.content);
      },
      error: () => {},
    });
  }

  // Opening a conversation marks its unread inbound mail as read in one call
  // (fire-and-forget). Optimistically flip the local state so the UI updates now.
  private markInboundRead(uid: string, msgs: TicketMessage[]): void {
    if (!msgs.some((x) => x.isInbound && !x.isRead)) return;

    this.ticketService.markAllMessagesRead(uid).subscribe({
      next: () =>
        this.messages.update((list) =>
          list.map((x) => (x.isInbound ? { ...x, isRead: true } : x))
        ),
      error: () => {},
    });
  }

  protected goBack(): void {
    this.router.navigate(['/tickets']);
  }

  protected openSubTicket(subUid: string): void {
    this.router.navigate(['/sub-tickets', subUid]);
  }

  protected openModal(type: ModalType): void {
    this.modalError.set(null);
    if (type === 'status') this.statusForm.reset({ status: '', remark: '' });
    if (type === 'assign') this.assignForm.reset();
    if (type === 'close') this.closeForm.reset();
    if (type === 'reopen') this.reopenForm.reset();
    if (type === 'note') this.noteForm.reset();
    if (type === 'forward') {
      this.forwardForm.reset();
      this.loadTeamsForForward();
    }
    this.activeModal.set(type);
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.modalError.set(null);
  }

  private loadTeamsForForward(): void {
    this.teamService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.teams.set((res.content ?? []).filter((t) => t.isActive));
      },
      error: () => {},
    });
  }

  protected onAssign(): void {
    if (this.isSubmitting()) return;
    if (this.assignForm.invalid) { this.assignForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const userId = parseInt(this.assignForm.getRawValue().assignToUserId!, 10);

    this.ticketService.assign(this.uid(), { assignToUserId: userId }).subscribe({
      next: (res) => {
        if (res.success) {
          this.ticket.set(res.content);
          this.toast.success('Ticket assigned successfully.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to assign ticket.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onUpdateStatus(): void {
    if (this.isSubmitting()) return;
    if (this.statusForm.invalid) { this.statusForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const v = this.statusForm.getRawValue();

    this.ticketService.updateStatus(this.uid(), {
      status: Number(v.status!) as TicketStatus,
      remark: v.remark || null,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.ticket.set(res.content);
          this.toast.success('Status updated.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to update status.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onClose(): void {
    if (this.isSubmitting()) return;
    if (this.closeForm.invalid) { this.closeForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);

    this.ticketService.close(this.uid(), {
      resolutionSummary: this.closeForm.getRawValue().resolutionSummary!,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.ticket.set(res.content);
          this.toast.success('Ticket closed.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to close ticket.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onReopen(): void {
    if (this.isSubmitting()) return;
    if (this.reopenForm.invalid) { this.reopenForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);

    this.ticketService.reopen(this.uid(), {
      remark: this.reopenForm.getRawValue().remark!,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.ticket.set(res.content);
          this.toast.success('Ticket reopened.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to reopen ticket.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onReply(): void {
    if (this.isReplying()) return;
    if (this.replyForm.invalid) { this.replyForm.markAllAsTouched(); return; }
    this.isReplying.set(true);
    this.replyError.set(null);
    const v = this.replyForm.getRawValue();

    const req: ReplyMessageRequest = {
      toEmail: v.toEmail!,
      body: v.body!,
      cc: v.cc || null,
      channel: 'Email',
    };

    this.ticketService.replyMessage(this.uid(), req).subscribe({
      next: (res) => {
        if (res.success && res.content) {
          this.messages.update((list) => [...list, res.content]);
          this.replyForm.patchValue({ body: '', cc: '' });
          this.replyForm.get('body')?.markAsUntouched();
          this.toast.success('Reply sent.');
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

  protected onAddNote(): void {
    if (this.isSubmitting()) return;
    if (this.noteForm.invalid) { this.noteForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);

    this.ticketService.addNote(this.uid(), { body: this.noteForm.getRawValue().body! }).subscribe({
      next: (res) => {
        if (res.success && res.content) {
          this.messages.update((list) => [...list, res.content]);
          this.toast.success('Internal note added.');
          this.closeModal();
        } else {
          this.modalError.set(res.message || 'Failed to add note.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onForward(): void {
    if (this.isSubmitting()) return;
    if (this.forwardForm.invalid) { this.forwardForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const v = this.forwardForm.getRawValue();

    const req: ForwardTicketRequest = {
      resolutionTeamUid: v.resolutionTeamUid!,
      assigneeUserUid: v.assigneeUserUid!,
      message: v.message!,
      priority: v.priority ? (Number(v.priority) as TicketPriority) : null,
    };

    this.ticketService.forward(this.uid(), req).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Ticket forwarded — sub-ticket created.');
          this.closeModal();
          this.loadTicket(this.uid());
          this.loadSubTickets(this.uid());
        } else {
          this.modalError.set(res.message || 'Failed to forward ticket.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        // Covers "assignee is not a member of that team" and similar validation failures.
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected attachmentsShown(messageUid: string): boolean {
    return this.expandedAttachments().has(messageUid);
  }

  protected toggleAttachments(messageUid: string): void {
    this.expandedAttachments.update((set) => {
      const next = new Set(set);
      next.has(messageUid) ? next.delete(messageUid) : next.add(messageUid);
      return next;
    });
  }

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected statusLabel(status: TicketStatus): string {
    return TICKET_STATUS_LABELS[status];
  }

  protected statusBadgeClass(status: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
      [TicketStatus.New]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      [TicketStatus.Open]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      [TicketStatus.InProgress]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      [TicketStatus.PendingCustomer]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      [TicketStatus.Resolved]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      [TicketStatus.Closed]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      [TicketStatus.Reopened]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      [TicketStatus.AwaitingResolutionTeamFeedback]: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      [TicketStatus.Returned]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    };
    return map[status] ?? '';
  }

  protected priorityLabel(priority: TicketPriority): string {
    return TICKET_PRIORITY_LABELS[priority];
  }

  protected priorityBadgeClass(priority: TicketPriority): string {
    const map: Record<TicketPriority, string> = {
      [TicketPriority.Low]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      [TicketPriority.Normal]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      [TicketPriority.High]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      [TicketPriority.Urgent]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[priority] ?? '';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  protected assignedToName(ticket: Ticket): string {
    if (!ticket.assignedTo) return 'Unassigned';
    const u = ticket.assignedTo;
    return (`${u.firstName} ${u.lastName}`.trim()) || u.email;
  }
}
