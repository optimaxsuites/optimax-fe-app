import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { RoomTypesListComponent } from './room-types/room-types-list.component';
import { RoomsListComponent } from './rooms/rooms-list.component';
import { ServicesListComponent } from './services/services-list.component';
import { ServiceChargesListComponent } from './service-charges/service-charges-list.component';
import { HospitalityShellComponent } from './hospitality-shell/hospitality-shell.component';

// Booking & Guest
import { GuestsListComponent } from './guests/guests-list.component';
import { GuestProfileComponent } from './guest-profile/guest-profile.component';
import { BookingsListComponent } from './bookings/bookings-list.component';
import { BookingCreateComponent } from './booking-create/booking-create.component';
import { BookingDetailComponent } from './booking-detail/booking-detail.component';
import { BookingRoomFirstComponent } from './booking-room-first/booking-room-first.component';

import { PaymentsListComponent } from './payments/payments-list.component';
import { HousekeepingComponent } from './housekeeping/housekeeping.component';

const routes: Routes = [
  {
    path: '',
    component: HospitalityShellComponent,
    children: [
      { path: 'room-types', component: RoomTypesListComponent },
      { path: 'rooms', component: RoomsListComponent },
      { path: 'services', component: ServicesListComponent },
      { path: 'service-charges', component: ServiceChargesListComponent },
      { path: 'guests', component: GuestsListComponent },
      { path: 'guests/:id', component: GuestProfileComponent },
      { path: 'bookings', component: BookingsListComponent },
      { path: 'bookings/create', component: BookingCreateComponent },
      { path: 'bookings/room-select', component: BookingRoomFirstComponent },
      { path: 'bookings/:id', component: BookingDetailComponent },
      { path: 'payments', component: PaymentsListComponent },
      { path: 'housekeeping', component: HousekeepingComponent },
      { path: '', redirectTo: 'room-types', pathMatch: 'full' },
    ],
  },
];

@NgModule({
  declarations: [
    RoomTypesListComponent,
    RoomsListComponent,
    ServicesListComponent,
    ServiceChargesListComponent,
    GuestsListComponent,
    GuestProfileComponent,
    BookingsListComponent,
    BookingCreateComponent,
    BookingDetailComponent,
    BookingRoomFirstComponent,
    PaymentsListComponent,
    HousekeepingComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    HospitalityShellComponent,
  ],
})
export class RoomManagementModule {}
