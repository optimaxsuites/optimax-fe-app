import { Component } from '@angular/core';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { EmployeeComponent } from '../employee/employee.component';

@Component({
  selector: 'app-employee-management',
  templateUrl: './employee-management.component.html',
  styleUrl: './employee-management.component.scss'
})
export class EmployeeManagementComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Employees', component: EmployeeComponent, role: 'ROLE_ADMIN' },


  

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
