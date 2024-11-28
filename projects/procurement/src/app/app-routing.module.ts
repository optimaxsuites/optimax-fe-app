import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { VendorPageComponent } from './ui/view/vendor/vendor-page.component';

const routes: Routes = [
  // {
  //   path: '',
  //   redirectTo: 'admin/procurement',
  //   pathMatch: 'full',
  // },
  // {path: 'admin/procurement/rfq/:uuid', component: RfqListComponent},
  // {path: 'admin/procurement/rfq-form/:uuid', component:RfqFormComponent },
  // {path: 'admin/procurement/settings/:uuid', component:ProcurementSettingsComponent },
  {path: 'admin/procurement', component: ProcurementPageComponent},

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
