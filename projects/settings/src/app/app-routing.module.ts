import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsPageComponent } from './ui/view/settings-page.component';
import { GeneralSettingsComponent } from './ui/view/general/general-settings/general-settings.component';
import { HrSettingsComponent } from './ui/view/hr/hr-settings/hr-settings.component';

const routes: Routes = [
  {
      path: '',
      component: SettingsPageComponent,
      children: [
        // { path: '', redirectTo: 'admin/settings/general-settings/:uuid', pathMatch: 'full' },
        {
          path: 'general-settings/:uuid',
          component: GeneralSettingsComponent,
        },
        {
          path: 'HR-settings/:uuid',
          component: HrSettingsComponent,
        },

      ]
    },

 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
