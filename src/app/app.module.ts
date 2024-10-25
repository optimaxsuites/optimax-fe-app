import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { DashboardPageComponent } from './ui/view/dashboard-page/dashboard-page.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardPageComponent,
  ],
  imports: [
    // BrowserModule,
    CommonModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppDashboardModule { }
