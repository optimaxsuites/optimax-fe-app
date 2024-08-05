import { Injectable } from '@angular/core';
import { Product } from '../models/interface';
import { BehaviorSubject } from 'rxjs';
import { RandomTokenService } from '../../shared/service/random-token/random-token.service';
import { PosServiceService } from './pos-service.service';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<any[]>([]);
  cartItems$ = this.cartItemsSubject.asObservable();
   constructor(
   private posService: PosServiceService,
   public navigationLink: NavigationLinksService, 
  private router: Router, 
   private randomTokenService: RandomTokenService, 
   ) { }


  itemUpdateModal: boolean = false
  productThatNeedsUpdate: number = 0
  dicountModal:boolean = false
  saveModal:boolean = false
  orderName: string = "";
  products = this.posService.products
  
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

  // getCartItems(): Product[] {
  //   return this.cartItems;
  // }

  loadOrder(order: any) {
    this.cartItems = order.cart.map((item: any) => ({ ...item }));
    this.discount = order.cartDiscount;
    this.discountValue = order.discountValue
    this.value = order.value
    this.total = order.total;
    this.calculateTotals();
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

  resetDiscount() {
    this.discount = 0.00;
    this.discountValue = 0;
  }

  handleCountChange(newCount: number, index: number) {
    this.cartItems[index].cartPriceTotal = this.cartItems[index].price * newCount;
    this.calculateDiscount()
    this.calculateProductDiscount()
    this.calculateTotals();
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

  calculateTotals() {
    this.subtotal = this.cartItems.reduce((acc, item) => acc + item.cartPriceTotal, 0);
    const prodductDiscount = this.cartItems.reduce((acc, item) => acc + (item.discount || 0), 0);
    this.displayedDiscount = this.discount + prodductDiscount
    this.tax = this.subtotal * 0.1;
    this.total = this.subtotal + this.tax - (this.discount + prodductDiscount);
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
  
  resetProductProperties() {
    this.products.forEach(product => {
      product.count = 0;
      product.cartPriceTotal = product.price;
      product.discount = 0.00;
    });
  }

  resetProductDiscount(index: number) {
    this.cartItems[index].discount = 0.00
    this.productDiscountValue = 0
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

  openItemUpdateModal(index: any) {
    this.itemUpdateModal = true
    this.productThatNeedsUpdate = index
   }
 
 
 
   toggleDiscountModal() {
     if(this.cartItems.length > 0){
       this.dicountModal = !this.dicountModal
     }
   }

   setDiscountValue(value: number){
    if (this.value === 'percentage' && value > 100) {
      this.discountValue = 100;
    } else if (this.value === 'naira' && value > this.subtotal) {
      this.discountValue = this.subtotal;
    } else if (value < 0) {
      this.discountValue = 0;
    } else {
      this.discountValue = value;
    }
   }

  updateCart(items: any[]) {
    this.cartItemsSubject.next(items);
  }
}
