import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppHrRoutingModule } from './app-routing.module';
import { AppHrComponent } from './app.component';

@NgModule({
  declarations: [
    AppHrComponent
  ],
  imports: [
    // BrowserModule,
    AppHrRoutingModule
  ],
  providers: [],
  bootstrap: [AppHrComponent]
})
export class AppHrModule { }
