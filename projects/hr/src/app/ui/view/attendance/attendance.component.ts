import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { MyAttendanceComponent } from './my-attendance/my-attendance.component';
import { AttendanceSheetsComponent } from './attendance-sheet/attendance-sheet.component';
import { TimeSheetComponent } from './time-sheet/time-sheet.component';
import { AttendashboardComponent } from './admin/attendashboard/attendashboard.component';
import { EmployeedashboardComponent } from './employee/employeedashboard/employeedashboard.component';
import { CorrectionrequestComponent } from './employee/correctionrequest/correctionrequest.component';
import { AdminCorrectionsComponent } from './admin/admin-corrections/admin-corrections.component';
import { AttendanceReportsComponent } from './admin/attendance-reports/attendance-reports.component';
import { RemoteCheckinComponent } from './employee/remote-checkin/remote-checkin.component';
import { BiometricEnrollmentComponent } from '../biometric/biometric-enrollment/biometric-enrollment.component';
import { CrossBranchRequestComponent } from './employee/cross-branch/cross-branch-request.component';
import { FraudDetectionDashboardComponent } from './admin/fraud-detection-dashboard/fraud-detection-dashboard.component';
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
    { name: 'Fraud Detection',
      component: FraudDetectionDashboardComponent,
    icon: 'fa-solid fa-shield' },
    { name: 'Approvals Queue',
      component: SupervisorApprovalQueueComponent,
    icon: 'fa-solid fa-check-double' },
    { name: 'Corrections',
      component: AdminCorrectionsComponent,
    icon: 'fa-solid fa-pen-to-square' },
    { name: 'Reports',
      component: AttendanceReportsComponent,
    icon: 'fa-solid fa-file-lines' },

    // Employee features
    { name: 'Employee Dashboard',
      component: EmployeedashboardComponent,
    icon: 'fa-solid fa-user' },
    { name: 'Remote Check-in',
      component: RemoteCheckinComponent,
    icon: 'fa-solid fa-location-dot' },
    { name: 'Biometric Enrollment',
      component: BiometricEnrollmentComponent,
    icon: 'fa-solid fa-fingerprint' },
    { name: 'Cross-Branch Request',
      component: CrossBranchRequestComponent,
    icon: 'fa-solid fa-building' },
    { name: 'Correction Requests',
      component: CorrectionrequestComponent,
    icon: 'fa-solid fa-file-circle-check' }
  ];
}
