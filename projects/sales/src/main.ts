import { platformBrowser } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { AppModule } from './app/app.module';
import { App } from './app/app';
import { routes } from './app/app-routing-module';

const devRoutes: Routes = [
  // Bare '/' used to resolve by accident, via a second, buggy copy of `routes` that
  // AppRoutingModule registered at the top level (its own '' -> 'sales-hub' redirect landed
  // here too). That duplicate's been removed (see app-routing-module.ts), so '/' needs its own
  // explicit redirect now — straight into the one real, correctly-prefixed route tree below.
  {
    path: '',
    redirectTo: 'admin/sales',
    pathMatch: 'full'
  },
  {
    path: 'admin/sales',
    children: routes
  },
  {
    path: '**',
    redirectTo: 'admin/sales'
  }
];

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(devRoutes),
    AppModule
  ],
  bootstrap: [App]
})
export class AppDevModule {}

platformBrowser().bootstrapModule(AppDevModule, {
  ngZoneEventCoalescing: true,
})
  .catch(err => console.error(err));
