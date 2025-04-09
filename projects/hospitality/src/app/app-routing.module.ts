import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HotelCheckoutComponent } from './ui/view/hotel-checkout/hotel-checkout.component';

const routes: Routes = [

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
