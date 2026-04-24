import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ProductivityAnalyticsPageComponent } from './ui/view/productivity/pages/productivity-analytics-page/productivity-analytics-page.component';
import { ProductivityOverviewPageComponent } from './ui/view/productivity/pages/productivity-overview-page/productivity-overview-page.component';
import { ProductivityReviewsPageComponent } from './ui/view/productivity/pages/productivity-reviews-page/productivity-reviews-page.component';
import { ProductivityTasksPageComponent } from './ui/view/productivity/pages/productivity-tasks-page/productivity-tasks-page.component';
import { ProductivityComponent } from './ui/view/productivity/productivity.component';

@NgModule({
  declarations: [
    AppComponent,
    ProductivityComponent,
    ProductivityOverviewPageComponent,
    ProductivityTasksPageComponent,
    ProductivityReviewsPageComponent,
    ProductivityAnalyticsPageComponent,
  ],
  imports: [BrowserModule, CommonModule, FormsModule, HttpClientModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
