import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { LeaveRequestComponent } from './leave-request/leave-request.component';
import { AssignLeaveComponent } from './assign-leave/assign-leave.component';
import { ApplyComponent } from './apply/apply.component';
import { LeaveUsageComponent } from './leave-usage/leave-usage.component';
import { LeavePolicyComponent } from './leave-policy/leave-policy.component';
import { LeavePlanComponent } from './leave-plan/leave-plan.component';
import { LeavePlanningDashboardComponent } from './leave-planning-dashboard/leave-planning-dashboard.component';
import { LeaveTimelineComponent } from './leave-timeline/leave-timeline.component';

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
  icon: 'fa fa-calendar-plus'   // planning future leave
},
{ 
  name: 'Plan Dashboard', 
  component: LeaveTimelineComponent, 
  icon: 'fa fa-calendar-alt'    // timeline / overview
},
{ 
  name: 'Plan Requests', 
  component: LeavePlanningDashboardComponent, 
  icon: 'fa fa-tasks'           // requests awaiting action
},
{ 
  name: 'My Leave', 
  component: LeaveUsageComponent, 
  icon: 'fa fa-user-clock'      // personal leave tracking
},
{ 
  name: 'Leave Requests', 
  component: LeaveRequestComponent, 
  icon: 'fa fa-envelope-open-text' // submitted requests
},
// { 
//   name: 'Assign Leave', 
//   component: AssignLeaveComponent, 
//   icon: 'fa fa-user-plus' 
// },
{ 
  name: 'Leave Policy', 
  component: LeavePolicyComponent, 
  icon: 'fa fa-book'            // rules / policy
},


    // { name: 'Apply', component: ApplyComponent, role: 'ROLE_ADMIN' },
    // {
    //   name: 'My Leave Usage',
    //   component: LeaveUsageComponent,
    //   role: 'ROLE_ADMIN',
    // },
  ];
}
