import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PosServiceService } from '../../../service/pos-service.service';
import { ProductJSONFormat } from '../../../models/interface';

@Component({
  selector: 'app-view-product',
  templateUrl: './view-product.component.html',
  styleUrl: './view-product.component.scss',
})
export class ViewProductComponent {
  @Input() activeItem: ProductJSONFormat = {} as any;
  @Output() edit = new EventEmitter<void>();
  @Output() closeView = new EventEmitter<void>();

  constructor(private posService: PosServiceService) {}

  openViewProduct() {
    this.closeView.emit();
  }

  openEdit(arg0: any) {
    this.edit.emit(arg0);
  }

  /**
   * Takes in the imgId/imgNo of a product's image object
   */
  getImageUrl(string: string) {
    return this.posService.getProductImage(string);
  }
}
