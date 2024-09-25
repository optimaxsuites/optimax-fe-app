import { Component } from '@angular/core';
import { TabConfig } from 'src/app/ui/shared/service/interface/data';
import { RecuitmentFormComponent } from '../recuitment-form/recuitment-form.component';
import { LeaveRequestComponent } from '../leave-request/leave-request.component';
import { AssignLeaveComponent } from '../assign-leave/assign-leave.component';
import { LeaveUsageComponent } from '../leave-usage/leave-usage.component';
import { ApplyComponent } from '../apply/apply.component';

@Component({
  selector: 'app-leave',
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss'
})
export class LeaveComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Leave requests', component: LeaveRequestComponent, role: 'ROLE_ADMIN' },
    { name: 'Assign leave', component: AssignLeaveComponent , role: 'ROLE_ADMIN' },
    { name: 'My Leave Usage', component: LeaveUsageComponent },
    { name: 'Apply', component: ApplyComponent },

  

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
