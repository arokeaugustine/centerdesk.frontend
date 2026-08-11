import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamService } from '../../services/team.service';
import { ResolutionTeamDetail } from '../../models/team.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';
import { Modal } from '../../../../shared/components/modal/modal';
import { Badge } from '../../../../shared/components/badge/badge';

type ModalType = 'edit' | 'add-member' | 'add-subteam' | null;

@Component({
  selector: 'app-team-detail-page',
  imports: [ReactiveFormsModule, Button, InputField, Label, Modal, Badge],
  templateUrl: './team-detail-page.html',
})
export class TeamDetailPage implements OnInit {
  protected readonly uid = input.required<string>();

  private readonly teamService = inject(TeamService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly team = signal<ResolutionTeamDetail | null>(null);
  protected readonly isLoading = signal(false);

  protected readonly activeModal = signal<ModalType>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly modalError = signal<string | null>(null);

  protected readonly canUpdate = computed(() => this.permissions.has(TenantPermission.CanUpdateResolutionTeam));
  protected readonly canDelete = computed(() => this.permissions.has(TenantPermission.CanDeleteResolutionTeam));
  protected readonly canManageMembers = computed(() =>
    this.permissions.has(TenantPermission.CanManageResolutionTeamMembers)
  );
  protected readonly canCreateSubteam = computed(() =>
    this.permissions.has(TenantPermission.CanCreateResolutionTeam)
  );

  protected readonly editForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl(''),
    description: new FormControl(''),
    canReplyToCustomer: new FormControl(false),
  });

  protected readonly addMemberForm = new FormGroup({
    userUid: new FormControl('', [Validators.required]),
  });

  protected readonly addSubteamForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl(''),
    description: new FormControl(''),
    canReplyToCustomer: new FormControl(false),
  });

  ngOnInit(): void {
    this.load(this.uid());
  }

  private load(uid: string): void {
    this.isLoading.set(true);
    this.teamService.getOne(uid).subscribe({
      next: (res) => {
        if (res.success) this.team.set(res.content);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Unable to open this team.');
        this.router.navigate(['/teams']);
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/teams']);
  }

  protected openSubteam(subUid: string): void {
    this.router.navigate(['/teams', subUid]);
  }

  protected openModal(type: ModalType): void {
    this.modalError.set(null);
    const t = this.team();
    if (type === 'edit' && t) {
      this.editForm.reset({
        name: t.name, email: t.email ?? '', description: t.description ?? '',
        canReplyToCustomer: t.canReplyToCustomer,
      });
    }
    if (type === 'add-member') this.addMemberForm.reset();
    if (type === 'add-subteam') this.addSubteamForm.reset({ canReplyToCustomer: false });
    this.activeModal.set(type);
  }

  protected closeModal(): void {
    this.activeModal.set(null);
    this.modalError.set(null);
  }

  protected onEdit(): void {
    if (this.isSubmitting()) return;
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const v = this.editForm.getRawValue();

    this.teamService.update(this.uid(), {
      name: v.name, email: v.email || null, description: v.description || null,
      canReplyToCustomer: !!v.canReplyToCustomer,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Team updated.');
          this.closeModal();
          this.load(this.uid());
        } else {
          this.modalError.set(res.message || 'Failed to update team.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onDeactivate(): void {
    this.teamService.deactivate(this.uid()).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Team deactivated.');
          this.load(this.uid());
        } else {
          this.toast.error(res.message || 'Failed to deactivate team.');
        }
      },
      error: (err: HttpErrorResponse) => {
        // Server blocks this when active subteams or open sub-tickets still exist.
        this.toast.error(err.error?.message || 'Cannot deactivate this team right now.');
      },
    });
  }

  protected onAddMember(): void {
    if (this.isSubmitting()) return;
    if (this.addMemberForm.invalid) { this.addMemberForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);

    this.teamService.addMember(this.uid(), { userUid: this.addMemberForm.getRawValue().userUid! }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Member added.');
          this.closeModal();
          this.load(this.uid());
        } else {
          this.modalError.set(res.message || 'Failed to add member.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected onRemoveMember(userUid: string): void {
    this.teamService.removeMember(this.uid(), userUid).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Member removed.');
          this.load(this.uid());
        } else {
          this.toast.error(res.message || 'Failed to remove member.');
        }
      },
      error: (err: HttpErrorResponse) => this.toast.error(err.error?.message || 'An error occurred.'),
    });
  }

  protected onAddSubteam(): void {
    if (this.isSubmitting()) return;
    if (this.addSubteamForm.invalid) { this.addSubteamForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    const v = this.addSubteamForm.getRawValue();

    this.teamService.create({
      name: v.name!, email: v.email || null, description: v.description || null,
      canReplyToCustomer: !!v.canReplyToCustomer, parentUid: this.uid(),
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Subteam created.');
          this.closeModal();
          this.load(this.uid());
        } else {
          this.modalError.set(res.message || 'Failed to create subteam.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.modalError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
