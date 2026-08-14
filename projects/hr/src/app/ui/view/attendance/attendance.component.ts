import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { MyAttendanceComponent } from './my-attendance/my-attendance.component';
import { AttendashboardComponent } from './admin/attendashboard/attendashboard.component';
import { EmployeedashboardComponent } from './employee/employeedashboard/employeedashboard.component';
import { CorrectionrequestComponent } from './employee/correctionrequest/correctionrequest.component';
import { ReportsComponent } from './admin/reports/reports.component';
import { RemoteCheckinComponent } from './employee/remote-checkin/remote-checkin.component';
import { BiometricEnrollmentComponent } from '../biometric/biometric-enrollment/biometric-enrollment.component';
import { CrossBranchRequestComponent } from './employee/cross-branch/cross-branch-request.component';
import { SupervisorApprovalQueueComponent } from './admin/supervisor-approval-queue/supervisor-approval-queue.component';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss'
})
export class AttendanceComponent {
  tabsConfig: TabConfig[] = [
    // Admin features
    { name: 'Admin Dashboard',
    component: AttendashboardComponent,
    icon: 'fa-solid fa-chart-line' },
    { name: 'Reports',
      component: ReportsComponent,
    icon: 'fa-solid fa-file-lines' },

    // Employee features
    { name: 'My Attendance',
      component: EmployeedashboardComponent,
    icon: 'fa-solid fa-user' },
    { name: 'Biometric Enrollment',
      component: BiometricEnrollmentComponent,
    icon: 'fa-solid fa-fingerprint' }
  ];
}
