import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DiscountService {

  constructor() { }
  private discountValue: any = 0;
  private productDiscountValue: number = 0;
  private value: string = 'naira';

  getDiscountValue(): number | string {
    return this.discountValue;
  }

  setDiscountValue(value: number | string) {
    this.discountValue = value;
  }

  getProductDiscountValue(): number {
    return this.productDiscountValue;
  }

  setProductDiscountValue(value: number) {
    this.productDiscountValue = value;
  }

  applyDiscount(subtotal: any): number | string {
    if (this.value === 'naira') {
      return this.discountValue;
    } else {
      return subtotal * (this.discountValue / 100);
    }
  }

  applyProductDiscount(cartPriceTotal: number): number {
    if (this.value === 'naira') {
      return this.productDiscountValue;
    } else {
      return cartPriceTotal * (this.productDiscountValue / 100);
    }
  }
}
