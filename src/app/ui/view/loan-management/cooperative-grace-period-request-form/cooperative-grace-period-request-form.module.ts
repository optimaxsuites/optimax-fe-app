import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CooperativeGracePeriodRequestFormComponent } from './cooperative-grace-period-request-form.component';
import { MessagesModule } from 'primeng/messages';

@NgModule({
  declarations: [CooperativeGracePeriodRequestFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MessagesModule
  ],
  exports: [CooperativeGracePeriodRequestFormComponent]
})
export class CooperativeGracePeriodRequestFormModule {}
