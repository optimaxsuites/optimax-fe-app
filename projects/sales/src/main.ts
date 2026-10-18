import { platformBrowser } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { AppModule } from './app/app.module';
import { App } from './app/app';
import { routes } from './app/app-routing-module';

const devRoutes: Routes = [
  {
    path: '',
    redirectTo: '/admin/sales/sales-hub',
    pathMatch: 'full'
  },
  {
    path: 'admin/sales',
    children: routes
  },
  {
    path: '**',
    redirectTo: '/admin/sales/sales-hub'
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
