import { Component } from '@angular/core';
import { SITE } from '../../../shared/site/site-links';

interface Faq {
  q: string;
  a: string;
}

@Component({
  selector: 'app-faq-section',
  template: `
    <div class="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white dark:divide-white/[0.06] dark:border-white/10 dark:bg-white/[0.02]">
      @for (item of faqs; track item.q; let first = $first) {
        <details class="group px-5 sm:px-6" [open]="first">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[15px] font-medium text-gray-900 marker:hidden dark:text-white [&::-webkit-details-marker]:hidden">
            {{ item.q }}
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-transform group-open:rotate-45 dark:border-white/10 dark:text-gray-400">
              <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>
            </span>
          </summary>
          <p class="-mt-1 pb-5 pr-10 text-sm leading-6 text-gray-600 dark:text-gray-400">{{ item.a }}</p>
        </details>
      }
    </div>
  `,
})
export class FaqSection {
  protected readonly faqs: Faq[] = [
    {
      q: 'Can we keep our existing support email address?',
      a: 'Yes. Connect any mailbox that supports IMAP and SMTP. CenterDesk checks it for new mail every 30 seconds and replies from the same address, so nothing changes for your customers.',
    },
    {
      q: 'How does the WhatsApp inbox work?',
      a: 'You connect your own WhatsApp Business number through Meta’s Cloud API. Messages arrive in CenterDesk as they’re sent, and your team can reply for 24 hours after the customer’s last message — that’s Meta’s rule for business messaging, and every ticket shows how much of the window is left.',
    },
    {
      q: 'Will the AI reply to customers on its own?',
      a: 'Only where you switch it on — for the categories or mailboxes you choose — and only when your knowledge base clearly answers the question. Everything else goes to your team, with a note saying why the AI held back.',
    },
    {
      q: 'Can we pay in naira?',
      a: 'Yes. Pay in naira by card or bank transfer, or in US dollars by card. The currency you choose at your first payment is used for every renewal, and you can switch on automatic renewal with a saved card.',
    },
    {
      q: 'What happens when the free trial ends?',
      a: `Your workspace and everything in it stays put. Choose a plan from your account any time during or after the ${SITE.trialDays}-day trial to pick up where you left off.`,
    },
    {
      q: 'Is our data kept apart from other companies?',
      a: 'Yes. Every workspace runs on its own database, and files are only ever shared through signed links that expire within the hour.',
    },
    {
      q: 'Can we cancel?',
      a: 'Any time, from your account. You won’t be charged again, and your workspace keeps working until the end of the period you’ve already paid for.',
    },
  ];
}
