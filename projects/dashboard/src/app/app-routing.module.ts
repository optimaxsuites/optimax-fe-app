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
import { MeetingsAppointmentsComponent } from './meetings-appointments/meetings-appointments.component';
import { DashUserProfileComponent } from './user-profile/user-profile.component';

// damilola worked on this: communications and tasks now have separate dashboard routes.
const routes: Routes = [
  {
    path:'',
    redirectTo: 'communications/uu',
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
    path: 'communications/:uuid',
    component: CommunicationComponent
  },
  {
    path: 'meetings-appointments/:uuid',
    component: MeetingsAppointmentsComponent
  },
  {
    path: 'tasks-routines/:uuid',
    component: FeedComponent
  },
  {
    path: 'user-profile/:uuid',
    component: DashUserProfileComponent
  },
  {
    path: ':uuid',
    redirectTo: 'communications/:uuid',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
