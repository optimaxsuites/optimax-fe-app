import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppHrComponent } from './app.component';
import { RecruitmentComponent } from './ui/view/recruitment/recruitment.component';
import { LeaveComponent } from './ui/view/leave/leave.component';
import { AttendanceComponent } from './ui/view/attendance/attendance.component';
import { EmployeeManagementComponent } from './ui/view/employee-management/employee-management.component';

const routes: Routes = [
  // {
  //   path: "",
  //   component: AppHrComponent
  // }

  {
    path: "admin/hr/recruitment/:uuid",
    component: RecruitmentComponent
  },
  {
    path: "admin/hr/leave/:uuid",
    component: LeaveComponent
  },
  {
    path: "admin/hr/attendance/:uuid",
    component: AttendanceComponent
  },
  {
    path: "admin/hr/employee-management/:uuid",
    component: EmployeeManagementComponent
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

// @NgModule({
//   imports: [RouterModule.forChild(routes)],
//   exports: [RouterModule]
// })
export class AppHrRoutingModule { }
