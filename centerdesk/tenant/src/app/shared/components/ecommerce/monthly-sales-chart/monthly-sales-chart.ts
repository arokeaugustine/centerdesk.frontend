import { Component } from '@angular/core';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexPlotOptions,
  ApexDataLabels,
  ApexStroke,
  ApexLegend,
  ApexYAxis,
  ApexGrid,
  ApexFill,
  ApexTooltip,
} from 'ng-apexcharts';
import { Dropdown } from '../../dropdown/dropdown';
import { DropdownItem } from '../../dropdown/dropdown-item/dropdown-item';

@Component({
  selector: 'app-monthly-sales-chart',
  imports: [NgApexchartsModule, Dropdown, DropdownItem],
  templateUrl: './monthly-sales-chart.html',
})
export class MonthlySalesChart {
  public series: ApexAxisChartSeries = [
    { name: 'Sales', data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112] },
  ];
  public chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif',
    type: 'bar',
    height: 180,
    toolbar: { show: false },
  };
  public xaxis: ApexXAxis = {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    axisBorder: { show: false },
    axisTicks: { show: false },
  };
  public plotOptions: ApexPlotOptions = {
    bar: { horizontal: false, columnWidth: '39%', borderRadius: 5, borderRadiusApplication: 'end' },
  };
  public dataLabels: ApexDataLabels = { enabled: false };
  public stroke: ApexStroke = { show: true, width: 4, colors: ['transparent'] };
  public legend: ApexLegend = { show: true, position: 'top', horizontalAlign: 'left', fontFamily: 'Outfit' };
  public yaxis: ApexYAxis = { title: { text: undefined } };
  public grid: ApexGrid = { yaxis: { lines: { show: true } } };
  public fill: ApexFill = { opacity: 1 };
  public tooltip: ApexTooltip = { x: { show: false }, y: { formatter: (val: number) => `${val}` } };
  public colors: string[] = ['#465fff'];

  isOpen = false;

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  closeDropdown(): void {
    this.isOpen = false;
  }
}
