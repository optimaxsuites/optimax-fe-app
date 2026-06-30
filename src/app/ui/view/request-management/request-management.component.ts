import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { RequestForQuotationListComponent } from './request-for-quotation-list/request-for-quotation-list.component';

@Component({
  selector: 'app-request-management',
  templateUrl: './request-management.component.html',
  styleUrls: ['./request-management.component.scss']
})
export class RequestManagementComponent {

  tabsConfig: TabConfig[] = [
    {
      name: 'Request for Quotations',
      component: RequestForQuotationListComponent,
      icon: 'fa-solid fa-bell-ring',
      // icon: 'fa-solid fa-bell', 
    },
    // {
    //   name: 'Request Services',
    //   component: ServiceRequestListComponent,
    //   icon: 'fa-solid fa-bell',
    // },
    // {
    //   name: 'Approval Inbox',
    //   component: ApprovalInboxComponent,
    //   icon: 'fa-solid fa-inbox',
    // },
    // {
    //   name: 'Sourcing',
    //   component: SourcingComponent,
    //   icon: 'fa-solid fa-inbox',
    // }
  ];
}
