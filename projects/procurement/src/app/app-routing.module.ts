import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { VendorPageComponent } from './ui/view/vendor/vendor-page.component';
import { VendorRegistrationComponent } from './ui/view/vendor-management/vendor-registration/vendor-registration.component';
import { DashboardComponent } from './ui/view/vendor-portal/dashboard/dashboard.component';
import { RfqComponent } from './ui/view/vendor-portal/rfq/rfq.component';
import { VendorDetailsComponent } from './ui/view/vendor-management/vendor-details/vendor-details.component';
import { VendorProfileFormComponent } from './ui/view/vendor-management/vendor-profile-form/vendor-profile-form.component';
import { VendorPrListComponent } from './ui/view/vendor-portal/vendor-pr-list/vendor-pr-list.component';
import { VendorQuoteFormComponent } from './ui/view/vendor-portal/vendor-quote-form/vendor-quote-form.component';
import { VendorQuoteListComponent } from './ui/view/vendor-portal/vendor-quote-list/vendor-quote-list.component';

const routes: Routes = [
  { path: 'pr-management/:uuid', component: ProcurementPageComponent },
  { path: 'vendor-management/:uuid', component: VendorPageComponent },

  { path: 'vendor-portal/dashboard/:uuid', component: DashboardComponent },
  { path: 'vendor-portal/vendor-pr-list/:uuid', component: VendorPrListComponent },
  { path: 'vendor-portal/vendor-quote-list/:uuid', component: VendorQuoteListComponent },
  
  { path: 'vendor-portal/vendor-register/:token/:uuid', component: VendorRegistrationComponent },

  { path: 'admin/procurement/vendor-portal/quote-form/:vId/create/:prId/:uuid', component: VendorQuoteFormComponent },

  {
    path: 'vendor-profile-creation', component: VendorProfileFormComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
