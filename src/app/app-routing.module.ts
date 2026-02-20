import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { VendorPageComponent } from './ui/view/vendor/vendor-page.component';
import { VendorRfqListComponent } from './ui/view/vendor/vendor-rfq-list/vendor-rfq-list.component';
import { RfqFormComponent } from './ui/view/rfq-form/rfq-form.component';
import { PrApprovalInboxComponent } from './ui/view/purchase-req-management/pr-approval-inbox/pr-approval-inbox.component';
import { VendorListComponent } from './ui/view/vendor-management/vendor-list/vendor-list.component';
import { VendorApprovalComponent } from './ui/view/vendor-management/vendor-approval/vendor-approval.component';
import { VendorDetailsComponent } from './ui/view/vendor-management/vendor-details/vendor-details.component';
import { VendorRegistrationComponent } from './ui/view/vendor-management/vendor-registration/vendor-registration.component';
import { DashboardComponent } from './ui/view/vendor-portal/dashboard/dashboard.component';
import { RfqComponent } from './ui/view/vendor-portal/rfq/rfq.component';

const routes: Routes = [
  { path: 'admin/procurement', component: ProcurementPageComponent },
  { path: 'admin/vendor', component: VendorPageComponent },
  
  {path: 'vendor-portal/dashboard', component: DashboardComponent},
  {path: 'vendor-portal/rfq', component: RfqComponent},

  { path: 'vendor-register', component: VendorRegistrationComponent },


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
