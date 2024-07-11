import { Component, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-pos-checkout-page',
  templateUrl: './pos-checkout-page.component.html',
  styleUrl: './pos-checkout-page.component.scss'
})
export class PosCheckoutPageComponent {


  itemUpdateModal: boolean = false
  productThatNeedsUpdate: number = 0
  dicountModal:boolean = false
  products = Array(10).fill(null).map((_, index) => ({ 
    name: `Nivea lotion - Even glow ${index + 1}`, 
    id: index + 1,
    price: (index + 1) * 10, 
    cartPriceTotal: (index + 1) * 10, 
    count: 0,
    discount: 0.00  
  })); 
  
  subtotal: number = 0.00;
  tax: number = 0.00;
  discount: number = 0.00;
  productDiscount: number = 0.00;
  total: number = 0.00;
  cartItems: any[] = [];
  count: number = 1

  stateOptions: any[] = [{ label: '₦', value: 'naira' },{ label: '%', value: 'percentage' }];
  discountOptions: any[] = [{ label: '5', value: '5' },{ label: '10', value: '10' },{ label: '15', value: '15' }];
  discountValue: number = 0
  productDiscountValue: number = 0
  value: string = 'naira';

  getLabelForValue(value: string): string {
    const option = this.stateOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  }

  addToCart(product: any) {
    // this.cartItems.push(product);

    let existingItem = this.cartItems.find(item => item.name === product.name);
    if (existingItem) {
      existingItem.cartPriceTotal += product.price;
      existingItem.count = existingItem.count + 1
    } else {
      this.cartItems.push(product);
      product.count = product.count + 1
    }
    this.calculateDiscount()
  
    this.calculateTotals();
    
  }

  deleteCartItem(index: number) {

    this.cartItems[index].cartPriceTotal = this.cartItems[index].price
    this.cartItems[index].count = 0
    this.cartItems.splice(index, 1);
    this.calculateDiscount()
    if (this.cartItems.length === 0) {
      this.resetDiscount();
    }
    // this.calculateTotals()
   
  }

  resetDiscount() {
    this.discount = 0.00;
    this.discountValue = 0;
  }

  openItemUpdateModal(index: any) {
   this.itemUpdateModal = true
   this.productThatNeedsUpdate = index
  }

  calculateTotals() {
    this.subtotal = this.cartItems.reduce((acc, item) => acc + item.cartPriceTotal, 0);
    // const discountedSubtotal = this.cartItems.reduce((acc, item) => acc + (item.cartPriceTotal - (item.discount || 0)), 0);
    this.discount = this.discount +=  this.cartItems.reduce((acc, item) => acc + (item.discount || 0), 0);
    this.tax = this.subtotal * 0.1;
    this.total = this.subtotal + this.tax - this.discount;
  }

  handleCountChange(newCount: number, index: number) {
    this.cartItems[index].cartPriceTotal = this.cartItems[index].price * newCount;
    this.calculateDiscount()

    this.calculateTotals();
  }

  toggleDiscountModal() {
    if(this.cartItems.length > 0){
      this.dicountModal = !this.dicountModal
    }
  }

  calculateDiscount(){
    if(this.value == 'naira'){
      this.discount = Number(this.discountValue)

    } else {
      const discountedValue = this.subtotal * Number(this.discountValue)/100
      this.discount = discountedValue
    }
    this.calculateTotals();
    this.dicountModal = false
  } 

    get _discountValue(): number {
      return this.discountValue;
    }

  set _discountValue(value: number) {
    if (this.value === 'percentage' && value > 100) {
      this.discountValue = 100;
    } else if (this.value === 'naira' && value > this.subtotal) {
      this.discountValue = this.subtotal;
    } else if (value < 0) {
      this.discountValue = 0;
    } else {
      this.discountValue = value;
    }
    // this.calculateDiscount();
  }
  validateDiscountValue() {
    const discount = Number(this.discountValue);
    if (this.value =="percentage" && discount > 100) {
      this.discountValue =  100;
    }else if (this.value =="naira" && discount > this.subtotal) {
      this.discountValue = this.subtotal;
    } else if (discount < 0) {
      this.discountValue = 0;
    }
  }


  get _productDiscountValue(): number {
    return this.productDiscountValue;
  }

set _productDiscountValue(value: number) {
  if (this.value === 'percentage' && value > 100) {
    this.productDiscountValue = 100;
  } else if (this.value === 'naira' && value > this.subtotal) {
    this.productDiscountValue = this.subtotal;
  } else if (value < 0) {
    this.productDiscountValue = 0;
  } else {
    this.productDiscountValue = value;
  }
  // this.calculateDiscount();
}

calculateProductDiscount() {
  console.log(this.productThatNeedsUpdate)
  

  for (let item of this.cartItems) {
    if (item.id === this.productThatNeedsUpdate) {
      if (this.value === 'naira') {
        item.discount = Number(this.productDiscountValue);
      } else {
        const discountedValue = item.cartPriceTotal * Number(this.productDiscountValue) / 100;
        item.discount = discountedValue;
      }
      break; 
    }
  }
  console.log(this.cartItems)

  this.calculateTotals();
  this.itemUpdateModal = false
}
  

}
