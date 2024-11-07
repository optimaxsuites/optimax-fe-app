import { Component, ViewEncapsulation } from '@angular/core';
import { POSDashboardComponent } from './posdashboard/posdashboard.component';
import { ProductsComponent } from './products/products.component';
import { InventoryComponent } from './inventory/inventory.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { ManageUsersComponent } from './manage-users/manage-users.component';
import { TabConfig } from '../sharedComponent/service/interface/data';

@Component({
  selector: 'app-pos-page',
  templateUrl: './pos-page.component.html',
  styleUrl: './pos-page.component.scss',
  encapsulation: ViewEncapsulation.Emulated 
})
export class PosPageComponent {
  isDropdownOpen = false;
  selectedTab: string = 'dashboard'; 
  selectedSetting: string | null = null;

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
   
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    this.isDropdownOpen = false; 
  }

  selectSetting(setting: string) {
    this.selectedTab = 'settings'; 
    this.selectedSetting = setting;
    this.isDropdownOpen = false; 
  }


  tabsConfig: TabConfig[] = [
    { name: 'Dashboard', component: POSDashboardComponent },
    { name: 'Products', component: ProductsComponent },
    { name: 'Inventory', component: InventoryComponent},
    { 
      name: 'Settings', 
      component: null, 
      hasDropdown: true,
      dropdownOptions: [
        { label: 'Configurations', action: 'configurations', component: ConfigurationComponent },
        { label: 'Users', action: 'users', component: ManageUsersComponent }
      ]
    }
  ];
  
}
