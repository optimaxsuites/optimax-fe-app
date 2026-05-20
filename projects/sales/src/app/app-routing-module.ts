import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementRequestDetailComponent } from './ui/view/procurement-request-management/procurement-request-detail/procurement-request-detail.component';
import { ProcurementRequestFormComponent } from './ui/view/procurement-request-management/procurement-request-form/procurement-request-form.component';
import { ProcurementRequestListComponent } from './ui/view/procurement-request-management/procurement-request-list/procurement-request-list.component';
import { ProcurementRequestManagementComponent } from './ui/view/procurement-request-management/procurement-request-management.component';

const routes: Routes = [
  {
    path: "",
    redirectTo: 'commerce/requests',
    pathMatch: 'full'
  },
  {
    path: 'commerce/requests',
    component: ProcurementRequestManagementComponent
  },
  {
    path: 'commerce/requests/new',
    component: ProcurementRequestFormComponent  
  },
  {
    path: 'commerce/requests/:id',
    component: ProcurementRequestDetailComponent  
  }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
