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
import { RoomDetailsComponent } from '../ui/bookings/room-details/room-details.component';
import { EBookingCheckoutComponent } from '../ui/bookings/e-booking-checkout/e-booking-checkout.component';

import { BookingsShellComponent } from '../ui/bookings/bookings-shell/bookings-shell.component';
import { BookingCreateComponent } from '../ui/view/room-management/booking-create/booking-create.component';
import { BookingDetailComponent } from '../ui/view/room-management/booking-detail/booking-detail.component';
import { BookingRoomFirstComponent } from '../ui/view/room-management/booking-room-first/booking-room-first.component';
import { BookingsListComponent } from '../ui/view/room-management/bookings/bookings-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'e-bookings/rooms/default',
    pathMatch: 'full',
  },
  {
    path: 'checkout/:uuid',
    component: HotelCheckoutComponent,
  },

      { path: 'e-bookings/home/:uuid', component: HomeComponent },
      { path: 'e-bookings/rooms/:uuid', component: AllroomsComponent },
      { path: 'e-bookings/rooms/details/:id/:uuid', component: RoomDetailsComponent },
      { path: 'e-bookings/booking-form/:id/:uuid', component: BookingformComponent },
      { path: 'e-bookings/multiple-rooms/:uuid', component: MultipleBookingsComponent },
      { path: 'e-bookings/checkout/:id/:uuid', component: EBookingCheckoutComponent },

  { path: 'bookings/create/:uuid',      component: BookingCreateComponent },
  { path: 'bookings/room-select/:uuid', component: BookingRoomFirstComponent },
  { path: 'bookings/:id/:uuid',         component: BookingDetailComponent },
  { path: 'bookings/:uuid',             component: BookingsListComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}
