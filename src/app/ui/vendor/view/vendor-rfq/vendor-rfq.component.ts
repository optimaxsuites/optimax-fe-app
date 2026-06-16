import { Component } from '@angular/core';
import { VendorRfqListComponent } from '../vendor-rfq-list/vendor-rfq-list.component';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';

@Component({
  selector: 'app-vendor-rfq',
  templateUrl: './vendor-rfq.component.html',
  styleUrl: './vendor-rfq.component.scss'
})
export class VendorRfqComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Table', component: VendorRfqListComponent },
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
