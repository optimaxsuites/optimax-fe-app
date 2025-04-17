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
import { MessageService } from 'primeng/api';
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
  ],
  imports: [
    // BrowserAnimationsModule,
    // BrowserModule,
    CommonModule,
    // UserModule,
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
  ],
  providers: [MessageService],

  bootstrap: [AppComponent],
})
export class AppModule {}
