import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';
import { EmployeePayslipsListComponent } from './ui/view/employee-payslips-list/employee-payslips-list.component';

const routes: Routes = [
  {
    path:'',
    component: DashboardPageComponent,
  },
  {
      path: 'employee-payslip/:uuid',
      component: EmployeePayslipsListComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
