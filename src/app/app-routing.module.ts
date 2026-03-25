import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { HotelAdmintableComponent } from './ui/view/hotel-admintable/hotel-admintable.component';
import { BookingCreateComponent } from './ui/view/room-management/booking-create/booking-create.component';
import { BookingDetailComponent } from './ui/view/room-management/booking-detail/booking-detail.component';
import { BookingRoomFirstComponent } from './ui/view/room-management/booking-room-first/booking-room-first.component';
import { BookingsListComponent } from './ui/view/room-management/bookings/bookings-list.component';
import { GuestProfileComponent } from './ui/view/room-management/guest-profile/guest-profile.component';
import { GuestsListComponent } from './ui/view/room-management/guests/guests-list.component';
import { HospitalityShellComponent } from './ui/view/room-management/hospitality-shell/hospitality-shell.component';
import { HousekeepingComponent } from './ui/view/room-management/housekeeping/housekeeping.component';
import { PaymentsListComponent } from './ui/view/room-management/payments/payments-list.component';
import { RoomTypesListComponent } from './ui/view/room-management/room-types/room-types-list.component';
import { RoomsListComponent } from './ui/view/room-management/rooms/rooms-list.component';
import { ServiceChargesListComponent } from './ui/view/room-management/service-charges/service-charges-list.component';
// import { ServicesListComponent } from './ui/view/room-management/services/services-list.component';
import { SettingsComponent } from './ui/view/room-management/settings/settings.component';
import { ServicesListComponent } from './ui/view/room-management/services/services-list.component';
import { BookingsShellComponent } from './ui/bookings/bookings-shell/bookings-shell.component';

const routes: Routes = [
  { path: '', redirectTo: 'hospitality/rooms/optimax', pathMatch: 'full' },
  
  // Main hospitality routes with UUID specificity at the end
  {
    path: 'hospitality',
    component: HospitalityShellComponent,
    children: [
      { path: '', redirectTo: 'rooms/optimax', pathMatch: 'full' },
      
      { path: 'bookings/:uuid', component: BookingsListComponent },
      { path: 'rooms/:uuid', component: RoomsListComponent },
      { path: 'room-types/:uuid', component: RoomTypesListComponent },
      { path: 'services/:uuid', component: ServicesListComponent },
      { path: 'payments/:uuid', component: PaymentsListComponent },
      { path: 'housekeeping/:uuid', component: HousekeepingComponent },
      { path: 'guests/:uuid', component: GuestsListComponent },
      { path: 'room-view/:uuid', component: HotelAdmintableComponent },
      { path: 'settings/:uuid', component: SettingsComponent },

      { path: 'bookings/create/:uuid', component: BookingCreateComponent },
      { path: 'bookings/room-select/:uuid', component: BookingRoomFirstComponent },
      { path: 'bookings/:id/:uuid', component: BookingDetailComponent },
      { path: 'guests/:uuid/:id', component: GuestProfileComponent },
      { path: 'service-charges/:uuid', component: ServiceChargesListComponent },
    ]
  },

  // Public-facing e-booking page (accessible via /e-booking/:uuid)
  { path: 'e-booking/:uuid', component: BookingsShellComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

