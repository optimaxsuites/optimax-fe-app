import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HotelAdmintableComponent } from './ui/view/hotel-admintable/hotel-admintable.component';

const routes: Routes = [
  { path: 'admin/hospitality/room/:uuid', component: HotelAdmintableComponent  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
