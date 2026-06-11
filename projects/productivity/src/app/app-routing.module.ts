import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductivityComponent } from './ui/view/productivity/productivity.component';
import { ProductivityAnalyticsPageComponent } from './ui/view/productivity/pages/productivity-analytics-page/productivity-analytics-page.component';
import { ProductivityAssessmentPageComponent } from './ui/view/productivity/pages/productivity-assessment-page/productivity-assessment-page.component';
import { ProductivityOverviewPageComponent } from './ui/view/productivity/pages/productivity-overview-page/productivity-overview-page.component';
import { ProductivityReviewsPageComponent } from './ui/view/productivity/pages/productivity-reviews-page/productivity-reviews-page.component';
import { ProductivitySupervisorPageComponent } from './ui/view/productivity/pages/productivity-supervisor-page/productivity-supervisor-page.component';
import { ProductivityTasksPageComponent } from './ui/view/productivity/pages/productivity-tasks-page/productivity-tasks-page.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin/productivity/34567whr4567yhsdzr56/overview',
    pathMatch: 'full',
  },
  {
    path: 'admin/productivity/:uuid',
    component: ProductivityComponent,
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        component: ProductivityOverviewPageComponent,
      },
      {
        path: 'tasks',
        component: ProductivityTasksPageComponent,
      },
      {
        path: 'reviews',
        component: ProductivityReviewsPageComponent,
      },
      {
        path: 'analytics',
        component: ProductivityAnalyticsPageComponent,
      },
      {
        path: 'assessment',
        component: ProductivityAssessmentPageComponent,
      },
      {
        path: 'supervisor',
        component: ProductivitySupervisorPageComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
