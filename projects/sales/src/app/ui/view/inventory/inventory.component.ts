import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { InventoryDashboardComponent } from './inventory-dashboard/inventory-dashboard.component';
import { ProductManagementComponent } from './product/product-management/product-management.component';
import { BranchInventoryComponent } from './branch/branch-inventory/branch-inventory.component';
import { StockMovementComponent } from './stock/stock-movement/stock-movement.component';
import { RestockManagementComponent } from './restock/restock-management/restock-management.component';
import { AnalyticsComponent } from './inventory-analytics/analytics/analytics.component';
import { BranchManagerDashboardComponent } from './branch-managers/branch-manager-dashboard/branch-manager-dashboard.component';
import { UserContextService, UserRole } from '../../service/inventory/user-context.service';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent {
  // Demo-only "View as" switcher: this mock module has no real login, so this is how the
  // Admin vs. Branch Manager permission matrix (branch scoping, approval/threshold access,
  // limited transfers) can actually be exercised and seen in the UI.
  constructor(private userContext: UserContextService) {}

  get currentRole(): UserRole {
    return this.userContext.getUserRole();
  }

  onRoleChange(role: UserRole): void {
    this.userContext.setUser({ ...this.userContext.getUser(), role });
    // Simplest reliable way to make every already-loaded inventory component re-fetch
    // and re-guard against the new role, rather than wiring a role-change subscription
    // through each one individually.
    window.location.reload();
  }

  tabsConfig: TabConfig[] = [
    {
      name: 'Inventory Dashboard',
      component: InventoryDashboardComponent,
      icon: 'fa-sharp fa-solid fa-chart-line'
    },
    {
      name: 'Product Management',
      component: ProductManagementComponent,
      icon: 'fa-sharp fa-solid fa-box-open'
    },
    {
      name: 'Branch Inventory',
      component: BranchInventoryComponent,
      icon: 'fa-sharp fa-solid fa-store'
    },
    {
      name: 'Stock Movement',
      component: StockMovementComponent,
      icon: 'fa-sharp fa-solid fa-arrow-right-arrow-left'
    },
    {
      name: 'Restock Management',
      component: RestockManagementComponent,
      icon: 'fa-sharp fa-solid fa-cart-plus'
    },
    {
      name: 'Analytics',
      component: AnalyticsComponent,
      icon: 'fa-sharp fa-solid fa-chart-line'
    },
    {
      name: 'Branch Manager',
      component: BranchManagerDashboardComponent,
      icon: 'fa-solid fa-user'
    }
  ]
}
