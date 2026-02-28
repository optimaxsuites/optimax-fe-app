import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HotelAdmintableComponent } from './ui/view/hotel-admintable/hotel-admintable.component';

const routes: Routes = [
  { path: 'room/:uuid', component: HotelAdmintableComponent },
  {
    path: 'hospitality',
    loadChildren: () =>
      import('./ui/view/room-management/room-management.module').then(
        (m) => m.RoomManagementModule
      ),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

