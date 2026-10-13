import { Component } from '@angular/core';

/** A WhatsApp conversation as it looks in a CenterDesk ticket (sample data). */
@Component({
  selector: 'app-inbox-preview',
  template: `
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-white/10 dark:bg-gray-900"
         role="img" aria-label="A WhatsApp conversation in a CenterDesk ticket: the customer's messages, a photo, an internal note and the agent's reply, with the time left in WhatsApp's 24-hour reply window.">
      <div aria-hidden="true">
        <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">CE</span>
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Chinedu Eze</p>
              <p class="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <svg class="h-3 w-3 text-success-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.5 9.6a6.6 6.6 0 0 1-9.8 5.8L3 16.5l1.1-3.6A6.6 6.6 0 1 1 16.5 9.6Z" stroke-linejoin="round"/></svg>
                +234 803 ••• 4412 · TKT-1042
              </p>
            </div>
          </div>
          <span class="hidden rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-medium text-success-700 sm:inline-block dark:bg-success-500/15 dark:text-success-500">Reply window · 18h 42m left</span>
        </div>

        <div class="space-y-3 bg-gray-50/70 px-4 py-4 dark:bg-gray-950/40">
          <div class="max-w-[82%]">
            <div class="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[13px] leading-5 text-gray-700 shadow-theme-xs dark:bg-white/[0.06] dark:text-gray-200">
              Hi, my order #4471 still hasn’t arrived. It was meant to come on Tuesday 😕
            </div>
            <p class="mt-1 pl-1 text-[10px] text-gray-400">WhatsApp · 9:12 am</p>
          </div>

          <div class="max-w-[82%]">
            <div class="flex items-center gap-2.5 rounded-2xl rounded-tl-md bg-white p-2 shadow-theme-xs dark:bg-white/[0.06]">
              <div class="flex h-12 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                <svg class="h-5 w-5 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="14" height="12" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 15 4.5-4 3 2.5L14 11l3 3" stroke-linejoin="round"/></svg>
              </div>
              <div class="pr-2">
                <p class="text-[12px] font-medium text-gray-700 dark:text-gray-200">receipt-4471.jpg</p>
                <p class="text-[10px] text-gray-400">Photo · 412 KB</p>
              </div>
            </div>
            <p class="mt-1 pl-1 text-[10px] text-gray-400">WhatsApp · 9:12 am</p>
          </div>

          <div class="mx-auto max-w-[92%] rounded-xl border border-warning-200 bg-warning-50 px-3.5 py-2.5 dark:border-warning-500/20 dark:bg-warning-500/10">
            <p class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-warning-700 dark:text-warning-400">
              <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 0 0-5 5v2.6L3.4 12.4A1 1 0 0 0 4.3 14h11.4a1 1 0 0 0 .9-1.6L15 9.6V7a5 5 0 0 0-5-5Zm0 16a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 10 18Z"/></svg>
              Internal note · Tolu
            </p>
            <p class="mt-1 text-[12px] leading-5 text-gray-700 dark:text-gray-200">Courier says it’s on the 2nd truck — delivery tomorrow before noon.</p>
          </div>

          <div class="ml-auto max-w-[82%]">
            <div class="rounded-2xl rounded-tr-md bg-brand-500 px-3.5 py-2.5 text-[13px] leading-5 text-white">
              Sorry about the wait, Chinedu! Your parcel is with the courier and will reach you tomorrow before 12pm. I’ll keep an eye on it.
            </div>
            <p class="mt-1 flex items-center justify-end gap-1 pr-1 text-[10px] text-gray-400">
              Tolu · 9:20 am
              <svg class="h-3 w-3 text-brand-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m1.5 8.5 3 3 6-7M7.5 11.5l1 0 6-7"/></svg>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 border-t border-gray-100 px-3 py-2.5 dark:border-white/[0.06]">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m16 9.5-6.3 6.3a4 4 0 0 1-5.6-5.6l6.7-6.7a2.6 2.6 0 0 1 3.7 3.7l-6.6 6.6a1.3 1.3 0 0 1-1.8-1.8L12 6" stroke-linecap="round"/></svg>
          </span>
          <span class="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-[12px] text-gray-400 dark:bg-white/5">Reply on WhatsApp…</span>
          <span class="rounded-lg bg-brand-500 px-3 py-2 text-[12px] font-medium text-white">Send</span>
        </div>
      </div>
    </div>
  `,
})
export class InboxPreview {}
