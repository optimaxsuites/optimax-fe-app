import { BackButtonComponent } from './ui/sharedComponent/view/back-button/back-button.component';
import { TableModule } from 'primeng/table';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HotelBillsComponent } from './ui/view/hotel-bills/hotel-bills.component';
import { HotelChangeroomComponent } from './ui/view/hotel-changeroom/hotel-changeroom.component';
import { HotelCheckoutComponent } from './ui/view/hotel-checkout/hotel-checkout.component';
import { HotelFormComponent } from './ui/view/hotel-form/hotel-form.component';
import { HotelMessageComponent } from './ui/view/hotel-message/hotel-message.component';
import { HotelRoomdetailsComponent } from './ui/view/hotel-roomdetails/hotel-roomdetails.component';
import { HotelRoomlistComponent } from './ui/view/hotel-roomlist/hotel-roomlist.component';
import { ToastModule } from 'primeng/toast';

import { CalendarModule } from 'primeng/calendar';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserModule } from './user/user.module';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressBarModule } from 'primeng/progressbar';
import { NgSelectModule } from '@ng-select/ng-select';
import { HotelLogsComponent } from './ui/view/hotel-logs/hotel-logs.component';
import { DialogModule } from 'primeng/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HotelCheckinformComponent } from './ui/view/hotel-checkinform/hotel-checkinform.component';
import { HotelMaintenancenoteComponent } from './ui/view/hotel-maintenancenote/hotel-maintenancenote.component';
import { HotelExtendstayComponent } from './ui/view/hotel-extendstay/hotel-extendstay.component';
import { RoomServiceComponent } from './ui/view/room-service/room-service.component';
import { RoomSidebarComponent } from './ui/view/room-sidebar/room-sidebar.component';
import { RoomWelcomeNoteComponent } from './ui/view/room-welcome-note/room-welcome-note.component';
import { HouseKeepingComponent } from './ui/view/house-keeping/house-keeping.component';
import { HousekeepingRecordsComponent } from './ui/view/housekeeping-records/housekeeping-records.component';
import { NavTabComponent } from './ui/sharedComponent/view/nav-tab/nav-tab.component';
import { HousekeepingFoundComponent } from './ui/view/housekeeping-found/housekeeping-found.component';
import { HousekeepingFormComponent } from './ui/view/housekeeping-form/housekeeping-form.component';
import { HousekeepingLostitemComponent } from './ui/view/housekeeping-lostitem/housekeeping-lostitem.component';
import { DropdownModule } from 'primeng/dropdown';
import { MenuModule } from 'primeng/menu';
import { HousekeepingLostformComponent } from './ui/view/housekeeping-lostform/housekeeping-lostform.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { BarServiceComponent } from './ui/view/bar-service/bar-service.component';
import { LaundryServiceComponent } from './ui/view/laundry-service/laundry-service.component';
import { HotelRoomsComponent } from './ui/view/hotel-rooms/hotel-rooms.component';
import { CheckboxModule } from 'primeng/checkbox';
import { HotelReceptionistComponent } from './ui/view/hotel-receptionist/hotel-receptionist.component';
import { DialogService } from 'primeng/dynamicdialog';
import { HotelAdmintableComponent } from './ui/view/hotel-admintable/hotel-admintable.component';

import { FileUploadModule } from 'primeng/fileupload';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './ui/sharedComponent/service/auth-service/auth.interceptor.service';
import { JwtHelperService, JWT_OPTIONS, JwtModule } from '@auth0/angular-jwt';
import { BookingCreateComponent } from './ui/view/room-management/booking-create/booking-create.component';
import { BookingDetailComponent } from './ui/view/room-management/booking-detail/booking-detail.component';
import { BookingRoomFirstComponent } from './ui/view/room-management/booking-room-first/booking-room-first.component';
import { BookingsListComponent } from './ui/view/room-management/bookings/bookings-list.component';
import { GuestProfileComponent } from './ui/view/room-management/guest-profile/guest-profile.component';
import { GuestsListComponent } from './ui/view/room-management/guests/guests-list.component';
import { HousekeepingComponent } from './ui/view/room-management/housekeeping/housekeeping.component';
import { PaymentsListComponent } from './ui/view/room-management/payments/payments-list.component';
import { RoomTypesListComponent } from './ui/view/room-management/room-types/room-types-list.component';
import { RoomsListComponent } from './ui/view/room-management/rooms/rooms-list.component';
import { ServiceChargesListComponent } from './ui/view/room-management/service-charges/service-charges-list.component';
import { ServicesListComponent } from './ui/view/room-management/services/services-list.component';
@NgModule({
  declarations: [
    AppComponent,
    HotelBillsComponent,
    HotelChangeroomComponent,
    HotelCheckoutComponent,
    HotelFormComponent,
    HotelMessageComponent,
    HotelRoomdetailsComponent,
    HotelRoomlistComponent,
    HotelLogsComponent,
    BackButtonComponent,
    HotelCheckinformComponent,
    HotelMaintenancenoteComponent,
    HotelExtendstayComponent,
    RoomServiceComponent,
    RoomSidebarComponent,
    RoomWelcomeNoteComponent,
    HouseKeepingComponent,
    HousekeepingRecordsComponent,
    HousekeepingFoundComponent,
    HousekeepingFormComponent,
    HousekeepingLostitemComponent,
    HousekeepingLostformComponent,
    BarServiceComponent,
    LaundryServiceComponent,
    HotelRoomsComponent,
    HotelReceptionistComponent,
    HotelAdmintableComponent,

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
    BrowserAnimationsModule,
    BrowserModule,
    MenuModule,
    ConfirmDialogModule,
    DropdownModule,
    CommonModule,
    UserModule,
    AppRoutingModule,
    CalendarModule,
    ToastModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    ProgressBarModule,
    TableModule,
    DialogModule,
    InputNumberModule,
    NavTabComponent,
    CheckboxModule,
    FileUploadModule,
    ProgressSpinnerModule,
    HttpClientModule,
    JwtModule.forRoot({
      jwtOptionsProvider: {
        provide: JWT_OPTIONS,
        useValue: {
          tokenGetter: () => {
            // First check localStorage, then sessionStorage
            const token =
              localStorage.getItem('Token2') ||
              localStorage.getItem('accessToken2') ||
              sessionStorage.getItem('Token') ||
              sessionStorage.getItem('accessToken') ||
              localStorage.getItem('token') ||
              sessionStorage.getItem('token');

            if (!token) return null;

            // If token is in format "key=value;", extract the value
            if (token.includes('=')) {
              const tokenStartIndex = token.indexOf('=') + 1;
              const tokenEndIndex = token.indexOf(';');
              return tokenEndIndex > tokenStartIndex
                ? token.substring(tokenStartIndex, tokenEndIndex)
                : token.substring(tokenStartIndex);
            }

            return token;
          },
          allowedDomains: ['be.optimaxsuites.com'], // Add your domain here
          disallowedRoutes: [],
        },
      },
    }),
  ],
  providers: [
    MessageService,
    ConfirmationService,
    DialogService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
