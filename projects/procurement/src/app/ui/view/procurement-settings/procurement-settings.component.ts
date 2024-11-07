import { Component } from '@angular/core';

import { RfqCategoryListComponent } from '../rfq-category-list/rfq-category-list.component';
import { TabConfig } from '../../sharedComponent/service/interface/data';

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
