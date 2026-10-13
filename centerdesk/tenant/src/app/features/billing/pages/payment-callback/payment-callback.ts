import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { BillingCurrency, VerifyResult } from '../../models/billing.models';

@Component({
  selector: 'app-payment-callback',
  imports: [],
  templateUrl: './payment-callback.html',
})
export class PaymentCallback implements OnInit {
  // Bachs appends ?checkout_id=chk_… when it sends the customer back; ?reference= still works.
  @Input('checkout_id') checkoutId?: string;
  @Input() reference?: string;

  private readonly billingService = inject(BillingService);
  private readonly router = inject(Router);

  readonly isVerifying = signal(true);
  readonly isSuccess = signal(false);
  readonly verifyResult = signal<VerifyResult | null>(null);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.checkoutId && !this.reference) {
      this.errorMessage.set('No payment reference found. If you completed a payment, check your billing page or contact support.');
      this.isVerifying.set(false);
      return;
    }

    this.billingService.verifyPayment({ checkoutId: this.checkoutId, reference: this.reference }).subscribe({
      next: (res) => {
        if (res.success && res.content?.status === 'paid') {
          this.verifyResult.set(res.content);
          this.isSuccess.set(true);
        } else {
          this.errorMessage.set(
            res.content?.message || res.message || 'Payment could not be confirmed yet. Please check your billing page.'
          );
        }
        this.isVerifying.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to verify payment. Please contact support or check your billing page.');
        this.isVerifying.set(false);
      },
    });
  }

  formatCurrency(amount: number, currency: BillingCurrency = 'NGN'): string {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  goToBilling(): void {
    this.router.navigate(['/billing']);
  }
}
