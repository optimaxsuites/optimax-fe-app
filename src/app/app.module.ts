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
  ],
  providers: [MessageService, ConfirmationService],

  bootstrap: [AppComponent],
})
export class AppModule {}
