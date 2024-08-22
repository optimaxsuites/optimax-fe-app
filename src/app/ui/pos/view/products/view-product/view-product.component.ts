import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-view-product',
  templateUrl: './view-product.component.html',
  styleUrl: './view-product.component.scss'
})
export class ViewProductComponent {


  @Input() activeItem: any;
  @Output() edit = new EventEmitter<void>();  
  @Output() closeView = new EventEmitter<void>();  
  
  constructor() {}

  openViewProduct() {
    this.closeView.emit();

    }

    openEdit(arg0: any) {
      this.edit.emit(arg0);

}
}
