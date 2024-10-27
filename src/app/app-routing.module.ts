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
    path: "recruitment",
    component: RecruitmentComponent
  },
  {
    path: "leave",
    component: LeaveComponent
  },
  {
    path: "attendance",
    component: AttendanceComponent
  },
  {
    path: "employee-management",
    component: EmployeeManagementComponent
  }

];

// @NgModule({
//   imports: [RouterModule.forRoot(routes)],
//   exports: [RouterModule]
// })

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppHrRoutingModule { }
