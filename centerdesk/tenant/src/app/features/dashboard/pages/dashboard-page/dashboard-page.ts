import { Component } from '@angular/core';
import { EcommerceMetrics } from '../../../../shared/components/ecommerce/ecommerce-metrics/ecommerce-metrics';
import { MonthlySalesChart } from '../../../../shared/components/ecommerce/monthly-sales-chart/monthly-sales-chart';
import { MonthlyTarget } from '../../../../shared/components/ecommerce/monthly-target/monthly-target';
import { StatisticsChart } from '../../../../shared/components/ecommerce/statics-chart/statics-chart';
import { DemographicCard } from '../../../../shared/components/ecommerce/demographic-card/demographic-card';
import { RecentOrders } from '../../../../shared/components/ecommerce/recent-orders/recent-orders';

@Component({
  selector: 'app-dashboard-page',
  imports: [EcommerceMetrics, MonthlySalesChart, MonthlyTarget, StatisticsChart, DemographicCard, RecentOrders],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {}
