import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { BackButtonComponent } from './back-button.component';

@NgModule({
  declarations: [BackButtonComponent],
  imports: [CommonModule],
  exports: [BackButtonComponent]
})
export class BackButtonModule {}