import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';
import { EmployeePayslipsListComponent } from './ui/view/employee-payslips-list/employee-payslips-list.component';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { GeneraldashboardComponent } from './generaldashboard/generaldashboard.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
const routes: Routes = [
  {
    path:':uuid',
    // component: DashboardPageComponent,
    // component: DashboardOverviewComponent,
    // component: GeneraldashboardComponent
    component: HrDashboardComponent
  },
  {
    path: 'dashboard-overview',
    component: DashboardOverviewComponent,
  },
  {
      path: 'employee-payslip',
      component: EmployeePayslipsListComponent,
  },
  {
    path: 'general-dashboard',
    component: GeneraldashboardComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
