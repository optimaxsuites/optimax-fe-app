import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotelCheckoutComponent } from '../ui/view/hotel-checkout/hotel-checkout.component';
import { RoomServiceComponent } from '../ui/view/room-service/room-service.component';
import { RoomSidebarComponent } from '../ui/view/room-sidebar/room-sidebar.component';
import { RoomWelcomeNoteComponent } from '../ui/view/room-welcome-note/room-welcome-note.component';
import { HouseKeepingComponent } from '../ui/view/house-keeping/house-keeping.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'user/hospitality/checkout/34567whr4567yhsdzr56',
    pathMatch: 'full',
  },
  {
    path: 'user/hospitality/checkout/:uuid',
    component: HotelCheckoutComponent,
  },

  {
    path: 'user/hospitality/services/:uuid',
    component: RoomSidebarComponent,

    children: [
      { path: '', component: RoomWelcomeNoteComponent },
      // { path: 'minibar', component: MinibarComponent },
      // { path: 'laundry', component: LaundryComponent },
      { path: 'room sevice', component: RoomServiceComponent },
      { path: 'Housekeeping Record', component: HouseKeepingComponent },
      // { path: 'spa', component: SpaComponent },
      // { path: 'gym', component: GymComponent },
      // { path: 'bar', component: BarComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}
