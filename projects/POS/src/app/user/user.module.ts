import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRoutingModule } from './user-routing.module';
import { TruncatePipe } from '../truncate.pipe';
import { CartItemCardComponent } from '../ui/view/cart-item-card/cart-item-card.component';
import { CashPaymentComponent } from '../ui/view/cash-payment/cash-payment.component';
import { CheckoutOrdersComponent } from '../ui/view/checkout-orders/checkout-orders.component';
import { CloseRegisterComponent } from '../ui/view/close-register/close-register.component';
import { DeliveryModalComponent } from '../ui/view/delivery-modal/delivery-modal.component';
import { NotesModalComponent } from '../ui/view/notes-modal/notes-modal.component';
import { OpenRegisterComponent } from '../ui/view/open-register/open-register.component';
import { OrderDetailComponent } from '../ui/view/order-detail/order-detail.component';
import { OrderRefundComponent } from '../ui/view/order-refund/order-refund.component';
import { CheckoutHeaderComponent } from '../ui/view/pos-checkout-page/components/checkout-header/checkout-header.component';
import { PosCheckoutPageComponent } from '../ui/view/pos-checkout-page/pos-checkout-page.component';
import { ProductCardComponent } from '../ui/view/product-card/product-card.component';
import { EditProductComponent } from '../ui/view/products/edit-product/edit-product.component';
import { RequestDetailsComponent } from '../ui/view/request-details/request-details.component';
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
import { SearchbarComponent } from '../ui/sharedComponent/view/searchbar/searchbar.component';
import { SideModalComponent } from '../ui/sharedComponent/view/side-modal/side-modal.component';



@NgModule({
  declarations: [
      CartItemCardComponent,
      CashPaymentComponent,
      CloseRegisterComponent,
      OpenRegisterComponent,
      OrderDetailComponent,
      OrderRefundComponent,
      PosCheckoutPageComponent,
      ProductCardComponent,
      RequestDetailsComponent,
      TruncatePipe,
      EditProductComponent,
      CheckoutHeaderComponent,
      CheckoutOrdersComponent,
      NotesModalComponent,
      DeliveryModalComponent,],
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
        SearchbarComponent,
        NavTabComponent,
        HttpClientModule,
  ],
  providers: [PosCheckoutPageComponent],

})
export class UserModule { }
