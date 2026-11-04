import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FinanceComponent } from './finance/finance.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { LpoComponent } from './lpo/lpo.component';
import { PerformanceComponent } from './performance/performance.component';
import { DocumentsComponent } from './documents/documents.component';
import { TabConfig } from '../../shared-component/service/interface/data';
import { VendorRegistrationComponent } from './vendor-registration/vendor-registration.component';
import { VendorDashboardComponent } from './vendor-dashboard/vendor-dashboard.component';
import { VendorProfileComponent } from './vendor-profile/vendor-profile.component';

@Component({
  selector: 'app-vendor-portal',
  templateUrl: './vendor-portal.component.html',
  styleUrl: './vendor-portal.component.scss',
})
export class VendorPortalComponent {
  tabsConfig: TabConfig[] = [

    {
      name: 'Upload Your Details',
      component: VendorRegistrationComponent,
      icon: 'fa-solid fa-table-columns',
    },
    {
      name: 'Dashboard',
      component: VendorDashboardComponent,
      icon: 'fa-solid fa-table-columns',
    },
    {
      name: 'Pipeline',
      component: PipelineComponent,
      icon: 'fa-solid fa-file-invoice-dollar',
    },
    // Pipeline only covers RFQs and quotations, so LPOs and invoices live here.
    {
      name: 'LPOs & Invoices',
      component: FinanceComponent,
      icon: 'fa-solid fa-file-contract',
    },
    // Merged into "Pipeline" and "LPOs & Invoices" above — kept here, unreferenced,
    // rather than deleted outright, in case anything else still imports them.
    // {
    //   name: 'RFQ',
    //   component: DashboardComponent,
    //   icon: 'fa-solid fa-table-columns',
    // },
    // {
    //   name: 'LPO',
    //   component: LpoComponent,
    //   icon: 'fa-solid fa-file-contract',
    // },
    {
      name: 'Performance',
      component: PerformanceComponent,
      icon: 'fa-solid fa-chart-line',
    },
    // {
    //   name: 'Documents',
    //   component: DocumentsComponent,
    //   icon: 'fa-solid fa-folder-open',
    // },
    {
      name: 'Profile',
      component: VendorProfileComponent,
      icon: 'fa-solid fa-user',
    },
  ]
}
