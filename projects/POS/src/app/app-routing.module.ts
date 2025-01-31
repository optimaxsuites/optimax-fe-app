import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PosPageComponent } from './ui/view/pos-page.component';


const routes: Routes = [
  { path: '', redirectTo: 'admin/pos/34567whr4567yhsdzr56', pathMatch: 'full' },
  {
    path: 'admin/pos/:uuid',
    component: PosPageComponent,
  },
  // { path: '', loadChildren: () => import('./user/user.module').then(m => m.UserModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
