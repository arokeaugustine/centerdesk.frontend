import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { VerifyResult } from '../../models/billing.models';

@Component({
  selector: 'app-payment-callback',
  imports: [],
  templateUrl: './payment-callback.html',
})
export class PaymentCallback implements OnInit {
  @Input() reference?: string;

  private readonly billingService = inject(BillingService);
  private readonly router = inject(Router);

  readonly isVerifying = signal(true);
  readonly isSuccess = signal(false);
  readonly verifyResult = signal<VerifyResult | null>(null);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.reference) {
      this.errorMessage.set('No payment reference found. Please contact support.');
      this.isVerifying.set(false);
      return;
    }

    this.billingService.verifyPayment(this.reference).subscribe({
      next: (res) => {
        if (res.success) {
          this.verifyResult.set(res.content);
          this.isSuccess.set(true);
        } else {
          this.errorMessage.set(res.message || 'Payment verification failed. Please contact support.');
        }
        this.isVerifying.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to verify payment. Please contact support or check your billing page.');
        this.isVerifying.set(false);
      },
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  goToBilling(): void {
    this.router.navigate(['/billing']);
  }
}
