import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard.component';
import {FinanceComponent} from './finance/finance.component';
import { LpoComponent } from './lpo/lpo.component';
import { TabConfig } from '../../shared-component/service/interface/data';

@Component({
  selector: 'app-vendor-portal',
  templateUrl: './vendor-portal.component.html',
  styleUrl: './vendor-portal.component.scss'
})
export class VendorPortalComponent {

   tabsConfig: TabConfig[] = [
    {
      name: 'Dashboard',
      component: DashboardComponent,
      icon: 'fa-solid fa-cart-shopping',
      // icon: 'fa-solid fa-bell', 
    },
    {
      name: 'Finance',
      component: FinanceComponent,
      icon: 'fa-solid fa-cart-shopping',
    },
    {
      name: 'LPO',
      component: LpoComponent,
      icon: 'fa-solid fa-cart-shopping',
    },
    
  ];
}
