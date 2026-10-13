import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output } from '@angular/core';

/** A centred dialog over a dimmed page (Escape or the backdrop closes it unless it's busy). */
@Component({
  selector: 'app-site-dialog',
  template: `
    @if (open) {
      <div class="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-6">
        <div class="absolute inset-0 bg-gray-950/50 backdrop-blur-[2px]" (click)="dismiss()"></div>
        <div class="relative w-full overflow-y-auto rounded-t-2xl bg-white shadow-theme-xl animate-slide-in sm:rounded-2xl dark:bg-gray-900 dark:ring-1 dark:ring-white/10"
             [style.maxWidth.px]="width" style="max-height: calc(100vh - 2rem)"
             role="dialog" aria-modal="true" [attr.aria-label]="label">
          <button type="button" (click)="dismiss()" [disabled]="busy" aria-label="Close"
                  class="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-white/5 dark:hover:text-gray-200">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m5 5 10 10M15 5 5 15"/></svg>
          </button>
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class SiteDialog implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() busy = false;
  @Input() width = 520;
  @Input() label = '';
  @Output() closed = new EventEmitter<void>();

  ngOnChanges(): void {
    document.body.style.overflow = this.open ? 'hidden' : '';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open) this.dismiss();
  }

  protected dismiss(): void {
    if (!this.busy) this.closed.emit();
  }
}
