import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { ErrorPageComponent } from './shared/error-page/error-page.component';
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
import { ServiceCheckoutComponent } from './ui/view/room-management/service-checkout/service-checkout.component';
import { HousekeepingFormComponent } from './ui/view/housekeeping-form/housekeeping-form.component';
import { HousekeepingFoundComponent } from './ui/view/housekeeping-found/housekeeping-found.component';
import { HousekeepingLostformComponent } from './ui/view/housekeeping-lostform/housekeeping-lostform.component';
import { HousekeepingLostitemComponent } from './ui/view/housekeeping-lostitem/housekeeping-lostitem.component';

const routes: Routes = [
  { path: '', redirectTo: 'user/landing', pathMatch: 'full' },
  { path: 'user', loadChildren: () => import('./user/user.module').then(m => m.UserModule) },
  { path: 'career', loadChildren: () => import('./user/user.module').then(m => m.UserModule) },
  { path: 'error', component: ErrorPageComponent },
  { path: '404', component: ErrorPageComponent },
  { path: '401', component: ErrorPageComponent },
  { path: '403', component: ErrorPageComponent },
  { path: '500', component: ErrorPageComponent },
  {
    path: 'hospitality',
    component: HospitalityShellComponent,
    children: [
      { path: '', redirectTo: 'bookings/default', pathMatch: 'full' },

      // List pages
      { path: 'room-types/:uuid',       component: RoomTypesListComponent },
      { path: 'rooms/:uuid',            component: RoomsListComponent },
      { path: 'services/:uuid',         component: ServicesListComponent },
      { path: 'service-charges',  component: ServiceChargesListComponent },
      { path: 'payments/:uuid',         component: PaymentsListComponent },

      // Housekeeping
      { path: 'housekeeping/:uuid',     component: HousekeepingComponent },
      { path: 'housekeeping/found',     component: HousekeepingFoundComponent },
      { path: 'housekeeping/found/add', component: HousekeepingFormComponent },
      { path: 'housekeeping/lost-items', component: HousekeepingLostitemComponent },
      { path: 'housekeeping/lost-form', component: HousekeepingLostformComponent },

      // Bookings sub-routes
      { path: 'bookings/create/:uuid',       component: BookingCreateComponent },
      { path: 'bookings/room-select/:uuid',  component: BookingRoomFirstComponent },
      { path: 'bookings/sell-service/:uuid', component: ServiceCheckoutComponent },
      { path: 'bookings/:id/:uuid',          component: BookingDetailComponent },
      { path: 'bookings/:uuid',              component: BookingsListComponent },

      { path: 'settings',         component: SettingsComponent },

      // Guests
      { path: 'guests/:uuid/:id',  component: GuestProfileComponent },
      { path: 'guests/:uuid',      component: GuestsListComponent },

      // Admin Table (Room view)
      { path: 'room-view/:uuid', component: HotelAdmintableComponent },
    ]
  },
  { path: '**', component: ErrorPageComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

