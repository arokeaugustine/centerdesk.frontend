import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { EMPTY, interval, type Observable } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { TicketService } from '../../services/ticket.service';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  TicketAiState,
  TicketListContent,
  TicketPriority,
  TicketStatus,
  TicketSummary,
  TICKET_AI_STATE_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from '../../models/ticket.models';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-ticket-list-page',
  imports: [ReactiveFormsModule, NgClass, Button, InputField, Label],
  templateUrl: './ticket-list-page.html',
})
export class TicketListPage implements OnInit {
  private readonly ticketService = inject(TicketService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tickets = signal<TicketSummary[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly totalItems = signal(0);
  protected readonly currentPage = signal(1);
  protected readonly hasNextPage = signal(false);
  protected readonly hasPreviousPage = signal(false);

  protected searchTerm = '';
  protected filterStatus = '';
  protected filterPriority = '';
  protected filterAiState = '';

  protected readonly showCreateModal = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly canCreate = computed(() =>
    this.permissions.has(TenantPermission.CanCreateTicket)
  );
  protected readonly canViewDetails = computed(() =>
    this.permissions.has(TenantPermission.CanViewTicketDetails)
  );

  protected readonly statusOptions = [
    { value: '', label: 'All Status' },
    { value: String(TicketStatus.New), label: TICKET_STATUS_LABELS[TicketStatus.New] },
    { value: String(TicketStatus.Open), label: TICKET_STATUS_LABELS[TicketStatus.Open] },
    { value: String(TicketStatus.InProgress), label: TICKET_STATUS_LABELS[TicketStatus.InProgress] },
    { value: String(TicketStatus.PendingCustomer), label: TICKET_STATUS_LABELS[TicketStatus.PendingCustomer] },
    { value: String(TicketStatus.Resolved), label: TICKET_STATUS_LABELS[TicketStatus.Resolved] },
    { value: String(TicketStatus.Closed), label: TICKET_STATUS_LABELS[TicketStatus.Closed] },
    { value: String(TicketStatus.Reopened), label: TICKET_STATUS_LABELS[TicketStatus.Reopened] },
  ];

  protected readonly priorityOptions = [
    { value: '', label: 'All Priority' },
    { value: String(TicketPriority.Low), label: TICKET_PRIORITY_LABELS[TicketPriority.Low] },
    { value: String(TicketPriority.Normal), label: TICKET_PRIORITY_LABELS[TicketPriority.Normal] },
    { value: String(TicketPriority.High), label: TICKET_PRIORITY_LABELS[TicketPriority.High] },
    { value: String(TicketPriority.Urgent), label: TICKET_PRIORITY_LABELS[TicketPriority.Urgent] },
  ];

  /**
   * "AI answered" is the one people actually come here for — it sits first so finding what the
   * bot already dealt with doesn't need the dropdown opened twice.
   */
  protected readonly aiStateOptions = [
    { value: '', label: 'All AI states' },
    { value: String(TicketAiState.Answered), label: TICKET_AI_STATE_LABELS[TicketAiState.Answered] },
    { value: String(TicketAiState.Declined), label: TICKET_AI_STATE_LABELS[TicketAiState.Declined] },
    { value: String(TicketAiState.NotAttempted), label: TICKET_AI_STATE_LABELS[TicketAiState.NotAttempted] },
  ];

  protected readonly createForm = new FormGroup({
    senderName: new FormControl('', [Validators.required]),
    senderEmail: new FormControl('', [Validators.required, Validators.email]),
    subject: new FormControl('', [Validators.required]),
    body: new FormControl('', [Validators.required]),
    priority: new FormControl(String(TicketPriority.Normal), [Validators.required]),
  });

  ngOnInit(): void {
    this.loadTickets(1);
    this.startPolling();
  }

  private fetchTickets(page: number): Observable<{ success: boolean; content: TicketListContent | null }> {
    return this.ticketService.getAll({
      page,
      pageSize: 20,
      search: this.searchTerm || undefined,
      status: this.filterStatus !== '' ? (Number(this.filterStatus) as TicketStatus) : undefined,
      priority: this.filterPriority !== '' ? (Number(this.filterPriority) as TicketPriority) : undefined,
      aiState: this.filterAiState !== '' ? (Number(this.filterAiState) as TicketAiState) : undefined,
    });
  }

  private applyResult(res: { success: boolean; content: TicketListContent | null }): void {
    if (res.success && res.content) {
      const { data, total, page, pageSize } = res.content;
      this.tickets.set(data ?? []);
      this.totalItems.set(total);
      this.currentPage.set(page);
      this.hasNextPage.set(page * pageSize < total);
      this.hasPreviousPage.set(page > 1);
    }
  }

  private loadTickets(page: number): void {
    this.isLoading.set(true);
    this.currentPage.set(page);
    this.fetchTickets(page).subscribe({
      next: (res) => {
        this.applyResult(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  // Quietly refresh the current page so newly-synced tickets appear without a manual
  // refresh (no spinner). Pauses when the tab is hidden or while the create modal is open.
  private startPolling(): void {
    interval(environment.ticketPollIntervalMs)
      .pipe(
        filter(() => !document.hidden && !this.showCreateModal()),
        switchMap(() => this.fetchTickets(this.currentPage()).pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => this.applyResult(res));
  }

  protected onSearch(): void {
    this.loadTickets(1);
  }

  protected onStatusChange(event: Event): void {
    this.filterStatus = (event.target as HTMLSelectElement).value;
    this.loadTickets(1);
  }

  protected onPriorityChange(event: Event): void {
    this.filterPriority = (event.target as HTMLSelectElement).value;
    this.loadTickets(1);
  }

  protected onAiStateChange(event: Event): void {
    this.filterAiState = (event.target as HTMLSelectElement).value;
    this.loadTickets(1);
  }

  protected aiStateLabel(state: TicketAiState): string {
    return TICKET_AI_STATE_LABELS[state];
  }

  /**
   * Answered is a positive outcome, declined is a call for attention ("AI looked and couldn't
   * help"), and never-attempted is unremarkable — so only the first two earn colour.
   */
  protected aiStateBadgeClass(state: TicketAiState): string {
    switch (state) {
      case TicketAiState.Answered:
        return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500';
      case TicketAiState.Declined:
        return 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400';
    }
  }

  protected nextPage(): void {
    if (this.hasNextPage()) this.loadTickets(this.currentPage() + 1);
  }

  protected prevPage(): void {
    if (this.hasPreviousPage()) this.loadTickets(this.currentPage() - 1);
  }

  protected viewTicket(ticket: TicketSummary): void {
    if (!this.canViewDetails()) {
      this.toast.error('You do not have permission to view ticket details.');
      return;
    }
    this.router.navigate(['/tickets', ticket.uid]);
  }

  protected openCreate(): void {
    this.createForm.reset({ priority: String(TicketPriority.Normal) });
    this.formError.set(null);
    this.showCreateModal.set(true);
  }

  protected closeCreate(): void {
    this.showCreateModal.set(false);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.createForm.getRawValue();

    this.ticketService.create({
      senderName: v.senderName!,
      senderEmail: v.senderEmail!,
      subject: v.subject!,
      body: v.body!,
      priority: Number(v.priority!) as TicketPriority,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Ticket created successfully.');
          this.showCreateModal.set(false);
          this.router.navigate(['/tickets', res.content.uid]);
        } else {
          this.formError.set(res.message || 'Failed to create ticket.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
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
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  protected assignedToLabel(ticket: TicketSummary): string {
    if (!ticket.assignedTo) return '—';
    const u = ticket.assignedTo;
    return (`${u.firstName} ${u.lastName}`.trim()) || u.email;
  }
}
