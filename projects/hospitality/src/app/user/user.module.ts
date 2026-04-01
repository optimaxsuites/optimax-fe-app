import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRoutingModule } from './user-routing.module';
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
import { BookingsShellComponent } from '../ui/bookings/bookings-shell/bookings-shell.component';

import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { EditorModule } from 'primeng/editor';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { PanelModule } from 'primeng/panel';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { SidebarModule } from 'primeng/sidebar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { StepperModule } from 'primeng/stepper';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonComponent } from '../ui/sharedComponent/view/button/button.component';
import { LargeSideModalComponent } from '../ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { ModalComponent } from '../ui/sharedComponent/view/modal/modal.component';
import { NavTabComponent } from '../ui/sharedComponent/view/nav-tab/nav-tab.component';
import { SideModalComponent } from '../ui/sharedComponent/view/side-modal/side-modal.component';
import { BadgeModule } from 'primeng/badge';
import { MenubarModule } from 'primeng/menubar';
import { AppResizeDirective } from '../ui/service/app-resize.directive';
// import { ProductVariantModalComponent } from '../ui/view/product-variant-modal/product-variant-modal.component';

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
    // BookingsShellComponent (moved to imports)
    // ProductVariantModalComponent,
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    TableModule,
    RippleModule,
    DialogModule,
    ToastModule,
    FormsModule,
    ReactiveFormsModule,
    SidebarModule,
    TabViewModule,
    ToolbarModule,
    ConfirmDialogModule,
    SplitButtonModule,
    PanelModule,
    DividerModule,
    OverlayPanelModule,
    StepperModule,
    InputTextModule,
    FloatLabelModule,
    EditorModule,
    MessagesModule,
    MessageModule,
    RippleModule,
    TableModule,
    PasswordModule,
    ButtonModule,
    NgSelectModule,
    LargeSideModalComponent,
    ButtonComponent,
    ModalComponent,
    SideModalComponent,
    NavTabComponent,
    HttpClientModule,
    BadgeModule,
    MenubarModule,
    BookingsShellComponent,
  ],
  exports: [],
  providers: [],
})
export class UserModule {}
