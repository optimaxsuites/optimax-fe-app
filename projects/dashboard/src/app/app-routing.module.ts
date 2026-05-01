import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';
import { EmployeePayslipsListComponent } from './ui/view/employee-payslips-list/employee-payslips-list.component';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { GeneraldashboardComponent } from './generaldashboard/generaldashboard.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
import { OptimaxaiComponent } from './optimax-ai/optimax-ai.component';
import { CommunicationComponent } from './communication/communication.component';
import { FeedComponent } from './feed/feed.component';
import { AnalyticsComponent } from './analytics/analytics.component';

// damilola worked on this: collaboration now lands on the enterprise feed route by default.
const routes: Routes = [
  {
    path:'',
    redirectTo: 'feed/uu',
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
    path: 'optimaxai/:uuid',
    component: OptimaxaiComponent
  },
  {
    path: 'analytics/:uuid',
    component: AnalyticsComponent
  },
  {
    path: 'feed/:uuid',
    component: FeedComponent
  },
  {
    path: ':uuid',
    redirectTo: 'feed/:uuid',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
