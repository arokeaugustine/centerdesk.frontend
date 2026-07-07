import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  imports: [NgClass],
  template: `
    <div class="fixed bottom-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-none">
      @for (item of toast.items(); track item.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg w-[360px] bg-white dark:bg-gray-900 animate-slide-in"
          [ngClass]="borderClass(item.type)"
        >
          <span class="mt-0.5 flex-shrink-0" [ngClass]="iconColorClass(item.type)">
            @switch (item.type) {
              @case ('success') {
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
              @case ('error') {
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              }
              @case ('warning') {
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              }
              @default {
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              }
            }
          </span>

          <p class="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{{ item.message }}</p>

          <button
            (click)="toast.dismiss(item.id)"
            class="mt-0.5 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(100%); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in { animation: slide-in 0.2s ease-out; }
  `],
})
export class Toast {
  protected readonly toast = inject(ToastService);

  protected borderClass(type: ToastType): string {
    return {
      success: 'border-success-200 dark:border-success-800',
      error:   'border-error-200 dark:border-error-800',
      warning: 'border-warning-200 dark:border-warning-800',
      info:    'border-blue-200 dark:border-blue-800',
    }[type];
  }

  protected iconColorClass(type: ToastType): string {
    return {
      success: 'text-success-500',
      error:   'text-error-500',
      warning: 'text-warning-500',
      info:    'text-blue-500',
    }[type];
  }
}
