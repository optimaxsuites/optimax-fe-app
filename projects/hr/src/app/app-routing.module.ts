import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppHrComponent } from './app.component';

const routes: Routes = [
  {
    path: "",
    component: AppHrComponent
  }
];

// @NgModule({
//   imports: [RouterModule.forRoot(routes)],
//   exports: [RouterModule]
// })

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppHrRoutingModule { }
