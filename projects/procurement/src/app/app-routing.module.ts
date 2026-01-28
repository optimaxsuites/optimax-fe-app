import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { VendorPageComponent } from './ui/view/vendor/vendor-page.component';
import { VendorRfqListComponent } from './ui/view/vendor/vendor-rfq-list/vendor-rfq-list.component';
import { RfqFormComponent } from './ui/view/rfq/rfq-form/rfq-form.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin/procurement/i',
    pathMatch: 'full',
  },
  {path: 'admin/procurement/rfq/:uuid', component: VendorRfqListComponent},
  {path: 'admin/procurement/rfq-form/:uuid', component: RfqFormComponent },
  // {path: 'admin/procurement/settings/:uuid', component: ProcurementSettingsComponent },
  {path: 'admin/procurement/:uuid', component: ProcurementPageComponent},

  {
    path: '',
    redirectTo: 'admin/vendor/i',
    pathMatch: 'full',
  },
  {path: 'admin/vendor/:uuid',
    component: VendorPageComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
