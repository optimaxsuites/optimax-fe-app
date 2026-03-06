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
import { ServicesListComponent } from './ui/view/room-management/services/services-list.component';
import { SettingsComponent } from './ui/view/room-management/settings/settings.component';

const routes: Routes = [
  { path: '', redirectTo: 'hospitality', pathMatch: 'full' },
  
  // Outer path for hospitality that carries the uuid
  {
    path: 'hospitality/:uuid',
    component: HospitalityShellComponent,
    children: [
      { path: '', redirectTo: 'bookings', pathMatch: 'full' },
      
      // List pages
      { path: 'room-types',       component: RoomTypesListComponent },
      { path: 'rooms',            component: RoomsListComponent },
      { path: 'services',         component: ServicesListComponent },
      { path: 'service-charges',  component: ServiceChargesListComponent },
      { path: 'payments',         component: PaymentsListComponent },
      { path: 'housekeeping',     component: HousekeepingComponent },
      { path: 'settings',         component: SettingsComponent },

      // Guests
      { path: 'guests/:id',  component: GuestProfileComponent },
      { path: 'guests',      component: GuestsListComponent },

      // Bookings
      { path: 'bookings/create',      component: BookingCreateComponent },
      { path: 'bookings/room-select', component: BookingRoomFirstComponent },
      { path: 'bookings/:id',         component: BookingDetailComponent },
      { path: 'bookings',             component: BookingsListComponent },
      
      // Admin Table (Room view)
      { path: 'room-view', component: HotelAdmintableComponent },
    ]
  },

  // Fallback for when uuid is not yet generated
  {
    path: 'hospitality',
    component: AppComponent, // We'll handle redirect in AppComponent or a guard
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

