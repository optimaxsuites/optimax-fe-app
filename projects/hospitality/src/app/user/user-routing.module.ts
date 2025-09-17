import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotelCheckoutComponent } from '../ui/view/hotel-checkout/hotel-checkout.component';
import { RoomServiceComponent } from '../ui/view/room-service/room-service.component';
import { RoomSidebarComponent } from '../ui/view/room-sidebar/room-sidebar.component';
import { RoomWelcomeNoteComponent } from '../ui/view/room-welcome-note/room-welcome-note.component';
import { HouseKeepingComponent } from '../ui/view/house-keeping/house-keeping.component';
import { BarServiceComponent } from '../ui/view/bar-service/bar-service.component';
import { LaundryServiceComponent } from '../ui/view/laundry-service/laundry-service.component';
import { HotelRoomsComponent } from '../ui/view/hotel-rooms/hotel-rooms.component';
import { HotelAdmintableComponent } from '../ui/view/hotel-admintable/hotel-admintable.component';
import { HomeComponent } from '../ui/bookings/home/home.component';
import { AllroomsComponent } from '../ui/bookings/allrooms/allrooms.component';
import { BookingformComponent } from '../ui/bookings/bookingform/bookingform.component';
import { MultipleBookingsComponent } from '../ui/bookings/multiple-bookings/multiple-bookings.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'checkout/34567whr4567yhsdzr56',
    pathMatch: 'full',
  },
  {
    path: 'checkout/:uuid',
    component: HotelCheckoutComponent,
  },

  {
    path: 'bookings/:uuid',
    component: HomeComponent,
  },

  { path: 'user/rooms/:uuid', component: AllroomsComponent },
  { path: 'user/booking-form/:uuid', component: BookingformComponent },
  { path: 'user/multiple-rooms/:uuid', component: MultipleBookingsComponent },

  {
    path: 'services/:uuid',
    component: RoomSidebarComponent,

    children: [
      { path: '', component: RoomWelcomeNoteComponent },
      // { path: 'pastry', component: PastryServiceComponent },
      { path: 'laundry', component: LaundryServiceComponent },
      { path: 'room sevice', component: RoomServiceComponent },
      { path: 'Housekeeping Record', component: HouseKeepingComponent },
      { path: 'bar', component: BarServiceComponent },
      // { path: 'admin', component: HotelAdmintableComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}
