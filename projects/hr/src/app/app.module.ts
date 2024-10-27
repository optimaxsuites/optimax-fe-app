import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppHrRoutingModule } from './app-routing.module';
import { AppHrComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { RecruitmentComponent } from './ui/view/recruitment/recruitment.component';
import { LeaveComponent } from './ui/view/leave/leave.component';
import { AttendanceComponent } from './ui/view/attendance/attendance.component';
import { EmployeeManagementComponent } from './ui/view/employee-management/employee-management.component';

@NgModule({
  declarations: [
    AppHrComponent,
    RecruitmentComponent,
    LeaveComponent,
    AttendanceComponent,
    EmployeeManagementComponent,
    
  ],
  imports: [
    // BrowserModule,
    AppHrRoutingModule,
    CommonModule
  ],
  providers: [],
  bootstrap: [AppHrComponent]
})
export class AppHrModule { }
