import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './ui/view/home/home.component';



const routes: Routes = [
  {
    path: '',
    redirectTo: 'admin/tender/tewyeds',
    pathMatch: 'full',
  },
  {
    path: 'admin/tender/:uuid',
    component: HomeComponent
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppTenderRoutingModule {}
