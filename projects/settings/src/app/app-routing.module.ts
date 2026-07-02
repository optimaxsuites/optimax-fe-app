import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsPageComponent } from './ui/view/settings-page.component';
import { SettingsHomeComponent } from './ui/view/settings-home/settings-home.component';
import { GeneralSettingsComponent } from './ui/view/general/general-settings/general-settings.component';
import { HrSettingsComponent } from './ui/view/hr/hr-settings/hr-settings.component';
import { PosSettingComponent } from './ui/view/pos/pos-setting/pos-setting.component';
import { UserSettingComponent } from './ui/view/user-setting/user-setting.component';
import { ModuleRegistryComponent } from './ui/view/module-registry/module-registry.component';
import { BugTrackerComponent } from './ui/view/bug-tracker/bug-tracker.component';
import { CrmSettingsComponent } from './ui/view/crm/crm-settings.component';
import { FinanceSettingsComponent } from './ui/view/finance-settings/finance-settings.component';
import { FinancePeriodCloseComponent } from './ui/view/finance-period-close/finance-period-close.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsPageComponent,
    children: [
      // { path: '', redirectTo: 'admin/settings/general-settings/:uuid', pathMatch: 'full' },
      { path: 'settings-home/:uuid', component: SettingsHomeComponent },
      {
        path: 'general-settings/:uuid',
        component: GeneralSettingsComponent,
      },
      {
        path: 'HR-settings/:uuid',
        component: HrSettingsComponent,
      },
      {
        path: 'POS-settings/:uuid',
        component: PosSettingComponent,
      },
      {
        path: 'user-roles/:uuid',
        component: UserSettingComponent,
      },
      {
        path: 'module-registry/:uuid',
        component: ModuleRegistryComponent,
      },
      {
        path: 'bug-tracker/:uuid',
        component: BugTrackerComponent,
      },
      {
        path: 'crm-settings/:uuid',
        component: CrmSettingsComponent,
      },
      {
        path: 'finance-settings/:uuid',
        component: FinanceSettingsComponent,
      },
      {
        path: 'finance-period-close/:uuid',
        component: FinancePeriodCloseComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
