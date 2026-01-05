// user.module.ts - COMPLETE FIX

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { EditorModule } from 'primeng/editor';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MenubarModule } from 'primeng/menubar';
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
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TruncatePipe } from '../truncate.pipe';
import { AppResizeDirective } from '../ui/service/app-resize.directive';
import { ButtonComponent } from '../ui/sharedComponent/view/button/button.component';
import { LargeSideModalComponent } from '../ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { ModalComponent } from '../ui/sharedComponent/view/modal/modal.component';
import { NavTabComponent } from '../ui/sharedComponent/view/nav-tab/nav-tab.component';
import { SearchbarComponent } from '../ui/sharedComponent/view/searchbar/searchbar.component';
import { SideModalComponent } from '../ui/sharedComponent/view/side-modal/side-modal.component';
import { AllPaymentsModalComponent } from '../ui/view/all-payments-modal/all-payments-modal.component';
import { CartItemCardComponent } from '../ui/view/cart-item-card/cart-item-card.component';
import { CashPaymentComponent } from '../ui/view/cash-payment/cash-payment.component';
import { CheckoutKitchenComponent } from '../ui/view/checkout-kitchen/checkout-kitchen.component';
import { CheckoutOrdersComponent } from '../ui/view/checkout-orders/checkout-orders.component';
import { NotesModalComponent } from '../ui/view/notes-modal/notes-modal.component';
import { OpenRegisterComponent } from '../ui/view/open-register/open-register.component';
import { OrderDetailComponent } from '../ui/view/order-detail/order-detail.component';
import { OrderRefundComponent } from '../ui/view/order-refund/order-refund.component';
import { CheckoutHeaderComponent } from '../ui/view/pos-checkout-page/components/checkout-header/checkout-header.component';
import { PosCheckoutPageComponent } from '../ui/view/pos-checkout-page/pos-checkout-page.component';
import { PosStoreComponent } from '../ui/view/pos-store/pos-store.component';
import { ProductCardComponent } from '../ui/view/product-card/product-card.component';
import { EditProductComponent } from '../ui/view/products/edit-product/edit-product.component';
import { RequestDetailsComponent } from '../ui/view/request-details/request-details.component';
import { UserRoutingModule } from './user-routing.module';
import { PaginatorModule } from 'primeng/paginator';
import { CheckoutKitchenHeaderComponent } from '../ui/view/checkout-kitchen-header/checkout-header.component';
import { KitchenOrderComponent } from '../ui/view/kitchen-order/kitchen-order.component';
import { StoreHeaderComponent } from '../ui/view/pos-store/store-header/store-header.component';
import { AuthModalComponent } from '../ui/view/pos-store/auth-modal/auth-modal.component';
import { DecimalPipe, TitleCasePipe, DatePipe } from '@angular/common';
import { StoreCheckoutComponent } from '../ui/view/pos-store/store-checkout/store-checkout.component';
import { ProductDetailsComponent } from '../ui/view/pos-store/product-details/product-details.component';
import { CategoryProductsComponent } from '../ui/view/pos-store/category-products/category-products.component';
import { WhatsappWidgetComponent } from '../ui/view/pos-store/whatsapp-widget/whatsapp-widget.component';
import { CheckoutKitchenHistoryComponent } from '../ui/view/checkout-kitchen-history/checkout-kitchen-history.component';
import { OrderConfirmationComponent } from '../ui/view/pos-store/order-confirmation/order-confirmation.component';
import { LocationPickingComponent } from '../ui/view/pos-store/location-picking/location-picking.component';

@NgModule({
  declarations: [
    CartItemCardComponent,
    CashPaymentComponent,
    OpenRegisterComponent,
    OrderDetailComponent,
    OrderRefundComponent,
    PosCheckoutPageComponent,
    ProductCardComponent,
    RequestDetailsComponent,
    TruncatePipe,
    EditProductComponent,
    CheckoutOrdersComponent,
    NotesModalComponent,
    AllPaymentsModalComponent,
    CheckoutKitchenComponent,
    CheckoutHeaderComponent,
    AppResizeDirective,
    // PosStoreComponent,
    CheckoutKitchenHeaderComponent,
    KitchenOrderComponent,
    // StoreHeaderComponent,
    // AuthModalComponent,
    // StoreCheckoutComponent,
    // ProductDetailsComponent,
    // CategoryProductsComponent,
    // WhatsappWidgetComponent,
    CheckoutKitchenHistoryComponent,
    // OrderConfirmationComponent, 
    // LocationPickingComponent
  ],
  imports: [
    CommonModule,
    UserRoutingModule,
    TableModule,
    PaginatorModule,
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
    CardModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
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
    BadgeModule,
    MenubarModule,
    TagModule,
  ],
  exports: [
    CheckoutKitchenComponent, 
    CheckoutHeaderComponent, 
    CheckoutKitchenHeaderComponent,
    // LocationPickingComponent
    // OrderConfirmationComponent 
  ],
  providers: [PosCheckoutPageComponent, DecimalPipe, TitleCasePipe, DatePipe],
})
export class UserModule {}