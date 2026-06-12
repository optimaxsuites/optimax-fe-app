import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FinanceComponent } from './finance/finance.component';
import { LpoComponent } from './lpo/lpo.component';
import { PerformanceComponent } from './performance/performance.component';
import { DocumentsComponent } from './documents/documents.component';
import { TabConfig } from '../../shared-component/service/interface/data';

@Component({
  selector: 'app-vendor-portal',
  templateUrl: './vendor-portal.component.html',
  styleUrl: './vendor-portal.component.scss',
})
export class VendorPortalComponent {
  tabsConfig: TabConfig[] = [
  {
    name: 'Dashboard',
    component: DashboardComponent,
    icon: 'fa-solid fa-table-columns',
  },
  {
    name: 'Finance',
    component: FinanceComponent,
    icon: 'fa-solid fa-file-invoice-dollar',
  },
  {
    name: 'LPO',
    component: LpoComponent,
    icon: 'fa-solid fa-file-contract',
  },
  {
    name: 'Performance',
    component: PerformanceComponent,
    icon: 'fa-solid fa-chart-line',
  },
  {
    name: 'Documents',
    component: DocumentsComponent,
    icon: 'fa-solid fa-folder-open',
  },
]
}
