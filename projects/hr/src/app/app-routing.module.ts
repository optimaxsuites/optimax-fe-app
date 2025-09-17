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
import { MygoalComponent } from './ui/view/performance/mygoal/mygoal.component';
import { AddEmployeeFormComponent } from './ui/view/employee-management/add-employee-form/add-employee-form.component';
import { MasterComponent } from './master.component';

const routes: Routes = [
  {
    path: 'user/onboarding/:id/:uuid',
    component: AddEmployeeFormComponent,
  },

  {
    path: '',
    redirectTo: 'recruitment/uu',
    pathMatch: 'full',
  },
  {
    path: 'recruitment/:uuid',
    component: RecruitmentComponent,
  },
  {
    path: 'leave/:uuid',
    component: LeaveComponent,
  },
  {
    path: 'attendance/:uuid',
    component: AttendanceComponent,
  },
  // {
  //   path: 'employee-management/:uuid',
  //   component: EmployeeManagementComponent,
  // },
  {
    path: 'performance/:uuid',
    component: PerformanceComponent,
  },
  {
    path: 'employee-management/:uuid',
    component: EmployeeManagementComponent,
  },
  {
    path: 'payroll/:uuid',
    component: EmployeePayrollComponent,
  },
  {
    path: 'admin/employee-payslip/:uuid',
    component: EmployeePayslipListComponent,
  },
  // {
  //   path: 'attendance/:uuid',
  //   component: AttendanceComponent,
  // },
  { path: 'mygoal', component: MygoalComponent },

  {
    path: 'user/onboarding/:id/:uuid',
    component: AddEmployeeFormComponent,
  },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppHrRoutingModule {}
