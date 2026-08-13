import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { LogisticsDashboardComponent } from './logistics-dashboard/logistics-dashboard.component';

@Component({
  selector: 'app-logistics',
  templateUrl: './logistics.component.html',
  styleUrl: './logistics.component.scss'
})
export class LogisticsComponent {
  tabsConfig: TabConfig[] = [
    {
      name: 'Logistics Dashboard',
      component: LogisticsDashboardComponent,
      icon: 'pi pi-dashboard'
    },

  ]



}
