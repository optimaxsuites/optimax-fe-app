import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './ui/shared-component/view/modal/modal.component';
import { SideModalComponent } from './ui/shared-component/view/side-modal/side-modal.component';

@NgModule({
  declarations: [
    ModalComponent,
    SideModalComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    ModalComponent,
    SideModalComponent
  ]
})
export class SharedOverlayModule { }
