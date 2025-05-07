import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotelCheckoutComponent } from './ui/view/hotel-checkout/hotel-checkout.component';
import { HotelRoomsComponent } from './ui/view/hotel-rooms/hotel-rooms.component';

const routes: Routes = [
  { path: 'admin/hospitality/room/:uuid', component: HotelRoomsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
