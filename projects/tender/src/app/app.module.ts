import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { AppTenderComponent } from './app.component';

import { AppTenderRoutingModule } from './app-routing.module'

@NgModule({
  declarations: [AppTenderComponent], 
  imports: [
    AppTenderRoutingModule,
    // BrowserModule, 
    CommonModule],
  bootstrap: [AppTenderComponent]
})
export class AppModule { }
