import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';
import { EmployeePayslipsListComponent } from './ui/view/employee-payslips-list/employee-payslips-list.component';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
const routes: Routes = [
  {
    path:'',
    // component: DashboardPageComponent,
    component: DashboardOverviewComponent,
  },
  {
      path: 'employee-payslip',
      component: EmployeePayslipsListComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
