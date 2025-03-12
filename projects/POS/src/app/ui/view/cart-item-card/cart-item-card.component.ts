import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Business, ProductData } from '../../models/interface';
import { IndustryDataService } from '../../service/industry-data.service';

@Component({
  selector: 'app-cart-item-card',
  templateUrl: './cart-item-card.component.html',
  styleUrl: './cart-item-card.component.scss',
})
export class CartItemCardComponent implements Business {
  @Input() freezeItemCount = false;
  @Input() item: ProductData = {} as any;
  @Input() showDelete: boolean = true;
  @Output() delete = new EventEmitter<void>();
  @Output() countChange = new EventEmitter<number>();
  @Output() updateItem = new EventEmitter<number>();

  // count: number = this.item.count

  constructor(private industryDataService: IndustryDataService) {}

  decreaseCount() {
    if (this.freezeItemCount) return;

    if (this.item.count > 0) {
      this.item.count--;
    }
    this.emitCountChange();
  }
  increaseCount() {
    if (this.freezeItemCount) return;

    this.item.count++;
    this.emitCountChange();
  }

  private emitCountChange() {
    this.countChange.emit(this.item.count);
  }

  onDelete() {
    this.delete.emit();
  }
  onCountChange(newCount: number) {
    this.countChange.emit(newCount);
  }

  onClick() {
    this.updateItem.emit(this.item.id);
  }

  get cartPriceTotal() {
    return Math.round(parseInt(this.item.cartPriceTotal) * 100) / 100;
  }

  get businessType() {
    return this.industryDataService.businessType;
  }

 

  updateItemQuantity(item: any, change: number, variant?: any, ) {
    if (variant) {
      variant.selectedQuantity = Math.max((variant.selectedQuantity ?? 0) + change, 0);
  
      if (variant.selectedQuantity === 0) {
        item.selectedVariants = item.selectedVariants.filter((v: any) => v !== variant);
      }
    } else {
      item.count = Math.max((item.count ?? 0) + change, 0);
  
      this.countChange.emit(item.count);

    }
  }
  
  
}
