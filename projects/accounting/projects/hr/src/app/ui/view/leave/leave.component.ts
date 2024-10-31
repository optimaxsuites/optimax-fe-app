import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { LeaveRequestComponent } from './leave-request/leave-request.component';
import { AssignLeaveComponent } from './assign-leave/assign-leave.component';
import { ApplyComponent } from './apply/apply.component';
import { LeaveUsageComponent } from './leave-usage/leave-usage.component';

@Component({
  selector: 'app-leave',
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss'
})
export class LeaveComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Leave requests', component: LeaveRequestComponent, role: 'ROLE_ADMIN' },
    { name: 'Assign leave', component: AssignLeaveComponent , role: 'ROLE_ADMIN' },
    { name: 'Apply', component: ApplyComponent },
    { name: 'My Leave Usage', component: LeaveUsageComponent },
  ];
}
