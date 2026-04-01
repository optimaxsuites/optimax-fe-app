import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRoutingModule } from './user-routing.module';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Third Party Modules
import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { SidebarModule } from 'primeng/sidebar';
import { TabViewModule } from 'primeng/tabview';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

// Components
import { RoomDetailsComponent } from '../ui/bookings/room-details/room-details.component';
import { EBookingCheckoutComponent } from '../ui/bookings/e-booking-checkout/e-booking-checkout.component';
import { BookingformComponent } from '../ui/bookings/bookingform/bookingform.component';
import { HomeComponent } from '../ui/bookings/home/home.component';
import { NavbarComponent } from '../ui/bookings/navbar/navbar.component';
import { ThemeComponent } from '../ui/bookings/theme/theme.component';
import { HeropageComponent } from '../ui/bookings/heropage/heropage.component';
import { AboutpageComponent } from '../ui/bookings/aboutpage/aboutpage.component';
import { RoomsCarouselComponent } from '../ui/bookings/rooms-carousel/rooms-carousel.component';
import { AllroomsComponent } from '../ui/bookings/allrooms/allrooms.component';
import { RoomsheroComponent } from '../ui/bookings/roomshero/roomshero.component';
import { RoomdesignComponent } from '../ui/bookings/roomdesign/roomdesign.component';
import { RoomfooterComponent } from '../ui/bookings/roomfooter/roomfooter.component';
import { MultipleBookingsComponent } from '../ui/bookings/multiple-bookings/multiple-bookings.component';
import { EBookingLoginComponent } from '../ui/bookings/auth/login/login.component';
import { EBookingRegisterComponent } from '../ui/bookings/auth/register/register.component';
import { AppResizeDirective } from '../ui/service/app-resize.directive';

// Standalone Components (imported here if used in templates of components above)
import { NavTabComponent } from '../ui/sharedComponent/view/nav-tab/nav-tab.component';
import { ButtonComponent } from '../ui/sharedComponent/view/button/button.component';
import { ModalComponent } from '../ui/sharedComponent/view/modal/modal.component';

@NgModule({
  declarations: [
    AppResizeDirective,
    RoomDetailsComponent,
    EBookingCheckoutComponent,
    BookingformComponent,
    HomeComponent,
    NavbarComponent,
    ThemeComponent,
    HeropageComponent,
    AboutpageComponent,
    RoomsCarouselComponent,
    AllroomsComponent,
    RoomsheroComponent,
    RoomdesignComponent,
    RoomfooterComponent,
    MultipleBookingsComponent,
    EBookingLoginComponent,
    EBookingRegisterComponent
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgSelectModule,
    TableModule,
    DialogModule,
    ToastModule,
    SidebarModule,
    TabViewModule,
    ConfirmDialogModule,
    MessagesModule,
    MessageModule,
    PasswordModule,
    ButtonModule,
    DividerModule,
    // Standalone
    NavTabComponent,
    ButtonComponent,
    ModalComponent
  ],
  exports: [],
  providers: [],
})
export class UserModule {}
