import { Component } from '@angular/core';
import { TabConfig } from '../../shared-component/service/interface/data';
import { MyAttendanceComponent } from './my-attendance/my-attendance.component';
import { AttendanceSheetsComponent } from './attendance-sheet/attendance-sheet.component';
import { TimeSheetComponent } from './time-sheet/time-sheet.component';
import { AttendashboardComponent } from './admin/attendashboard/attendashboard.component';
//import { AttendancetableComponent } from './admin/attendancetable/attendancetable.component';
//import { AttendancesummaryComponent } from './admin/attendancesummary/attendancesummary.component';
import { EmployeedashboardComponent } from './employee/employeedashboard/employeedashboard.component';
//import { EmployeesummaryComponent } from './employee/employeesummary/employeesummary.component';
import { CorrectionrequestComponent } from './employee/correctionrequest/correctionrequest.component';
import { AdminCorrectionsComponent } from './admin/admin-corrections/admin-corrections.component';
import { AttendanceReportsComponent } from './admin/attendance-reports/attendance-reports.component';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.scss'
})
export class AttendanceComponent {
  tabsConfig: TabConfig[] = [
    { name: 'Admin Dashboard',
    component: AttendashboardComponent,
    icon: 'fa-solid fa-chart-line',
    /*role: 'ROLE_ADMIN'*/},
    { name: 'Corrections',
      component: AdminCorrectionsComponent,
    icon: 'fa-solid fa-pen-to-square'},
    { name: 'Reports',
      component: AttendanceReportsComponent,
    icon: 'fa-solid fa-file-lines'},
    { name: 'Employee Dashboard',
      component: EmployeedashboardComponent,
    icon: 'fa-solid fa-user'},
    { name: 'Correction Requests',
      component: CorrectionrequestComponent,
    icon: 'fa-solid fa-file-circle-check'},
    //{ name: 'My attendance', component: MyAttendanceComponent },
    //{ name: 'Attendance Sheet', component: AttendanceSheetsComponent },
    //{ name: 'Time Sheet', component: TimeSheetComponent }
  ];
}
