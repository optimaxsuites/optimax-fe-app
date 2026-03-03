import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { LeaveRequestComponent } from './leave-request/leave-request.component';
import { AssignLeaveComponent } from './assign-leave/assign-leave.component';
import { ApplyComponent } from './apply/apply.component';
import { LeaveUsageComponent } from './leave-usage/leave-usage.component';
import { LeavePolicyComponent } from './leave-policy/leave-policy.component';
import { LeavePlanComponent } from './leave-plan/leave-plan.component';
import { LeavePlanningDashboardComponent } from './leave-planning-dashboard/leave-planning-dashboard.component';

@Component({
  selector: 'app-leave',
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss',
})
export class LeaveComponent {
  tabsConfig: TabConfig[] = [
    // { name: 'Leave requests', component: LeaveRequestComponent, role: 'ROLE_ADMIN' },
    // { name: 'Assign leave', component: AssignLeaveComponent , role: 'ROLE_ADMIN' },
    // {
    //   name: 'Leave Policy',
    //   component: LeavePolicyComponent,
    //   role: 'ROLE_ADMIN',
    // },
    // { name: 'Apply', component: ApplyComponent },
{ 
  name: 'Leave Plan', 
  component: LeavePlanComponent, 
  icon: 'fa fa-calendar-check' 
},
{ 
  name: 'Leave Planning Dashboard', 
  component: LeavePlanningDashboardComponent, 
  icon: 'fa fa-chart-line' 
},
{ 
  name: 'My Leave Usage', 
  component: LeaveUsageComponent, 
  icon: 'fa fa-chart-pie' 
},
{ 
  name: 'Leave Requests', 
  component: LeaveRequestComponent, 
  icon: 'fa fa-file-alt' 
},
// { 
//   name: 'Assign Leave', 
//   component: AssignLeaveComponent, 
//   icon: 'fa fa-user-plus' 
// },
{ 
  name: 'Leave Policy', 
  component: LeavePolicyComponent, 
  icon: 'fa fa-balance-scale' 
},


    // { name: 'Apply', component: ApplyComponent, role: 'ROLE_ADMIN' },
    // {
    //   name: 'My Leave Usage',
    //   component: LeaveUsageComponent,
    //   role: 'ROLE_ADMIN',
    // },
  ];
}
