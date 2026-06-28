import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { TenantsService } from '../../tenants.service';
import { PlansService, PlanItem } from '../../../plans/plans.service';

@Component({
  selector: 'app-tenant-create',
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './tenant-create.html',
  styleUrl: './tenant-create.scss',
})
export class TenantCreate {
  private readonly tenantsService = inject(TenantsService);
  private readonly plansService = inject(PlansService);
  private readonly router = inject(Router);

  protected readonly plans = signal<PlanItem[]>([]);
  protected readonly plansLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly isSuccess = signal(false);
  protected readonly countdown = signal(5);
  protected readonly error = signal<string | null>(null);
  protected readonly billingCycle = signal<'monthly' | 'yearly'>('monthly');

  protected readonly form = new FormGroup({
    companyName:    new FormControl('', [Validators.required]),
    slug:           new FormControl('', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]),
    adminFirstName: new FormControl('', [Validators.required]),
    adminLastName:  new FormControl('', [Validators.required]),
    adminEmail:     new FormControl('', [Validators.required, Validators.email]),
    phoneNumber:    new FormControl('', [Validators.required]),
    industry:       new FormControl('', [Validators.required]),
    planId:         new FormControl<number | null>(null, [Validators.required]),
    billingCycle:   new FormControl<'monthly' | 'yearly'>('monthly', [Validators.required]),
  });

  constructor() {
    this.plansService.getPlans().subscribe({
      next: (res) => {
        if (res.success) this.plans.set(res.content);
        this.plansLoading.set(false);
      },
      error: () => this.plansLoading.set(false),
    });

    // Auto-generate slug from company name
    this.form.get('companyName')!.valueChanges.subscribe((name) => {
      if (!name) return;
      const slugControl = this.form.get('slug')!;
      if (!slugControl.dirty) {
        slugControl.setValue(
          name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          { emitEvent: false }
        );
      }
    });
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.error.set(null);

    this.tenantsService.register({
      companyName:    v.companyName!,
      slug:           v.slug!,
      adminEmail:     v.adminEmail!,
      adminFirstName: v.adminFirstName!,
      adminLastName:  v.adminLastName!,
      phoneNumber:    v.phoneNumber!,
      industry:       v.industry!,
      planId:         v.planId!,
      billingCycle:   v.billingCycle!,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.isSubmitting.set(false);
          this.isSuccess.set(true);
          this.startCountdown();
        } else {
          this.error.set(res.message || 'Registration failed. Please try again.');
          this.isSubmitting.set(false);
        }
      },
      error: () => {
        this.error.set('An error occurred. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  private startCountdown(): void {
    this.countdown.set(5);
    const tick = setInterval(() => {
      const next = this.countdown() - 1;
      this.countdown.set(next);
      if (next <= 0) {
        clearInterval(tick);
        this.router.navigate(['/tenants']);
      }
    }, 1000);
  }

  protected goToTenants(): void {
    this.router.navigate(['/tenants']);
  }

  protected setBillingCycle(value: 'monthly' | 'yearly'): void {
    this.billingCycle.set(value);
    this.form.get('billingCycle')!.setValue(value);
  }

  protected hasError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  protected fieldError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors || !ctrl.touched) return '';
    if (ctrl.errors['required'])   return 'This field is required.';
    if (ctrl.errors['email'])      return 'Enter a valid email address.';
    if (ctrl.errors['minlength'])  return `Minimum ${ctrl.errors['minlength'].requiredLength} characters.`;
    if (ctrl.errors['pattern'])    return 'Only lowercase letters, numbers and hyphens allowed.';
    return 'Invalid value.';
  }
}
