import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { ProductRequestListComponent } from './product-request-management/product-request-list/product-request-list.component';
import { ServiceRequestListComponent } from './service-request-management/service-request-list/service-request-list.component';
import { ApprovalInboxComponent } from '../approval-inbox/approval-inbox.component';
import { SourcingComponent } from '../sourcing/sourcing.component';

@Component({
  selector: 'app-request-management',
  templateUrl: './request-management.component.html',
  styleUrls: ['./request-management.component.scss']
})
export class RequestManagementComponent {

  tabsConfig: TabConfig[] = [
    {
      name: 'Procure Products',
      component: ProductRequestListComponent,
      icon: 'fa-solid fa-cart-shopping',
      // icon: 'fa-solid fa-bell', 
    },
    {
      name: 'Request Services',
      component: ServiceRequestListComponent,
      icon: 'fa-solid fa-bell',
    },
    {
      name: 'Approval Inbox',
      component: ApprovalInboxComponent,
      icon: 'fa-solid fa-inbox',
    },
    {
      name: 'Sourcing',
      component: SourcingComponent,
      icon: 'fa-solid fa-inbox',
    }
  ];
}
