import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppHrRoutingModule } from './app-routing.module';
import { AppHrComponent } from './app.component';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    AppHrComponent
  ],
  imports: [
    // BrowserModule,
    AppHrRoutingModule,
    CommonModule
  ],
  providers: [],
  bootstrap: [AppHrComponent]
})
export class AppHrModule { }
