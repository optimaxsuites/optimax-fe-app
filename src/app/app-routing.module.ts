import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';
import { EmployeePayslipsListComponent } from './ui/view/employee-payslips-list/employee-payslips-list.component';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { GeneraldashboardComponent } from './generaldashboard/generaldashboard.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
import { OptimaxaiComponent } from './optimax-ai/optimax-ai.component';
import { CommunicationComponent } from './communication/communication.component';
import { AnalyticsComponent } from './analytics/analytics.component';
const routes: Routes = [
  {
    path:'',
    redirectTo: '/uu',
    pathMatch: 'full'
  },
  {
    path:'HR/:uuid',
    // component: DashboardPageComponent,
    // component: DashboardOverviewComponent,
    // component: GeneraldashboardComponent
    component: HrDashboardComponent
  },
  {
    path: 'POS/:uuid',
    component: DashboardOverviewComponent,
  },
  {
      path: 'employee-payslip/:uuid',
      component: EmployeePayslipsListComponent,
  },
  {
    path: ':uuid',
    component: GeneraldashboardComponent,
  },
//   {
//   path: 'dashboard/communication/:uuid',
//   component: CommunicationComponent
// },
{
  path: 'dashboard/optimaxai:uuid',
  component: OptimaxaiComponent
},
{
  path: 'dashboard/analytics/:uuid',
  component: AnalyticsComponent
}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
