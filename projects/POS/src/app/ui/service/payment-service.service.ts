import { Injectable } from "@angular/core";
import { Cart, ProductData } from "../models/interface";
import { NavigationLinksService } from "../sharedComponent/service/navigation-links/navigation-links.service";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class PaymentServiceService {
  constructor(
    private _navigationService: NavigationLinksService,
    private _router: Router,
  ) {}

  /** Just a redirect to the actual payment component */
  processPayment(args: {
    paymentModes: Cart["paymentModes"];
    cartItems: ProductData[];
    total: number;
    discount: number;
    tax: number;
    subTotal: number;
  }) {
    const {
      cartItems,
      discount,
      paymentModes,
      subTotal: subtotal,
      tax,
      total,
    } = args;

    if (cartItems.length === 0) return;

    const cart: Cart = {
      cartItems: [...cartItems],
      total,
      discount,
      tax,
      subtotal,
      paymentModes,
      id: "",
      orderId: 0,
    };

    console.log("The cart is: ", cart);

    const cashPaymentComponentLink =
      this._navigationService.getLink("cashPayment");

    this._router.navigate([cashPaymentComponentLink], { state: { cart } });
  }
}
