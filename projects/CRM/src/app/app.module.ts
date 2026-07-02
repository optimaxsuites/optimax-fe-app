import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { VendorCategoryComponent } from './ui/view/vendor-category/vendor-category.component';
import { VendorIndividualComponent } from './ui/view/vendor-individual/vendor-individual.component';
import { VendorListComponent } from './ui/view/vendor-list/vendor-list.component';
import { VendorManagementComponent } from './ui/view/vendorMangement/vendorManagement';
import { CrmPageComponent } from './ui/view/crm-page.component';

// CRM components
import { CrmShellComponent } from './ui/view/crm-shell/crm-shell.component';
import { CrmDashboardComponent } from './ui/view/crm-dashboard/crm-dashboard.component';
import { CrmContactsComponent } from './ui/view/crm-contacts/crm-contacts.component';
import { CrmContactFormComponent } from './ui/view/crm-contacts/crm-contact-form.component';
import { CrmAccountsComponent } from './ui/view/crm-accounts/crm-accounts.component';
import { CrmPipelineComponent } from './ui/view/crm-pipeline/crm-pipeline.component';
import { CrmDealsComponent } from './ui/view/crm-deals/crm-deals.component';
import { CrmLeadsComponent } from './ui/view/crm-leads/crm-leads.component';
import { CrmActivitiesComponent } from './ui/view/crm-activities/crm-activities.component';
import { CrmCampaignsComponent } from './ui/view/crm-campaigns/crm-campaigns.component';
import { CrmQuotesComponent } from './ui/view/crm-quotes/crm-quotes.component';
import { CrmContractsComponent } from './ui/view/crm-contracts/crm-contracts.component';
import { CrmTicketsComponent } from './ui/view/crm-tickets/crm-tickets.component';
import { CrmSettingsComponent } from './ui/view/crm-settings/crm-settings.component';
import { CrmReportsComponent } from './ui/view/crm-reports/crm-reports.component';
import { CrmAutomationComponent } from './ui/view/crm-automation/crm-automation.component';
import { CrmGovernmentComponent } from './ui/view/crm-government/crm-government.component';
import { CrmUiShellComponent } from './ui/view/crm-ui-shell/crm-ui-shell.component';

// Auth
import { AuthInterceptor } from './ui/sharedComponent/service/auth-service/auth.interceptor.service';

// Angular Material
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

// CDK
import { DragDropModule } from '@angular/cdk/drag-drop';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    VendorCategoryComponent,
    VendorIndividualComponent,
    VendorListComponent,
    VendorManagementComponent,
    CrmPageComponent,
    // CRM
    CrmShellComponent,
    CrmDashboardComponent,
    CrmContactsComponent,
    CrmContactFormComponent,
    CrmAccountsComponent,
    CrmPipelineComponent,
    CrmDealsComponent,
    CrmLeadsComponent,
    CrmActivitiesComponent,
    CrmCampaignsComponent,
    CrmQuotesComponent,
    CrmContractsComponent,
    CrmTicketsComponent,
    CrmSettingsComponent,
    CrmReportsComponent,
    CrmAutomationComponent,
    CrmGovernmentComponent,
    CrmUiShellComponent,
  ],
  imports: [
    CommonModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    // CDK
    DragDropModule,
    // Material
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
    MatDividerModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCardModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatRadioModule,
    MatPaginatorModule,
    MatTableModule,
    MatMenuModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatChipsModule,
    MatBadgeModule,
    MatSlideToggleModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
