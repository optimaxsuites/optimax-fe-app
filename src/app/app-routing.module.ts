import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { VendorPageComponent } from './ui/view/vendor/vendor-page.component';
import { VendorRfqListComponent } from './ui/view/vendor/vendor-rfq-list/vendor-rfq-list.component';
import { RfqFormComponent } from './ui/view/rfq/rfq-form/rfq-form.component';
import { PrApprovalInboxComponent } from './ui/view/purchase-req-management/pr-approval-inbox/pr-approval-inbox.component';
import { VendorListComponent } from './ui/view/vendor-management/vendor-list/vendor-list.component';
import { VendorApprovalComponent } from './ui/view/vendor-management/vendor-approval/vendor-approval.component';
import { VendorDetailsComponent } from './ui/view/vendor-management/vendor-details/vendor-details.component';
import { VendorRegistrationComponent } from './ui/view/vendor-management/vendor-registration/vendor-registration.component';

const routes: Routes = [
  // in app-routing.module.ts
  {
    path: 'vendor',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      { path: 'list', component: VendorListComponent },
      { path: 'approval', component: VendorApprovalComponent },
      { path: ':id', component: VendorDetailsComponent },
    ],
  },
  { path: 'vendor-register/:token', component: VendorRegistrationComponent },

  {
    path: '',
    redirectTo: 'admin/procurement/i',
    pathMatch: 'full',
  },
  { path: 'admin/procurement/rfq/:uuid', component: VendorRfqListComponent },
  { path: 'admin/procurement/rfq-form/:uuid', component: RfqFormComponent },
  // {path: 'admin/procurement/settings/:uuid', component: ProcurementSettingsComponent },
  { path: 'admin/procurement/:uuid', component: ProcurementPageComponent },
  {
    path: 'admin/procurement/approvals/:uuid',
    component: PrApprovalInboxComponent,
  },

  {
    path: '',
    redirectTo: 'admin/vendor/i',
    pathMatch: 'full',
  },
  { path: 'admin/vendor/:uuid', component: VendorPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
