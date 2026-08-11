import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamService } from '../../services/team.service';
import { ResolutionTeam } from '../../models/team.models';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';
import { Modal } from '../../../../shared/components/modal/modal';
import { Badge } from '../../../../shared/components/badge/badge';
import { Table } from '../../../../shared/components/table/table';
import { TableHeader } from '../../../../shared/components/table/table-header';
import { TableBody } from '../../../../shared/components/table/table-body';
import { TableRow } from '../../../../shared/components/table/table-row';
import { TableCell } from '../../../../shared/components/table/table-cell';

@Component({
  selector: 'app-team-list-page',
  imports: [
    ReactiveFormsModule, Button, InputField, Label, Modal, Badge,
    Table, TableHeader, TableBody, TableRow, TableCell,
  ],
  templateUrl: './team-list-page.html',
})
export class TeamListPage implements OnInit {
  private readonly teamService = inject(TeamService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly teams = signal<ResolutionTeam[]>([]);
  protected readonly isLoading = signal(false);

  protected readonly showCreateModal = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly canCreate = computed(() => this.permissions.has(TenantPermission.CanCreateResolutionTeam));
  protected readonly canView = computed(() => this.permissions.has(TenantPermission.CanViewResolutionTeams));

  // Only top-level teams show in the main list; subteams are managed from their parent's detail page.
  protected readonly topLevelTeams = computed(() => this.teams().filter((t) => !t.parentUid));

  protected readonly createForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl(''),
    description: new FormControl(''),
    canReplyToCustomer: new FormControl(false),
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.teamService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.teams.set(res.content ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected openTeam(team: ResolutionTeam): void {
    if (!this.canView()) {
      this.toast.error('You do not have permission to view resolution teams.');
      return;
    }
    this.router.navigate(['/teams', team.uid]);
  }

  protected openCreate(): void {
    this.createForm.reset({ name: '', email: '', description: '', canReplyToCustomer: false });
    this.formError.set(null);
    this.showCreateModal.set(true);
  }

  protected closeCreate(): void {
    this.showCreateModal.set(false);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);
    this.formError.set(null);
    const v = this.createForm.getRawValue();

    this.teamService.create({
      name: v.name!,
      email: v.email || null,
      description: v.description || null,
      canReplyToCustomer: !!v.canReplyToCustomer,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Resolution team created.');
          this.showCreateModal.set(false);
          this.load();
        } else {
          this.formError.set(res.message || 'Failed to create team.');
        }
        this.isSubmitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(err.error?.message || 'An error occurred.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
