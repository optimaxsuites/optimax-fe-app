import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { VendorCategoryComponent } from './ui/view/vendor-category/vendor-category.component';
import { VendorIndividualComponent } from './ui/view/vendor-individual/vendor-individual.component';
import { VendorListComponent } from './ui/view/vendor-list/vendor-list.component';
import { VendorManagementComponent } from './ui/view/vendorMangement/vendorManagement';

import { CrmShellComponent } from './ui/view/crm-shell/crm-shell.component';
import { CrmDashboardComponent } from './ui/view/crm-dashboard/crm-dashboard.component';
import { CrmContactsComponent } from './ui/view/crm-contacts/crm-contacts.component';
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

const routes: Routes = [
  // Legacy vendor routes (must come before the shell catch-all)
  { path: 'crm/vendorCategory',   component: VendorCategoryComponent },
  { path: 'crm/individualVendor', component: VendorIndividualComponent },
  { path: 'crm/vendorList',       component: VendorListComponent },
  { path: 'crm/vendorManagement', component: VendorManagementComponent },
  { path: 'crm-ui', component: CrmUiShellComponent },
  // CRM Shell — wraps all section routes; matches section/:uuid pattern
  {
    path: '',
    component: CrmShellComponent,
    children: [
      { path: 'dashboard/:uuid',  component: CrmDashboardComponent },
      { path: 'contacts/:uuid',   component: CrmContactsComponent },
      { path: 'accounts/:uuid',   component: CrmAccountsComponent },
      { path: 'pipeline/:uuid',   component: CrmPipelineComponent },
      { path: 'deals/:uuid',      component: CrmDealsComponent },
      { path: 'leads/:uuid',      component: CrmLeadsComponent },
      { path: 'activities/:uuid', component: CrmActivitiesComponent },
      { path: 'campaigns/:uuid',  component: CrmCampaignsComponent },
      { path: 'quotes/:uuid',     component: CrmQuotesComponent },
      { path: 'contracts/:uuid',  component: CrmContractsComponent },
      { path: 'tickets/:uuid',    component: CrmTicketsComponent },
      { path: 'settings/:uuid',   component: CrmSettingsComponent },
      { path: 'reports/:uuid',    component: CrmReportsComponent },
      { path: 'automation/:uuid', component: CrmAutomationComponent },
      { path: 'government/:uuid', component: CrmGovernmentComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
