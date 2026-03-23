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

const routes: Routes = [
  { path: '', redirectTo: 'hospitality/rooms', pathMatch: 'full' },
  
  // Main hospitality routes
  {
    path: 'hospitality',
    component: HospitalityShellComponent,
    children: [
      { path: '', redirectTo: 'rooms', pathMatch: 'full' },
      

      { path: 'bookings', component: BookingsListComponent },
      { path: 'rooms', component: RoomsListComponent },
      { path: 'room-types', component: RoomTypesListComponent },
      { path: 'services', component: ServicesListComponent },
      { path: 'payments', component: PaymentsListComponent },
      { path: 'housekeeping', component: HousekeepingComponent },
      { path: 'guests', component: GuestsListComponent },
      { path: 'room-view', component: HotelAdmintableComponent },
      { path: 'settings', component: SettingsComponent },

      { path: 'bookings/create/:uuid', component: BookingCreateComponent },
      { path: 'bookings/room-select/:uuid', component: BookingRoomFirstComponent },
      { path: 'bookings/:id/:uuid', component: BookingDetailComponent },
      { path: 'bookings/:uuid', component: BookingsListComponent },
      { path: 'rooms/:uuid', component: RoomsListComponent },
      { path: 'room-types/:uuid', component: RoomTypesListComponent },
      { path: 'services/:uuid', component: ServicesListComponent },
      { path: 'payments/:uuid', component: PaymentsListComponent },
      { path: 'housekeeping/:uuid', component: HousekeepingComponent },
      { path: 'guests/:uuid/:id', component: GuestProfileComponent },
      { path: 'guests/:uuid', component: GuestsListComponent },
      { path: 'room-view/:uuid', component: HotelAdmintableComponent },
      { path: 'settings/:uuid', component: SettingsComponent },
    ]
  },

  { path: 'room-types/:uuid',       component: RoomTypesListComponent },
  { path: 'rooms/:uuid',            component: RoomsListComponent },
  { path: 'services/:uuid',         component: ServicesListComponent },
  { path: 'service-charges',  component: ServiceChargesListComponent },
  { path: 'payments/:uuid',         component: PaymentsListComponent },
  { path: 'housekeeping/:uuid',     component: HousekeepingComponent },
  { path: 'settings',         component: SettingsComponent },
  { path: 'guests/:uuid/:id',  component: GuestProfileComponent },
  { path: 'guests/:uuid',      component: GuestsListComponent },
  { path: 'room-view/:uuid', component: HotelAdmintableComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

