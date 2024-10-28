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
import { LargeSideModalComponent } from './ui/sharedComponents/view/large-side-modal/large-side-modal.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { HrSettingsComponent } from './ui/view/hr/hr-settings/hr-settings.component';
import { SalaryComponent } from './ui/view/hr/salary/salary.component';

///mat
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
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SettingsPageComponent } from './ui/view/settings-page.component';
import { ScoresheetConfigComponent } from './ui/view/hr/scoresheet-config/scoresheet-config.component';
import { NavigationLinksService } from './ui/sharedComponents/service/navigation-links/navigation-links.service';
import { MenuItemsService } from './ui/sharedComponents/service/menue-items/menu-items.service';
import { GeneralSettingsComponent } from './ui/view/general/general-settings/general-settings.component';


//


@NgModule({
  declarations: [
    AppComponent,
    HrSettingsComponent,
    SalaryComponent,
    SettingsPageComponent,
    ScoresheetConfigComponent,
    GeneralSettingsComponent
  ],
  imports: [
    // BrowserModule,
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
      MatExpansionModule,
      MatRadioModule,
      MatPaginatorModule,
      MatTableModule,
      MatRadioModule,
      MatDialogModule,
      MatFormFieldModule,
      MatInputModule,
      MatIconModule,
      MatTabsModule,
      MatDatepickerModule,
      MatSelectModule,
      MatTooltipModule,
      MatButtonModule,
      MatDividerModule,
      MatTooltip,
      MatTabGroup,
      MatMenuModule,
    LargeSideModalComponent,
  ],
  providers: [
    NavigationLinksService,
    MenuItemsService
  ],
  bootstrap: [AppComponent]
})
export class AppSettingsModule { }
