import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { VendorPageComponent } from './ui/view/vendor/vendor-page.component';
import { VendorRegistrationComponent } from './ui/view/vendor-management/vendor-registration/vendor-registration.component';
import { DashboardComponent } from './ui/view/vendor-portal/dashboard/dashboard.component';
import { RfqComponent } from './ui/view/vendor-portal/rfq/rfq.component';
import { VendorDetailsComponent } from './ui/view/vendor-management/vendor-details/vendor-details.component';

const routes: Routes = [
  { path: 'pr-management/:uuid', component: ProcurementPageComponent },
  { path: 'vendor-management/:uuid', component: VendorPageComponent },

  { path: 'vendor-portal/dashboard/:uuid', component: DashboardComponent },
  { path: 'vendor-portal/rfqs/:uuid', component: RfqComponent },
  {path: 'vendor-portal/quotations/:uuid', component: RfqComponent}, //change component
  {path: 'vendor-portal/lpo/:uuid', component: RfqComponent}, //change component
  { path: 'vendor-portal/vendor-register/:token/:uuid', component: VendorRegistrationComponent },
  {
    path: 'vendor-management/:id/review',
    component: VendorDetailsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
