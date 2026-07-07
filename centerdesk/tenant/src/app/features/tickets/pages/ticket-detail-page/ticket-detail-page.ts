import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { SafeHtmlPipe } from '../../../../shared/pipes/safe-html.pipe';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from '../../models/ticket.models';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

type ModalType = 'assign' | 'status' | 'close' | 'reopen' | null;

@Component({
  selector: 'app-ticket-detail-page',
  imports: [ReactiveFormsModule, NgClass, Button, InputField, Label, SafeHtmlPipe],
  templateUrl: './ticket-detail-page.html',
})
export class TicketDetailPage implements OnInit {
  protected readonly uid = input.required<string>();

  private readonly ticketService = inject(TicketService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly ticket = signal<Ticket | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly activeModal = signal<ModalType>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly modalError = signal<string | null>(null);

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

  ngOnInit(): void {
    this.loadTicket(this.uid());
  }

  private loadTicket(uid: string): void {
    this.isLoading.set(true);
    this.ticketService.getOne(uid).subscribe({
      next: (res) => {
        if (res.success) this.ticket.set(res.content);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/tickets']);
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/tickets']);
  }

  protected openModal(type: ModalType): void {
    this.modalError.set(null);
    if (type === 'status') this.statusForm.reset({ status: '', remark: '' });
    if (type === 'assign') this.assignForm.reset();
    if (type === 'close') this.closeForm.reset();
    if (type === 'reopen') this.reopenForm.reset();
    this.activeModal.set(type);
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.modalError.set(null);
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

  protected statusLabel(status: TicketStatus): string {
    return TICKET_STATUS_LABELS[status];
  }

  protected statusBadgeClass(status: TicketStatus): string {
    const map: Record<TicketStatus, string> = {
      [TicketStatus.New]: 'bg-red-100 text-red-700 dark:bg-blue-900/30 dark:text-blue-400',
      [TicketStatus.Open]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      [TicketStatus.InProgress]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      [TicketStatus.PendingCustomer]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      [TicketStatus.Resolved]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      [TicketStatus.Closed]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      [TicketStatus.Reopened]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
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
