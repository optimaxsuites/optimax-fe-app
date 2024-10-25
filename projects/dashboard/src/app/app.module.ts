import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';
import { LargeSideModalComponent } from './ui/sharedComponent/src/app/ui/view/large-side-modal/large-side-modal.component';
import { PayslipViewComponent } from './ui/view/dashboard-page/payslip-view/payslip-view.component';




import { TableModule } from 'primeng/table';


@NgModule({
  declarations: [
    AppComponent,
    DashboardPageComponent,
    PayslipViewComponent,
  ],
  imports: [
    // BrowserModule,
    CommonModule,
    AppRoutingModule,
    TableModule,
    LargeSideModalComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppDashboardModule { }
