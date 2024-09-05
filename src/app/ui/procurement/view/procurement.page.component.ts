import { Component } from '@angular/core';
import { TabConfig } from '../../shared/service/interface/data';
import { ProductsComponent } from '../../pos/view/products/products.component';
import { InventoryComponent } from '../../pos/view/inventory/inventory.component';
import { ConfigurationComponent } from '../../pos/view/configuration/configuration.component';
import { ManageUsersComponent } from '../../pos/view/manage-users/manage-users.component';
import { Pro1Component } from './pro-1/pro-1.component';
import { Pro2Component } from './pro-2/pro-2.component';

@Component({
  selector: 'app-procurement.page',
  templateUrl: './procurement.page.component.html',
  styleUrl: './procurement.page.component.scss'
})
export class ProcurementPageComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Dashboard', component: 1 },
    { name: 'view 1', component: Pro1Component },
    { name: 'view 2', component: Pro2Component},
    // { 
    //   name: 'dropdown view', 
    //   component: null, 
    //   hasDropdown: true,
    //   dropdownOptions: [
    //     { label: 'dropdown view 1', action: 'configurations', component: ConfigurationComponent },
    //     { label: 'dropdown view 2', action: 'users', component: ManageUsersComponent }
    //   ]
    // }
  ];
}
