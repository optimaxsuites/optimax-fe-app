import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppHrComponent } from './app.component';
import { RecruitmentComponent } from './ui/view/recruitment/recruitment.component';
import { LeaveComponent } from './ui/view/leave/leave.component';
import { AttendanceComponent } from './ui/view/attendance/attendance.component';
import { EmployeeManagementComponent } from './ui/view/employee-management/employee-management.component';
import { PerformanceComponent } from './ui/view/performance/performance.component';
import { EmployeePayrollComponent } from './ui/view/payroll/employee-payroll/employee-payroll.component';
import { EmployeePayslipListComponent } from './ui/view/payroll/employee-payslip-list/employee-payslip-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin/hr/recruitment/uu',
    pathMatch: 'full',
  },
  {
    path: 'admin/hr/recruitment/:uuid',
    component: RecruitmentComponent,
  },
  {
    path: 'admin/hr/leave/:uuid',
    component: LeaveComponent,
  },
  {
    path: 'admin/hr/attendance/:uuid',
    component: AttendanceComponent,
  },
  {
    path: 'admin/hr/employee-management/:uuid',
    component: EmployeeManagementComponent,
  },
  {
    path: 'admin/hr/performance/:uuid',
    component: PerformanceComponent,
  },
  {
    path: 'admin/hr/employee-management/:uuid',
    component: EmployeeManagementComponent,
  },
  {
    path: 'admin/hr/payroll/:uuid',
    component: EmployeePayrollComponent,
  },
  {
    path: 'admin/employee-payslip/:uuid',
    component: EmployeePayslipListComponent,
  },
  {
    path: 'admin/hr/attendance/:uuid',
    component: AttendanceComponent,
  },
];

@NgModule({
  // imports: [RouterModule.forRoot(routes)],
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppHrRoutingModule {}
