import { Component } from '@angular/core';
import { TabConfig } from '../../shared/service/interface/data';
import { RfqListComponent } from './rfq-list/rfq-list.component';

@Component({
  selector: 'app-procurement.page',
  templateUrl: './procurement.page.component.html',
  styleUrl: './procurement.page.component.scss'
})
export class ProcurementPageComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Dashboard', component: 1 },
    { name: 'view 1', component: RfqListComponent },
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
