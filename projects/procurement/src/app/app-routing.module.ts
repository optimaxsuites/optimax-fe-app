import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { RfqListComponent } from './ui/view/rfq-list/rfq-list.component';
import { RfqFormComponent } from './ui/view/rfq-form/rfq-form.component';
import { ProcurementSettingsComponent } from './ui/view/procurement-settings/procurement-settings.component';

const routes: Routes = [
      
      {path: 'admin/procurement/rfq/:uuid', component: RfqListComponent},
      {path: 'admin/procurement/rfq-form/:uuid', component:RfqFormComponent },
      {path: 'admin/procurement/settings/:uuid', component:ProcurementSettingsComponent },
      {path: 'admin/procurement', component: ProcurementPageComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
