import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin/procurement/yy',
    pathMatch: 'full',
  },
  // {path: 'admin/procurement/rfq/:uuid', component: RfqListComponent},
  // {path: 'admin/procurement/rfq-form/:uuid', component:RfqFormComponent },
  // {path: 'admin/procurement/settings/:uuid', component:ProcurementSettingsComponent },
  {path: 'admin/procurement/:uuid', component: ProcurementPageComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
