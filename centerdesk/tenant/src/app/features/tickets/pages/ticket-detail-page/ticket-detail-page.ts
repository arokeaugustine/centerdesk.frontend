import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { EMPTY, Subscription, interval } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { TicketService } from '../../services/ticket.service';
import { TicketAttachmentService } from '../../services/ticket-attachment.service';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  CategoriseTicketRequest,
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
import { ServiceCategoryService } from '../../../service-categories/services/service-category.service';
import { ServiceCategory } from '../../../service-categories/models/service-category.models';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';
import { Modal } from '../../../../shared/components/modal/modal';
import { MessageAttachments } from '../../components/message-attachments/message-attachments';
import { environment } from '../../../../../environments/environment';

type ModalType = 'assign' | 'status' | 'close' | 'reopen' | 'forward' | 'note' | 'categorise' | null;

/** A file in the reply box: uploading, uploaded (has a uid), or failed. */
interface ReplyUpload {
  key: string;
  name: string;
  size: number;
  progress: number;
  state: 'uploading' | 'done' | 'error';
  uid?: string;
  error?: string;
  subscription?: Subscription;
}

const MB = 1024 * 1024;
// Mirrors the API's limits so the agent hears about a problem when picking the file, not on send.
const MAX_UPLOAD_BYTES = 100 * MB;
const MAX_EMAIL_ATTACHMENTS_BYTES = 18 * MB;
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'dll', 'com', 'bat', 'cmd', 'scr', 'pif', 'msi', 'msp', 'msc', 'cpl', 'jar', 'js', 'jse', 'vbs',
  'vbe', 'wsf', 'wsh', 'ps1', 'psm1', 'hta', 'lnk', 'reg', 'sh', 'app', 'appx', 'msix', 'apk', 'scf', 'inf',
  'gadget', 'application',
]);
// What WhatsApp accepts from a business, by extension → max size.
const WHATSAPP_LIMITS: ReadonlyMap<string, number> = new Map([
  ['jpg', 5 * MB], ['jpeg', 5 * MB], ['png', 5 * MB],
  ['aac', 16 * MB], ['amr', 16 * MB], ['mp3', 16 * MB], ['m4a', 16 * MB], ['ogg', 16 * MB],
  ['mp4', 16 * MB], ['3gp', 16 * MB],
  ['pdf', 100 * MB], ['txt', 100 * MB], ['doc', 100 * MB], ['docx', 100 * MB],
  ['xls', 100 * MB], ['xlsx', 100 * MB], ['ppt', 100 * MB], ['pptx', 100 * MB],
]);
// Refresh attachment links this long before they expire (the API issues them for an hour).
const LINK_REFRESH_MARGIN_MS = 10 * 60 * 1000;

@Component({
  selector: 'app-ticket-detail-page',
  imports: [ReactiveFormsModule, NgClass, Button, InputField, Label, Modal, MessageAttachments],
  templateUrl: './ticket-detail-page.html',
})
export class TicketDetailPage implements OnInit {
  protected readonly uid = input.required<string>();

  private readonly ticketService = inject(TicketService);
  private readonly attachmentService = inject(TicketAttachmentService);
  private readonly teamService = inject(TeamService);
  private readonly categoryService = inject(ServiceCategoryService);
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
  protected readonly categories = signal<ServiceCategory[]>([]);

  // Files picked in the reply box. Each uploads straight away; the reply sends their uids.
  protected readonly uploads = signal<ReplyUpload[]>([]);
  protected readonly uploadsInProgress = computed(() => this.uploads().some((u) => u.state === 'uploading'));
  protected readonly isDraggingFiles = signal(false);
  protected readonly whatsAppAccept = [...WHATSAPP_LIMITS.keys()].map((ext) => `.${ext}`).join(',');

  protected readonly canAssign = computed(() =>
    this.permissions.has(TenantPermission.CanAssignTicket)
  );
  protected readonly canUpdateStatus = computed(() =>
    this.permissions.has(TenantPermission.CanUpdateTickets)
  );
  // Categorising a ticket (setting its service category/sub-category, which attaches its
  // SLA) shares the same permission as the other general "edit" actions on a ticket.
  protected readonly canCategorise = computed(() =>
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

  // WhatsApp tickets are answered on WhatsApp, and only inside Meta's 24-hour customer service
  // window (24h after the customer's last message). Derived from the thread itself, so it
  // re-opens as soon as a new customer message arrives through polling.
  protected readonly isWhatsApp = computed(() => !!this.ticket()?.whatsAppChannel);
  protected readonly whatsAppWindowEndsAt = computed<Date | null>(() => {
    const latestInbound = this.messages()
      .filter(m => m.isInbound && m.channel === 'WhatsApp')
      .reduce((max, m) => Math.max(max, new Date(m.createdAt).getTime()), 0);
    if (latestInbound > 0) return new Date(latestInbound + 24 * 60 * 60 * 1000);
    const fromTicket = this.ticket()?.whatsAppReplyWindowEndsAt;
    return fromTicket ? new Date(fromTicket) : null;
  });

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
    // Not required on its own: a reply can be just files. onReply checks there's one or the other.
    body: new FormControl(''),
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

  protected readonly categoriseForm = new FormGroup({
    serviceCategoryUid: new FormControl('', [Validators.required]),
    serviceSubCategoryUid: new FormControl('', [Validators.required]),
  });

  private readonly selectedCategoryUid = signal<string>('');

  // Sub-categories of whichever category is currently selected in the Categorise form.
  // SLAs (and therefore due dates) attach at the sub-category level only.
  protected readonly subCategoriesForSelectedCategory = computed(() => {
    const catUid = this.selectedCategoryUid();
    return this.categories().find((c) => c.uid === catUid)?.subCategories ?? [];
  });

  ngOnInit(): void {
    const uid = this.uid();
    // Fire both requests in parallel — the conversation no longer waits for the
    // ticket fetch to finish before it starts loading.
    this.loadTicket(uid);
    this.loadMessages(uid);
    this.startMessagePolling(uid);
    if (this.canViewSubTickets()) this.loadSubTickets(uid);

    this.categoriseForm.get('serviceCategoryUid')?.valueChanges.subscribe((v) => {
      this.selectedCategoryUid.set(v ?? '');
    });
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

  // Append messages we don't already have (matched by uid), preserving existing order and
  // optimistic read-state — @for tracks by uid so unchanged rows don't re-render. Existing
  // messages are only replaced when their files changed (a WhatsApp download finished) or their
  // file links are about to expire, so players and images don't reload on every poll.
  private mergeNewMessages(fresh: TicketMessage[]): void {
    const freshByUid = new Map(fresh.map((m) => [m.uid, m]));
    let changed = false;
    const updated = this.messages().map((current) => {
      const latest = freshByUid.get(current.uid);
      if (!latest || !this.attachmentsNeedRefresh(current, latest)) return current;
      changed = true;
      return { ...current, body: latest.body, attachments: latest.attachments };
    });

    const known = new Set(updated.map((m) => m.uid));
    const incoming = fresh.filter((m) => !known.has(m.uid));
    if (!changed && incoming.length === 0) return;

    this.messages.set([...updated, ...incoming]);
    if (incoming.length > 0) this.markInboundRead(this.uid(), incoming);
  }

  private attachmentsNeedRefresh(current: TicketMessage, latest: TicketMessage): boolean {
    if (current.attachments.length !== latest.attachments.length) return true;
    const statusByUid = new Map(current.attachments.map((a) => [a.uid, a.status]));
    if (latest.attachments.some((a) => statusByUid.get(a.uid) !== a.status)) return true;

    const expiries = current.attachments
      .filter((a) => !!a.linksExpireAt)
      .map((a) => Date.parse(a.linksExpireAt!));
    return expiries.length > 0 && Math.min(...expiries) - Date.now() < LINK_REFRESH_MARGIN_MS;
  }

  private loadTicket(uid: string): void {
    this.isLoading.set(true);
    this.ticketService.getOne(uid).subscribe({
      next: (res) => {
        if (res.success) {
          this.ticket.set(res.content);
          this.configureReplyForm(res.content);
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

  private loadCategories(): void {
    if (this.categories().length > 0) return;
    this.categoryService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.categories.set((res.content ?? []).filter((c) => c.isActive));
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
    if (type === 'categorise') {
      this.loadCategories();
      const t = this.ticket();
      const categoryUid = t?.serviceCategory?.uid ?? '';
      this.selectedCategoryUid.set(categoryUid);
      this.categoriseForm.reset({
        serviceCategoryUid: categoryUid,
        serviceSubCategoryUid: t?.serviceSubCategory?.uid ?? '',
      });
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

  protected onCategorise(): void {
    if (this.isSubmitting()) return;
    if (this.categoriseForm.invalid) { this.categoriseForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const v = this.categoriseForm.getRawValue();

    const req: CategoriseTicketRequest = {
      serviceCategoryUid: v.serviceCategoryUid!,
      serviceSubCategoryUid: v.serviceSubCategoryUid!,
    };

    this.ticketService.categorise(this.uid(), req).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Ticket categorised.');
          this.closeModal();
          // The categorise endpoint returns a TicketDto, not the full TicketDetailDto
          // (no resolutionSummary/statusHistories/etc.) — reload the full detail so
          // nothing on the page goes stale.
          this.loadTicket(this.uid());
        } else {
          this.modalError.set(res.message || 'Failed to categorise ticket.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  // WhatsApp replies go to the customer's number, so the email validator (and Cc) don't apply.
  private configureReplyForm(ticket: Ticket): void {
    const to = this.replyForm.controls.toEmail;
    if (ticket.whatsAppChannel) {
      to.setValidators([Validators.required]);
      to.setValue(ticket.senderPhone ?? '');
    } else {
      to.setValidators([Validators.required, Validators.email]);
      to.setValue(ticket.senderEmail);
    }
    to.updateValueAndValidity();
  }

  protected whatsAppWindowOpen(): boolean {
    const ends = this.whatsAppWindowEndsAt();
    return !!ends && ends.getTime() > Date.now();
  }

  protected whatsAppWindowRemaining(): string {
    const ends = this.whatsAppWindowEndsAt();
    if (!ends) return '';
    const minutes = Math.max(0, Math.round((ends.getTime() - Date.now()) / 60000));
    return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
  }

  protected onReply(): void {
    if (this.isReplying()) return;
    if (this.isWhatsApp() && !this.whatsAppWindowOpen()) {
      this.replyError.set('The 24-hour WhatsApp reply window has closed — the customer needs to message you again first.');
      return;
    }
    if (this.replyForm.invalid) { this.replyForm.markAllAsTouched(); return; }
    if (this.uploadsInProgress()) {
      this.replyError.set('Wait for the files to finish uploading.');
      return;
    }
    const v = this.replyForm.getRawValue();
    const attachmentUids = this.uploads().filter((u) => u.state === 'done' && u.uid).map((u) => u.uid!);
    if (!(v.body ?? '').trim() && attachmentUids.length === 0) {
      this.replyError.set('Write a message or attach a file.');
      return;
    }
    this.isReplying.set(true);
    this.replyError.set(null);

    const req: ReplyMessageRequest = {
      toEmail: v.toEmail!,
      body: v.body ?? '',
      cc: v.cc || null,
      channel: this.isWhatsApp() ? 'WhatsApp' : 'Email',
      attachmentUids,
    };

    this.ticketService.replyMessage(this.uid(), req).subscribe({
      next: (res) => {
        if (res.success && res.content) {
          this.messages.update((list) => [...list, res.content]);
          this.replyForm.patchValue({ body: '', cc: '' });
          this.replyForm.get('body')?.markAsUntouched();
          // Sent with the reply — clear the chips without deleting the files.
          this.uploads.set([]);
          this.toast.success(attachmentUids.length > 0 ? 'Reply queued with attachments.' : 'Reply sent.');
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

  // ---------------------------------------------------------------- reply attachments

  protected onFilesPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = ''; // so picking the same file again still fires change
  }

  protected onFilesDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.isDraggingFiles.set(true);
  }

  protected onFilesDragLeave(): void {
    this.isDraggingFiles.set(false);
  }

  protected onFilesDropped(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingFiles.set(false);
    this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private addFiles(files: File[]): void {
    for (const file of files) {
      const problem = this.checkFile(file);
      if (problem) {
        this.toast.error(problem);
        continue;
      }
      this.startUpload(file);
    }
  }

  /** Same rules the API applies, checked up front so the agent hears straight away. */
  private checkFile(file: File): string | null {
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
    if (file.size === 0) return `"${file.name}" is empty.`;
    if (BLOCKED_EXTENSIONS.has(ext)) return `"${file.name}" can't be attached — .${ext} files can run code on the customer's computer.`;
    if (file.size > MAX_UPLOAD_BYTES) return `"${file.name}" is larger than 100 MB.`;
    if (this.uploads().length >= 10) return 'Attach at most 10 files to one reply.';

    if (this.isWhatsApp()) {
      const limit = WHATSAPP_LIMITS.get(ext);
      if (limit === undefined)
        return `WhatsApp can't send .${ext || 'this kind of'} files. It takes JPEG/PNG images, MP3/M4A/AAC/AMR/OGG audio, MP4/3GP video, and PDF, text, Word, Excel or PowerPoint documents.`;
      if (file.size > limit) return `"${file.name}" is too large for WhatsApp (max ${limit / MB} MB for this type).`;
    } else {
      const total = this.uploads().filter((u) => u.state !== 'error').reduce((sum, u) => sum + u.size, 0) + file.size;
      if (total > MAX_EMAIL_ATTACHMENTS_BYTES)
        return `Email attachments can add up to at most ${MAX_EMAIL_ATTACHMENTS_BYTES / MB} MB per reply.`;
    }
    return null;
  }

  private startUpload(file: File): void {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const entry: ReplyUpload = { key, name: file.name, size: file.size, progress: 0, state: 'uploading' };
    this.uploads.update((list) => [...list, entry]);

    entry.subscription = this.attachmentService.upload(file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          this.patchUpload(key, { progress });
        } else if (event.type === HttpEventType.Response) {
          const body = event.body;
          if (body?.success && body.content) this.patchUpload(key, { state: 'done', progress: 100, uid: body.content.uid });
          else this.patchUpload(key, { state: 'error', error: body?.message || 'Upload failed.' });
        }
      },
      error: (err: HttpErrorResponse) =>
        this.patchUpload(key, { state: 'error', error: err.error?.message || 'Upload failed.' }),
    });
  }

  private patchUpload(key: string, patch: Partial<ReplyUpload>): void {
    this.uploads.update((list) => list.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  }

  protected removeUpload(upload: ReplyUpload): void {
    upload.subscription?.unsubscribe();
    if (upload.state === 'done' && upload.uid) {
      // Tidy up on the server; unsent uploads are also cleaned up automatically after a day.
      this.attachmentService.remove(upload.uid).subscribe({ error: () => {} });
    }
    this.uploads.update((list) => list.filter((u) => u.key !== upload.key));
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
