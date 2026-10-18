import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SettingsService } from '../../services/settings.service';
import { TenantSettings, UpdateTenantSettingsRequest } from '../../models/settings.models';
import { PermissionService } from '../../../../core/auth/permission.service';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-settings-page',
  imports: [],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly settings = signal<TenantSettings | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);

  /** Which switch is mid-flight, so only that row shows a pending state. */
  protected readonly saving = signal<keyof UpdateTenantSettingsRequest | null>(null);

  protected readonly canEdit = computed(() =>
    this.permissions.has(TenantPermission.CanUpdateConfiguration)
  );

  /**
   * Auto-assignment is on but there is nobody for it to assign to. Worth saying plainly: the
   * toggle looks active and nothing happens, and the cause (no user holds the customer-service
   * role) is nowhere near this page.
   */
  protected readonly autoAssignHasNoAgents = computed(() => {
    const s = this.settings();
    return !!s && s.autoAssignTickets && s.customerServiceAgentCount === 0;
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.settingsService.get().subscribe({
      next: (res) => {
        if (res.success) this.settings.set(res.content);
        else this.loadError.set(res.message || 'Could not load settings.');
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(err.error?.message || 'Could not load settings.');
        this.isLoading.set(false);
      },
    });
  }

  protected toggle(field: keyof UpdateTenantSettingsRequest & string): void {
    const current = this.settings();
    if (!current || !this.canEdit() || this.saving()) return;

    const next = !current[field as keyof TenantSettings];

    // Flip immediately so the switch feels responsive, and put it back if the save fails —
    // a switch that lags a round-trip invites a second click and a race.
    this.settings.set({ ...current, [field]: next });
    this.saving.set(field);

    this.settingsService.update({ [field]: next } as UpdateTenantSettingsRequest).subscribe({
      next: (res) => {
        if (res.success) {
          this.settings.set(res.content);
          this.toast.success('Setting saved.');
        } else {
          this.settings.set(current);
          this.toast.error(res.message || 'Could not save that setting.');
        }
        this.saving.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.settings.set(current);
        this.toast.error(err.error?.message || 'Could not save that setting.');
        this.saving.set(null);
      },
    });
  }
}
