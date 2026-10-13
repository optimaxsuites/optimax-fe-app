import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VendorPageComponent } from './ui/view/vendor-page.component';
import { VendorRfqComponent } from './ui/view/vendor-rfq/vendor-rfq.component';

const routes: Routes = [
  { path: ':uuid', component: VendorPageComponent },
  { path: 'rfq/:uuid', component: VendorRfqComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
