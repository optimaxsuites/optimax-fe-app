import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ButtonModule } from 'primeng/button';
import { EditorModule } from 'primeng/editor';
import { PasswordModule } from 'primeng/password';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { SidebarModule } from 'primeng/sidebar';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SplitButtonModule } from 'primeng/splitbutton';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { RippleModule } from 'primeng/ripple';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { TruncatePipe } from './truncate.pipe';

///mat

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LargeSideModalComponent } from './ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { PosPageComponent } from './ui/view/pos-page.component';
import { CartItemCardComponent } from './ui/view/cart-item-card/cart-item-card.component';
import { CashPaymentComponent } from './ui/view/cash-payment/cash-payment.component';
import { CheckoutHeaderComponent } from './ui/view/pos-checkout-page/components/checkout-header/checkout-header.component';
import { CloseRegisterComponent } from './ui/view/close-register/close-register.component';
import { CommisionComponent } from './ui/view/commision/commision.component';
import { ConfigurationComponent } from './ui/view/configuration/configuration.component';
import { InventoryComponent } from './ui/view/inventory/inventory.component';
import { ManageUserFormComponent } from './ui/view/manage-user-form/manage-user-form.component';
import { ManageUsersComponent } from './ui/view/manage-users/manage-users.component';
import { OpenRegisterComponent } from './ui/view/open-register/open-register.component';
import { OrderDetailComponent } from './ui/view/order-detail/order-detail.component';
import { OrderRefundComponent } from './ui/view/order-refund/order-refund.component';
import { PosCheckoutPageComponent } from './ui/view/pos-checkout-page/pos-checkout-page.component';
import { POSDashboardComponent } from './ui/view/posdashboard/posdashboard.component';
import { ProductCardComponent } from './ui/view/product-card/product-card.component';
import { RequestDetailsComponent } from './ui/view/request-details/request-details.component';
import { ButtonComponent } from './ui/sharedComponent/view/button/button.component';
import { ProductsComponent } from './ui/view/products/products.component';
import { AddProductComponent } from './ui/view/products/add-product/add-product.component';
import { ViewProductComponent } from './ui/view/products/view-product/view-product.component';
import { EditProductComponent } from './ui/view/products/edit-product/edit-product.component';
import { ModalComponent } from './ui/sharedComponent/view/modal/modal.component';
import { SideModalComponent } from './ui/sharedComponent/view/side-modal/side-modal.component';
import { SearchbarComponent } from './ui/sharedComponent/view/searchbar/searchbar.component';
import { NavTabComponent } from './ui/sharedComponent/view/nav-tab/nav-tab.component';
import { CheckoutOrdersComponent } from './ui/view/checkout-orders/checkout-orders.component';
import { HttpClientModule } from '@angular/common/http';
import { NotesModalComponent } from './ui/view/notes-modal/notes-modal.component';
import { DeliveryModalComponent } from './ui/view/delivery-modal/delivery-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    PosPageComponent,
    // CartItemCardComponent,
    // CashPaymentComponent,
    // CheckoutHeaderComponent,
    // CloseRegisterComponent,
    CommisionComponent,
    ConfigurationComponent,
    InventoryComponent,
    ManageUserFormComponent,
    ManageUsersComponent,
    // OpenRegisterComponent,
    // OrderDetailComponent,
    // OrderRefundComponent,
    // PosCheckoutPageComponent,
    // POSDashboardComponent,
    // ProductCardComponent,
    // RequestDetailsComponent,
    ProductsComponent
    // AddProductComponent,
    // ViewProductComponent,
    // TruncatePipe,
    // EditProductComponent,
    // CheckoutHeaderComponent,
    // CheckoutOrdersComponent,
    // NotesModalComponent,
    // DeliveryModalComponent,
  ],
  imports: [
    // BrowserModule,
    // BrowserAnimationsModule,
    AppRoutingModule,
    CommonModule,
    AppRoutingModule,
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
    SearchbarComponent,
    NavTabComponent,
    HttpClientModule,
  ],
  providers: [PosCheckoutPageComponent],
  bootstrap: [AppComponent],
})
export class AppPOSModule {}
