import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserRoutingModule } from './user-routing.module';

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
  
    AppResizeDirective
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
  ],
  exports: [ ],
  providers: [],
})
export class UserModule {}
