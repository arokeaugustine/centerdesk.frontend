import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexPlotOptions,
  ApexDataLabels, ApexStroke, ApexGrid, ApexFill,
} from 'ng-apexcharts';
import { ReportService } from '../../services/report.service';
import {
  AgentSlaRow, CsatResponseRow, InteractionDimension, InteractionRow, ReportKind,
  TeamPerformanceRow, TenantReport, TicketRegisterRow,
} from '../../models/report.models';
import { ToastService } from '../../../../shared/services/toast.service';
import { PermissionService } from '../../../../core/auth/permission.service';
import { TenantPermission } from '../../../../core/auth/auth.models';
import { Label } from '../../../../shared/components/label/label';
import { isoDaysAgo, localDayBounds } from '../../../../shared/utils/date-range';

/** Which report the page is showing. Each tab owns one endpoint and one export kind. */
type ReportTab = 'overview' | 'tickets' | 'agents' | 'teams' | 'interactions' | 'csat';

const TABS: { id: ReportTab; label: string; kind: ReportKind }[] = [
  { id: 'overview', label: 'Overview', kind: 'Overview' },
  { id: 'tickets', label: 'Ticket Register', kind: 'TicketRegister' },
  { id: 'agents', label: 'Agent SLA', kind: 'AgentSla' },
  { id: 'teams', label: 'Team Performance', kind: 'TeamPerformance' },
  { id: 'interactions', label: 'Interactions', kind: 'Interactions' },
  { id: 'csat', label: 'Satisfaction', kind: 'Csat' },
];

const DIMENSIONS: InteractionDimension[] = ['Channel', 'Category', 'SubCategory', 'Status', 'Priority'];

@Component({
  selector: 'app-report-page',
  imports: [NgApexchartsModule, Label, DecimalPipe],
  templateUrl: './report-page.html',
})
export class ReportPage implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly permissions = inject(PermissionService);
  private readonly toast = inject(ToastService);

  protected readonly tabs = TABS;
  protected readonly dimensions = DIMENSIONS;

  protected readonly activeTab = signal<ReportTab>('overview');
  protected readonly dimension = signal<InteractionDimension>('Channel');

  protected readonly from = signal(isoDaysAgo(30));
  protected readonly to = signal(isoDaysAgo(0));
  protected readonly today = isoDaysAgo(0);

  protected readonly isLoading = signal(false);
  protected readonly isExporting = signal(false);

  protected readonly report = signal<TenantReport | null>(null);
  protected readonly tickets = signal<TicketRegisterRow[]>([]);
  protected readonly agents = signal<AgentSlaRow[]>([]);
  protected readonly teams = signal<TeamPerformanceRow[]>([]);
  protected readonly interactions = signal<InteractionRow[]>([]);
  protected readonly csat = signal<CsatResponseRow[]>([]);

  /**
   * Downloading is its own permission — reading a report in the app and walking out with the
   * whole register as a file are different acts. Hides the button rather than failing on a 403.
   */
  protected readonly canExport = computed(() => this.permissions.has(TenantPermission.CanExportReports));

  /** Mean star rating across the responses in view; null when nobody has rated anything. */
  protected readonly averageRating = computed(() => {
    const rows = this.csat();
    if (rows.length === 0) return null;

    return rows.reduce((sum, row) => sum + row.rating, 0) / rows.length;
  });

  protected readonly series = computed((): ApexAxisChartSeries => [
    { name: 'Tickets', data: (this.report()?.byStatus ?? []).map((s) => s.count) },
  ]);
  protected readonly categories = computed(() => (this.report()?.byStatus ?? []).map((s) => s.status));

  protected readonly chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif', type: 'bar', height: 260, toolbar: { show: false },
  };
  protected readonly plotOptions: ApexPlotOptions = {
    bar: { horizontal: false, columnWidth: '45%', borderRadius: 5, borderRadiusApplication: 'end' },
  };
  protected readonly dataLabels: ApexDataLabels = { enabled: false };
  protected readonly stroke: ApexStroke = { show: true, width: 4, colors: ['transparent'] };
  protected readonly grid: ApexGrid = { yaxis: { lines: { show: true } } };
  protected readonly fill: ApexFill = { opacity: 1 };
  protected readonly colors: string[] = ['#465fff'];

  protected get xaxis(): ApexXAxis {
    return { categories: this.categories(), axisBorder: { show: false }, axisTicks: { show: false } };
  }

  ngOnInit(): void {
    this.load();
  }

  protected selectTab(tab: ReportTab): void {
    if (tab === this.activeTab()) return;

    this.activeTab.set(tab);
    this.load();
  }

  protected selectDimension(dimension: InteractionDimension): void {
    if (dimension === this.dimension()) return;

    this.dimension.set(dimension);
    this.load();
  }

  /** Dragging either end past the other collapses the window onto that day rather than sending
   *  an inverted range the server can only answer with nothing. */
  protected onFromChange(value: string): void {
    if (!value) return;

    this.from.set(value);
    if (value > this.to()) this.to.set(value);
    this.load();
  }

  protected onToChange(value: string): void {
    if (!value) return;

    this.to.set(value);
    if (value < this.from()) this.from.set(value);
    this.load();
  }

  /** Only the active tab's endpoint is called — the others would be wasted round trips. */
  protected load(): void {
    this.isLoading.set(true);

    // The signals hold calendar days for the inputs; the API gets the instants that bound them.
    // Sending the bare dates is what made every Overview figure read 0 — "to = today" bound to
    // today's midnight server-side and excluded everything that happened today.
    const from = localDayBounds(this.from(), 'start');
    const to = localDayBounds(this.to(), 'end');

    switch (this.activeTab()) {
      case 'overview':
        this.reportService.getOverview(from, to).subscribe(
          this.handler<TenantReport | null>((rows) => this.report.set(rows), null));
        break;
      case 'tickets':
        this.reportService.getTicketRegister(from, to).subscribe(
          this.handler<TicketRegisterRow[]>((rows) => this.tickets.set(rows), []));
        break;
      case 'agents':
        this.reportService.getAgentSla(from, to).subscribe(
          this.handler<AgentSlaRow[]>((rows) => this.agents.set(rows), []));
        break;
      case 'teams':
        this.reportService.getTeamPerformance(from, to).subscribe(
          this.handler<TeamPerformanceRow[]>((rows) => this.teams.set(rows), []));
        break;
      case 'interactions':
        this.reportService.getInteractions(from, to, this.dimension()).subscribe(
          this.handler<InteractionRow[]>((rows) => this.interactions.set(rows), []));
        break;
      case 'csat':
        this.reportService.getCsatResponses(from, to).subscribe(
          this.handler<CsatResponseRow[]>((rows) => this.csat.set(rows), []));
        break;
    }
  }

  /**
   * Every tab lands its rows the same way, so the success/empty/error handling lives here once
   * rather than being repeated six times in the switch above.
   */
  private handler<T>(apply: (rows: T) => void, empty: T) {
    return {
      next: (res: { success: boolean; message: string; content: T }) => {
        apply(res.success && res.content ? res.content : empty);
        if (!res.success) this.toast.error(res.message || 'Failed to load report.');
        this.isLoading.set(false);
      },
      error: () => {
        apply(empty);
        this.isLoading.set(false);
        this.toast.error('Failed to load report.');
      },
    };
  }

  protected exportActive(): void {
    const tab = TABS.find((t) => t.id === this.activeTab());
    if (!tab) return;

    this.isExporting.set(true);
    this.reportService
      .exportReport(
        tab.kind,
        localDayBounds(this.from(), 'start'),
        localDayBounds(this.to(), 'end'),
        { dimension: this.dimension() })
      .subscribe({
        next: (response) => {
          this.isExporting.set(false);
          if (response.body) this.saveFile(response.body, this.fileNameFrom(response, tab.kind));
        },
        error: () => {
          this.isExporting.set(false);
          this.toast.error('Failed to export report.');
        },
      });
  }

  /**
   * Prefers the server's Content-Disposition filename so the sheet is named identically whether
   * it came from here or straight from the API; falls back when CORS doesn't expose the header,
   * which it won't cross-origin unless Access-Control-Expose-Headers lists it.
   */
  private fileNameFrom(
    response: { headers: { get(name: string): string | null } },
    kind: ReportKind,
  ): string {
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);

    return match?.[1] ?? `${kind}-${this.from()}-${this.to()}.xlsx`;
  }

  private saveFile(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
