import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotelCheckoutComponent } from '../ui/view/hotel-checkout/hotel-checkout.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'user/hospitality/checkout/34567whr4567yhsdzr56',
    pathMatch: 'full',
  },
  {
    path: 'user/hospitality/checkout/:uuid',
    component: HotelCheckoutComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}
