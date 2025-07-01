import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotelCheckoutComponent } from './ui/view/hotel-checkout/hotel-checkout.component';
import { HotelRoomsComponent } from './ui/view/hotel-rooms/hotel-rooms.component';
import { HotelAdmintableComponent } from './ui/view/hotel-admintable/hotel-admintable.component';

const routes: Routes = [
  { path: 'room/:uuid', component: HotelAdmintableComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
