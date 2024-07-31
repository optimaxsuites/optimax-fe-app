import { Component, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { RandomTokenService } from 'src/app/ui/shared/service/random-token/random-token.service';

@Component({
  selector: 'app-pos-checkout-page',
  templateUrl: './pos-checkout-page.component.html',
  styleUrl: './pos-checkout-page.component.scss'
})
export class PosCheckoutPageComponent {


  orderName: string = "";
  itemUpdateModal: boolean = false
  productThatNeedsUpdate: number = 0
  dicountModal:boolean = false
  saveModal:boolean = false
  products = Array(10).fill(null).map((_, index) => ({ 
    name: `Nivea lotion - Even glow ${index + 1}`, 
    id: index + 1,
    price: (index + 1) * 10, 
    cartPriceTotal: (index + 1) * 10, 
    count: 0,
    discount: 0.00,
    discountType: 'naira',
    discountValue: 0
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
  displayedDiscount: number = 0
  productDiscountValue: number = 0
  value: string = 'naira';


  orders: any[] = []
  navigationState: { order: any; };

   constructor(
  private router: Router, 
   public navigationLink: NavigationLinksService, private randomTokenService: RandomTokenService
   ) {

     const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras.state as { order: any };
  
    }

  ngOnInit() {
   
    if (this.navigationState?.order) {
      this.loadOrder(this.navigationState.order);
    }
  }
  loadOrder(order: any) {
    this.cartItems = order.cart.map((item: any) => ({ ...item }));
    this.discount = order.cartDiscount;
    this.discountValue = order.discountValue
    this.value = order.value
    this.total = order.total;
    this.calculateTotals();
  }


  getLabelForValue(value: string): string {
    const option = this.stateOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  }

  addToCart(product: any) {

    let existingItem = this.cartItems.find(item => item.name === product.name);
    if (existingItem) {
      existingItem.cartPriceTotal += product.price;
      existingItem.count = existingItem.count + 1
    } else {
      this.cartItems.push(product);
      product.count = product.count + 1
    }
    this.calculateProductDiscount()

    this.calculateTotals();
    this.calculateDiscount()
  }

  deleteCartItem(index: number) {
    this.resetProductDiscount(index)

    this.cartItems[index].cartPriceTotal = this.cartItems[index].price
    this.cartItems[index].count = 0
    this.cartItems.splice(index, 1);
    this.calculateTotals()

    this.calculateDiscount()

    if (this.cartItems.length === 0) {
      this.resetDiscount();
    }

   
  }
  resetProductDiscount(index: number) {
    this.cartItems[index].discount = 0.00
    this.productDiscountValue = 0
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
    const prodductDiscount = this.cartItems.reduce((acc, item) => acc + (item.discount || 0), 0);
    this.displayedDiscount = this.discount + prodductDiscount
    this.tax = this.subtotal * 0.1;
    this.total = this.subtotal + this.tax - (this.discount + prodductDiscount);
  }

  handleCountChange(newCount: number, index: number) {
    this.cartItems[index].cartPriceTotal = this.cartItems[index].price * newCount;
    this.calculateDiscount()
    this.calculateProductDiscount()
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
  for (let item of this.cartItems) {

    if (item.id === this.productThatNeedsUpdate) {
      item.discountType = this.value;
      item.discountValue = this.productDiscountValue
      if (item.discountType === 'naira') {
        item.discount = Number(item.discountValue);
      } else {
        const discountedValue = item.cartPriceTotal * Number(item.discountValue) / 100;
        item.discount = discountedValue;
      }
    }


    if (item.discountValue > 0) {
      if (item.discountType === 'naira') {
        item.discount = Number(item.discountValue);
      } else {
        const discountedValue = item.cartPriceTotal * Number(item.discountValue) / 100;
        item.discount = discountedValue;
      }
    }
   
  }

  this.calculateTotals();
  this.itemUpdateModal = false
}

saveCurrentCartItem() {
  const pausedCart = {
    name: this.orderName,
    cart: this.cartItems.map(item => ({ ...item })),
    cartDiscount: this.discount,
    state: 'Open',
    total: this.total,
    discountValue: this.discountValue,
    value: this.value,
    timestamp: new Date().toLocaleString(),
    id: this.randomTokenService.getRandomToken()
  };
  const savedItems = localStorage.getItem("savedItems");
  this.orders = savedItems ? JSON.parse(savedItems) : [];

  this.orders.push(pausedCart);
  localStorage.setItem("savedItems", JSON.stringify(this.orders));
  
  this.cartItems = [];
  this.orderName = "";
  this.resetDiscount();
  this.resetProductProperties();

  this.saveModal = false;
}

resetProductProperties() {
  this.products.forEach(product => {
    product.count = 0;
    product.cartPriceTotal = product.price;
    product.discount = 0.00;
  });
}

processCashPayment() {
  const  cart ={
    cartItems: [...this.cartItems],
    total: this.total,
    discount: this.displayedDiscount,
    tax: this.tax,
    subtotal: this.subtotal
  }
  const cashPayment = this.navigationLink.getLink("cashPayment")
  this.router.navigate([cashPayment], { state: { cart } });
}

}  
