import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { areaPath, seriesPoints, smoothPath } from './chart-paths';

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  change: string;
  direction: 'up' | 'down';
  good: boolean;
  note: string;
  icon: 'inbox' | 'clock' | 'shield' | 'star';
}

interface TicketRow {
  customer: string;
  initials: string;
  tone: string;
  channel: 'Email' | 'WhatsApp';
  subject: string;
  status: string;
  statusTone: 'warning' | 'success' | 'brand' | 'gray' | 'error';
  agent: { name: string; photo?: string; initials?: string };
  updated: string;
}

/**
 * The hero's product picture: a CenterDesk workspace dashboard drawn in HTML with sample data,
 * styled like the rest of the app (the admin template's cards, badges and area chart).
 */
@Component({
  selector: 'app-dashboard-preview',
  imports: [NgClass],
  templateUrl: './dashboard-preview.html',
})
export class DashboardPreview {
  protected readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  private readonly created = [86, 94, 102, 88, 121, 64, 52];
  private readonly resolved = [78, 91, 97, 96, 112, 71, 59];

  // The top margin leaves room for the label above the busiest day.
  private readonly box = { left: 34, right: 586, top: 50, bottom: 176 };
  protected readonly gridLines = [0, 40, 80, 120].map(v => ({
    value: v,
    y: this.box.bottom - (v / 130) * (this.box.bottom - this.box.top),
  }));
  protected readonly xLabels = this.days.map((d, i) => ({
    label: d,
    x: this.box.left + (i * (this.box.right - this.box.left)) / (this.days.length - 1),
  }));

  private readonly createdPts = seriesPoints(this.created, this.box, 130);
  private readonly resolvedPts = seriesPoints(this.resolved, this.box, 130);
  protected readonly createdLine = smoothPath(this.createdPts);
  protected readonly createdArea = areaPath(this.createdPts, this.box.bottom);
  protected readonly resolvedLine = smoothPath(this.resolvedPts);
  protected readonly resolvedArea = areaPath(this.resolvedPts, this.box.bottom);
  /** The busiest day, marked on the chart. */
  protected readonly peak = this.createdPts[4];

  protected readonly kpis: Kpi[] = [
    { label: 'Open tickets', value: '128', change: '12%', direction: 'down', good: true, note: 'fewer than last week', icon: 'inbox' },
    { label: 'First response', value: '14', unit: 'm', change: '2m', direction: 'up', good: false, note: 'slower than last week', icon: 'clock' },
    { label: 'SLA met', value: '96.4', unit: '%', change: '1.8%', direction: 'up', good: true, note: 'vs last week', icon: 'shield' },
    { label: 'Satisfaction', value: '4.7', unit: '/5', change: '0.2', direction: 'up', good: true, note: 'from 212 ratings', icon: 'star' },
  ];

  protected readonly tickets: TicketRow[] = [
    { customer: 'Chinedu Eze', initials: 'CE', tone: 'bg-orange-100 text-orange-600', channel: 'WhatsApp', subject: 'Order #4471 still hasn’t arrived', status: 'At risk · 12m', statusTone: 'warning', agent: { name: 'Tolu', photo: '/images/site/agent-tolu.jpg' }, updated: '2m' },
    { customer: 'Grace Adeyemi', initials: 'GA', tone: 'bg-brand-100 text-brand-600', channel: 'Email', subject: 'Charged twice for one booking', status: 'On track', statusTone: 'success', agent: { name: 'Amaka', photo: '/images/site/agent-amaka.jpg' }, updated: '9m' },
    { customer: 'Musa Bello', initials: 'MB', tone: 'bg-success-100 text-success-700', channel: 'WhatsApp', subject: 'Can I change my delivery address?', status: 'Answered by AI', statusTone: 'brand', agent: { name: 'AI', initials: 'AI' }, updated: '14m' },
    { customer: 'Ngozi Okafor', initials: 'NO', tone: 'bg-blue-light-100 text-blue-light-700', channel: 'Email', subject: 'Invoice for September', status: 'Waiting on customer', statusTone: 'gray', agent: { name: 'Zainab', photo: '/images/site/agent-zainab.jpg' }, updated: '31m' },
    { customer: 'Peter Mensah', initials: 'PM', tone: 'bg-error-100 text-error-600', channel: 'Email', subject: 'Login link not working', status: 'Breached', statusTone: 'error', agent: { name: 'Kola', initials: 'KO' }, updated: '1h' },
  ];

  // Channel split donut: circumference of r=40 is 251.3.
  protected readonly circumference = 2 * Math.PI * 40;
  protected readonly emailShare = 0.58;

  protected statusClass(tone: TicketRow['statusTone']): string {
    switch (tone) {
      case 'warning': return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400';
      case 'success': return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500';
      case 'brand': return 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300';
      case 'error': return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400';
    }
  }
}
