import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProcurementPageComponent } from './ui/view/procurement.page.component';
import { NavTabComponent } from './ui/sharedComponent/view/nav-tab/nav-tab.component';
import { ButtonComponent } from './ui/sharedComponent/view/button/button.component';
import { SideModalComponent } from './ui/sharedComponent/view/side-modal/side-modal.component';

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
import { TagModule } from 'primeng/tag';

/////////////mat
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';



////////////////
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BackButtonComponent } from './ui/sharedComponent/view/back-button/back-button.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './ui/sharedComponent/view/modal/modal.component';
import { HttpClientModule } from '@angular/common/http';
import { LargeSideModalComponent } from './ui/sharedComponent/view/large-side-modal/large-side-modal.component';
import { RfqComponent } from './ui/view/rfq/rfq.component';
import { QuotationComponent } from './ui/view/quotation/quotation.component';
import { ProformaInvoiceComponent } from './ui/view/proforma-invoice/proforma-invoice.component';
import { InvoiceComponent } from './ui/view/invoice/invoice.component';
import { DispatchNoteComponent } from './ui/view/dispatch-note/dispatch-note.component';
import { IncomingComponent } from './ui/view/lpo/incoming/incoming.component';
import { OutgoingComponent } from './ui/view/lpo/outgoing/outgoing.component';
import { RfqFormComponent } from './ui/view/rfq/rfq-form/rfq-form.component';
import { AddQuotationItemComponent } from './ui/view/quotation/add-quotation-item/add-quotation-item.component';


@NgModule({
  declarations: [
    AppComponent,
    ProcurementPageComponent,
    RfqComponent,
    QuotationComponent,
    ProformaInvoiceComponent,
    InvoiceComponent,
    DispatchNoteComponent,
    IncomingComponent,
    OutgoingComponent,
    BackButtonComponent,
    ButtonComponent,
    SideModalComponent,
    ModalComponent,
    NavTabComponent,
    RfqFormComponent,
    AddQuotationItemComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatTabGroup,
    MatTooltip,
    MatGridListModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTabsModule,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    MatButtonModule,
    MatTabsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCardModule,
    TagModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatRadioModule,
    MatPaginatorModule,
    MatTableModule,
    MatRadioModule,
    MatMenuModule,
    NgSelectModule,
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
    ToastModule,
    ButtonModule,
    LargeSideModalComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
