import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { LogisticsDashboardComponent } from './logistics-dashboard/logistics-dashboard.component';
import { DeliveryManagementsComponent } from './delivery-management/delivery-management.component';
import { FleetManagementComponent } from './fleet-management/fleet-management.component';
import { RouteOptimizationComponent } from './route-optimization/route-optimization.component';
import { TrackingComponent } from './tracking/tracking.component';

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
    {
      name: 'Delivery management',
      component: DeliveryManagementsComponent,
      icon: 'pi pi-dashboard'
    },
    {
      name: 'Fleet management',
      component: FleetManagementComponent,
      icon: 'pi pi-dashboard'
    },
    {
      name: 'Route Optimization',
      component: RouteOptimizationComponent,
      icon: 'pi pi-dashboard'
    },
    {
      name: 'Tracking',
      component: TrackingComponent,
      icon: 'pi pi-dashboard'
    },

  ]



}
