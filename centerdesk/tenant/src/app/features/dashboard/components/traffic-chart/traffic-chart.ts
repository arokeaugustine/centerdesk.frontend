import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  NgApexchartsModule, ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexFill, ApexGrid,
  ApexLegend, ApexMarkers, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis,
} from 'ng-apexcharts';
import { TrafficPoint } from '../../models/dashboard.models';

/**
 * Incoming mail against replies sent, over the selected window. Two area series rather than a
 * stack: the question these answer is "are we keeping up with what's coming in", which needs
 * the two lines readable against each other, not summed.
 */
@Component({
  selector: 'app-traffic-chart',
  imports: [NgApexchartsModule, DecimalPipe],
  templateUrl: './traffic-chart.html',
})
export class TrafficChart {
  readonly points = input.required<TrafficPoint[]>();
  /** 'day' or 'week' — only used to word the tooltip/axis, the shape is identical. */
  readonly interval = input<string>('day');

  protected readonly hasData = computed(() =>
    this.points().some((p) => p.received > 0 || p.responses > 0));

  protected readonly series = computed((): ApexAxisChartSeries => [
    { name: 'Received', data: this.points().map((p) => p.received) },
    { name: 'Responses', data: this.points().map((p) => p.responses) },
  ]);

  protected readonly totalReceived = computed(() =>
    this.points().reduce((sum, p) => sum + p.received, 0));
  protected readonly totalResponses = computed(() =>
    this.points().reduce((sum, p) => sum + p.responses, 0));

  /**
   * Categories are formatted here rather than handed to a datetime x-axis: the buckets are
   * already evenly spaced by the server, so a plain category axis keeps weekly buckets from
   * being re-spaced as if they were single days.
   *
   * Hourly buckets get a clock label — a single-day window is every point on the same date,
   * so repeating "5 Oct" twenty-four times tells the reader nothing.
   */
  protected readonly categories = computed(() => {
    const hourly = this.interval() === 'hour';

    return this.points().map((p) => {
      const date = new Date(p.date);
      return hourly
        ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    });
  });

  protected readonly xaxis = computed((): ApexXAxis => ({
    type: 'category',
    categories: this.categories(),
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
    // A 30-day window at every-label density overlaps into mush; Apex thins them out for us.
    tickAmount: Math.min(this.categories().length, 12),
    labels: { style: { fontSize: '12px', colors: '#6B7280' }, rotate: 0, hideOverlappingLabels: true },
  }));

  protected readonly chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif',
    height: 310,
    type: 'area',
    toolbar: { show: false },
  };
  protected readonly colors: string[] = ['#465FFF', '#12B76A'];
  protected readonly stroke: ApexStroke = { curve: 'smooth', width: [2, 2] };
  protected readonly fill: ApexFill = { type: 'gradient', gradient: { opacityFrom: 0.45, opacityTo: 0 } };
  protected readonly markers: ApexMarkers = { size: 0, strokeColors: '#fff', strokeWidth: 2, hover: { size: 6 } };
  protected readonly grid: ApexGrid = { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } };
  protected readonly dataLabels: ApexDataLabels = { enabled: false };
  protected readonly tooltip: ApexTooltip = { enabled: true, shared: true };
  protected readonly yaxis: ApexYAxis = {
    // Message counts are whole numbers — without this a quiet window gets a 0/0.5/1 axis.
    forceNiceScale: true,
    labels: { formatter: (value) => `${Math.round(value)}`, style: { fontSize: '12px', colors: ['#6B7280'] } },
    title: { text: '', style: { fontSize: '0px' } },
  };
  protected readonly legend: ApexLegend = { show: false };
}
