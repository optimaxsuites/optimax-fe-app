import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductivityComponent } from './ui/view/productivity/productivity.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin/productivity/yeujdsh',
    pathMatch: 'full'
  },
  {
   path: 'admin/productivity/:uuid',
   component: ProductivityComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
