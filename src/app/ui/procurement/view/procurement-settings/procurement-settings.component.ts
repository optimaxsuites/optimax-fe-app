import { Component } from '@angular/core';
import { InventoryComponent } from 'src/app/ui/pos/view/inventory/inventory.component';
import { ProductsComponent } from 'src/app/ui/pos/view/products/products.component';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { RfqCategoryListComponent } from '../rfq-category-list/rfq-category-list.component';

@Component({
  selector: 'app-procurement-settings',
  templateUrl: './procurement-settings.component.html',
  styleUrl: './procurement-settings.component.scss'
})
export class ProcurementSettingsComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Category', component: RfqCategoryListComponent },
    // { name: 'view2', component: RfqCategoryListComponent },
    // { 
    //   name: 'Settings', 
    //   component: null, 
    //   hasDropdown: true,
    //   dropdownOptions: [
    //     { label: 'Configurations', action: 'configurations', component: ConfigurationComponent },
    //     { label: 'Users', action: 'users', component: ManageUsersComponent }
    //   ]
    // }
  ];
}
