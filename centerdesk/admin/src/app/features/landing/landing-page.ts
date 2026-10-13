import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SiteHeader } from '../../shared/site/site-header';
import { SiteFooter } from '../../shared/site/site-footer';
import { RevealDirective } from '../../shared/site/reveal.directive';
import { SITE } from '../../shared/site/site-links';
import { DashboardPreview } from './components/dashboard-preview';
import { InboxPreview } from './components/inbox-preview';
import { AiPreview } from './components/ai-preview';
import { SlaPreview } from './components/sla-preview';
import { PricingSection } from './components/pricing-section';
import { FaqSection } from './components/faq-section';

/** The public home page: what CenterDesk does, what it costs, and the way in. */
@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink, SiteHeader, SiteFooter, RevealDirective,
    DashboardPreview, InboxPreview, AiPreview, SlaPreview, PricingSection, FaqSection,
  ],
  templateUrl: './landing-page.html',
})
export class LandingPage {
  protected readonly auth = inject(AuthService);
  protected readonly site = SITE;

  protected readonly channels = [
    { title: 'Your support mailbox', detail: 'Any IMAP & SMTP account', icon: 'mail' },
    { title: 'WhatsApp Business', detail: 'Through Meta’s Cloud API', icon: 'chat' },
    { title: 'Your knowledge base', detail: 'Articles and solved tickets', icon: 'book' },
    { title: 'Naira & dollar billing', detail: 'Card or bank transfer', icon: 'card' },
  ];

  protected readonly steps = [
    {
      title: 'Connect your channels',
      body: 'Add your support mailbox and your WhatsApp Business number. Mail is checked every 30 seconds; WhatsApp messages land as they’re sent.',
    },
    {
      title: 'Route every conversation',
      body: 'New tickets go to whoever is on shift with the lightest load. SLA clocks start, and anything that needs a specialist goes to a resolution team.',
    },
    {
      title: 'Resolve, then improve',
      body: 'Reply with files, let AI answer what your knowledge base already covers, and watch response times and satisfaction in your reports.',
    },
  ];

  protected readonly extras = [
    { title: 'Internal notes', body: 'Talk a ticket through with your team right on the thread. Customers never see it.', icon: 'note' },
    { title: 'Sub-tickets for specialists', body: 'Hand a problem to a resolution team without cluttering the customer’s conversation — and get it back when it’s done.', icon: 'split' },
    { title: 'Files on every channel', body: 'Attach photos, PDFs and voice notes to any reply, by email or WhatsApp. What customers send opens right in the thread.', icon: 'clip' },
    { title: 'Satisfaction surveys', body: 'After a ticket is closed, customers rate their experience with one click.', icon: 'star' },
    { title: 'Email filters', body: 'Route mail by sender, domain or subject — set its priority or category, or turn it away — before anyone opens it.', icon: 'filter' },
    { title: 'Roles and permissions', body: 'Decide exactly who can reply, reassign, see reports or manage billing.', icon: 'key' },
    { title: 'Instant alerts', body: 'Agents are notified the moment a ticket is assigned to them or handed back.', icon: 'bell' },
    { title: 'Reports', body: 'Volumes, response times, SLA breaches and agent performance for any date range.', icon: 'chart' },
  ];

  protected readonly safeguards = [
    { title: 'A database of your own', body: 'Every workspace runs on its own database — your tickets never share a table with another company’s.' },
    { title: 'Replies that don’t get lost', body: 'Every outgoing email and WhatsApp message goes through a queue and is retried if a provider has a bad moment.' },
    { title: 'Private files, expiring links', body: 'Attachments live in private storage and are only shared through signed links that expire within the hour.' },
    { title: 'Credentials kept secret', body: 'Passwords are hashed, and mailbox and WhatsApp credentials are encrypted before they’re stored.' },
  ];
}
