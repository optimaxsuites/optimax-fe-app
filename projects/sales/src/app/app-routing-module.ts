import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementRequestDetailComponent } from './ui/view/procurement-request-management/procurement-request-detail/procurement-request-detail.component';
import { ProcurementRequestFormComponent } from './ui/view/procurement-request-management/procurement-request-form/procurement-request-form.component';
import { ProcurementRequestListComponent } from './ui/view/procurement-request-management/procurement-request-list/procurement-request-list.component';
import { ProcurementRequestManagementComponent } from './ui/view/procurement-request-management/procurement-request-management.component';

const routes: Routes = [
  {
    path: "",
    redirectTo: 'procurement-management/requests/:uuid',
    pathMatch: 'full'
  },
  {
    path: 'procurement-management/requests/:uuid',
    component: ProcurementRequestManagementComponent
  },
  {
    path: 'procurement-management/requests/new/:uuid',
    component: ProcurementRequestFormComponent  
  },
  {
    path: 'procurement-management/requests/:id/:uuid',
    component: ProcurementRequestDetailComponent  
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
