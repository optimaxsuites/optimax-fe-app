import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { ProcurementRequestListComponent } from './procurement-request-list/procurement-request-list.component';

@Component({
  selector: 'app-procurement-request-management',
  templateUrl: './procurement-request-management.component.html',
  styleUrl: './procurement-request-management.component.scss'
})
export class ProcurementRequestManagementComponent {

  tabsConfig: TabConfig[] = [
    {
      name: 'Procurement Desk',
      component: ProcurementRequestListComponent,
      icon: 'fa-solid fa-bell', 
    },
  ];
}
