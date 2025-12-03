// cash-payment.component.ts

import { Location } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import JsBarcode from "jsbarcode";
import { MessageService } from "primeng/api";
import { NavigationLinks } from "../../models/enums";
import {
  Cart,
  CustomerDTO,
  NavigationState,
  PaymentModes,
} from "../../models/interface";
import { OrderPOST } from "../../models/interfaces/kitchen";
import { CheckoutService } from "../../service/checkout.service";
import { CustomerService } from "../../service/customer.service";
import { NavigationLinksService } from "../../sharedComponent/service/navigation-links/navigation-links.service";
import { RandomTokenService } from "../../sharedComponent/service/random-token/random-token.service";
import { OfflineService } from "../../service/offline.service";
import { BehaviorSubject, firstValueFrom, Observable } from "rxjs";
import { MetadataService } from "../../service/metadata.service";
import { HttpErrorResponse } from "@angular/common/http"; // <-- Import HttpErrorResponse

@Component({
  selector: "app-cash-payment",
  templateUrl: "./cash-payment.component.html",
  styleUrl: "./cash-payment.component.scss",
  providers: [MessageService],
})
export class CashPaymentComponent implements OnInit {
  navigationState: NavigationState;
  cart: Cart = {} as unknown as Cart;
  priceOptions: any[] = [];
  priceValue = 0.0;
  orders: any;
  changeOffered: number = 0.0;
  changeOfferedModal: boolean = false;
  receiptID: string = Math.floor(100000 + Math.random() * 900000).toString();
  token: string = "";
  paymentValues: Record<PaymentModes, number | null> = {
    cash: null,
    card: null,
    loyalty: null,
    mobile: null,
  };

  priceOptionsMap: Record<PaymentModes, Array<{ label: string; value: number }>> = {
    cash: [],
    card: [],
    loyalty: [],
    mobile: [],
  };

  customerSearch: string = "";
  customerFound: CustomerDTO | null = null;
  customerNotFound: boolean = false;
  showCreateCustomerModal: boolean = false;
  isAllPaymentmodalopen: boolean = false;
  isAllPaymentsModalOpen = false;
  newCustomer: CustomerDTO = {
    id: 0,
    name: "",
    phoneNumber: "",
    email: "",
    loyaltyPoints: 0,
  };
  businessInfo: string | any;
  public shopName: string = '';
  public cashierName: string = '';
  public shopAddress: string = '';
  public industry: string = '';
  public userPrimaryInfoRegData: any; 
  now: Date = new Date()


  isLoading: boolean = false;
    private _isOffline = new BehaviorSubject<boolean>(!navigator.onLine);
    isOffline$: Observable<boolean> = this._isOffline.asObservable();

  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private messageService: MessageService,
    private customerService: CustomerService,
    private randomTokenService: RandomTokenService,
    private checkoutService: CheckoutService,
    private _location: Location,
    private offlineService: OfflineService,
    private metaDataService: MetadataService
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras.state as NavigationState;
    if (!this.navigationState) {
      const savedState = localStorage.getItem("navigationState");
      if (savedState) {
        this.navigationState = JSON.parse(savedState);
      }
    } else {
      localStorage.setItem("navigationState", JSON.stringify(this.navigationState));
    }
    console.log(this.navigationState);

    const userInfoString = sessionStorage.getItem("userBranchInfoRegData");
    if (userInfoString) {
      this.businessInfo = JSON.parse(userInfoString);
    }

    window.addEventListener('online', () => this._isOffline.next(false));
    window.addEventListener('offline', () => this._isOffline.next(true));
  }

  ngOnInit(): void {
    // The cart object should now contain deliveryStatus
    this.cart = this.navigationState?.cart;
    console.log(this.cart)
    console.log(this.navigationState.order)
    this.updatePriceOptions();
    this.initializePriceOptions();
    this.token = this.randomTokenService.getRandomToken();
    this.fetchUserInfo();

    // const userInfoString = sessionStorage.getItem("userInfo");
    // if (userInfoString) {
    //   this.businessInfo = JSON.parse(userInfoString);
    // }
    // if(navigator.onLine) this.syncOfflinePayments();
  }

  fetchUserInfo() {
    const userDataString = sessionStorage.getItem('userPrimaryInfoRegData'); 
    
    if (userDataString) {
      this.userPrimaryInfoRegData = JSON.parse(userDataString);
      
      // Shop Name (ClientType as requested)
      this.shopName = this.userPrimaryInfoRegData.companyName || 'POS System';
      
      // Shop Address (Combining address, city, state)
      this.shopAddress = (this.userPrimaryInfoRegData.address || '') + 
                         (this.userPrimaryInfoRegData.city ? ', ' + this.userPrimaryInfoRegData.city : '') +
                         (this.userPrimaryInfoRegData.state ? ', ' + this.userPrimaryInfoRegData.state : '');
      
      // Cashier Name (from nested 'user' object)
      this.cashierName = this.userPrimaryInfoRegData.user?.username || 'Cashier';
    }
  }

    formatDate(parts: any): Date {
    // const parts = raw.split(',').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  }
  


  get totalPaid() {
    return (
      (this.paymentValues.cash ?? 0) +
      (this.paymentValues.card ?? 0) +
      (this.paymentValues.loyalty ?? 0) +
      (this.paymentValues.mobile ?? 0) 
    );
  }
  
  openAllPaymentsModal() {
    this.isAllPaymentsModalOpen = !this.isAllPaymentsModalOpen;
  }
  
  onPaymentsSelected(selectedModes: PaymentModes[]) {
    this.navigationState.cart.paymentModes = selectedModes;
    this.isAllPaymentsModalOpen = false;
    this.updatePriceOptions();
  }
  
  removePaymentMode(modeToRemove: PaymentModes) {
    this.paymentValues[modeToRemove] = null;
    this.navigationState.cart.paymentModes = this.navigationState.cart.paymentModes.filter(
      (mode) => mode !== modeToRemove);
    this.updatePriceOptions();
  }

  get balanceLeft() {
    return Math.max(0, this.cart.total - this.totalPaid);
  }

  getLoyaltyMax(mode: string): number | null {
    return mode === "loyalty" && this.customerFound?.loyaltyPoints != null
      ? this.customerFound.loyaltyPoints
      : null;
  }

  updatePriceOptions() {
    const balance = this.balanceLeft;
    const commonOptions = [
      { label: "Balance", value: balance },
      { label: "10000", value: 10000 },
      { label: "20000", value: 20000 },
    ];

    this.priceOptionsMap.cash = commonOptions;
    this.priceOptionsMap.card = commonOptions;
    this.priceOptionsMap.loyalty = commonOptions;
    this.priceOptionsMap.mobile = commonOptions;
  }

  getPriceOptions(mode: PaymentModes) {
  const commonOptions = [
    { label: "Balance", value: this.balanceLeft },
    { label: "10000", value: 10000 },
    { label: "20000", value: 20000 },
  ];

  if (mode === 'loyalty' && this.customerFound?.loyaltyPoints) {
    const loyaltyAmount = Math.min(this.customerFound.loyaltyPoints, this.balanceLeft);
    return [{ label: `Loyalty Points (${loyaltyAmount})`, value: loyaltyAmount }, ...commonOptions];
  }
  return commonOptions;
}

  getPaymentLabel(mode: string): string {
    const labels: { [key: string]: string } = {
      cash: "Cash Tendered",
      card: "Amount Charged to Card",
      loyalty: "Loyalty Charge",
    };
    return labels[mode] || "Payment Amount";
  }

  findCustomer() {
    if (!this.customerSearch) return;

    this.isLoading = true;

    this.customerService.getCustomerByPhone(this.customerSearch).subscribe({
      next: (customer) => {
        this.customerFound = customer;
        this.customerNotFound = false;
        this.paymentValues["loyalty"] = customer.loyaltyPoints || null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Customer lookup failed:", err);
        this.customerFound = null;
        this.customerNotFound = true;
        this.isLoading = false;
      },
    });
  }

  openCreateCustomerModal(): void {
    this.showCreateCustomerModal = true;
    this.newCustomer = {
      id: 0,
      name: "",
      phoneNumber: this.customerSearch,
      email: "",
      loyaltyPoints: 0,
    };
  }

  createCustomer(): void {
    if (!this.newCustomer.name || !this.newCustomer.phoneNumber) return;

    this.customerService.createCustomer(this.newCustomer).subscribe(
      (customer) => {
        this.customerFound = customer;
        this.customerNotFound = false;
        this.showCreateCustomerModal = false;
        this.messageService.add({
          severity: "success",
          summary: "Success",
          detail: "Customer created successfully",
          key: "tl",
          life: 3000,
        });
      },
      (error) => {
        this.messageService.add({
          severity: "warn",
          summary: "Error",
          detail: "Failed to create customer",
          key: "tl",
          life: 3000,
        });
        console.error("Customer creation error:", error);
      }
    );
  }

  initializePriceOptions() {
    this.priceOptions = [
      { label: "Exact", value: this.balanceLeft },
      { label: "100", value: 100 },
      { label: "200", value: 200 },
    ];
  }

  private getBackendPaymentMethod(mode: string): string {
    const map: Record<string, string> = {
      cash: "CASH",
      card: "CARD",
      loyalty: "LOYALTY_POINTS",
      mobile: "MOBILE_MONEY",
    };
    return map[mode] || mode.toUpperCase();
  }

 async processCashPayment() {
  this.isLoading = true;

  if (this.totalPaid < this.cart?.total) {
    this.isLoading = false;
    return this.showError("Wrong amount tendered");
  }

  const now = new Date().toISOString();
  const branchId = await firstValueFrom(this.metaDataService.selectedBranchId$);
  const paymentPayload = {
    id: 0,
    totalAmount: this.cart.total,
    transactionDate: now,
    status: "PAID",
    breakdowns: this.cart.paymentModes.map((mode) => ({
      id: 0,
      amountPaid: this.paymentValues[mode],
      transactionRefernce: "",
      paymentMethod: this.getBackendPaymentMethod(mode),
    })),
    order: {
      id: 0 | this.cart.orderId,
      orderNumber: this.randomTokenService.getRandomToken(),
      orderStatus: "PAID",
      updatedAt: now,
      createdDate: now,
      totalAmount: this.totalPaid,
      amountTendered: this.totalPaid,
      quantity: 0,
      branchId: branchId,
      cashierId: Number(sessionStorage.getItem("userid")),
      orderItem: this.cart.cartItems.flatMap((item) => {
        const orderItems = item.count
          ? [{
              totalPrice: item.count * parseInt(item.sellingPrice || "0"),
              quantity: item.count,
              productId: item.id,
            }]
          : [];

        if (item.selectedVariants?.length) {
          item.selectedVariants.forEach((variant) => {
            const selectedQuantity = variant.selectedQuantity ?? 0;
            const price = variant.price || 0;
            if (selectedQuantity > 0) {
              orderItems.push({
                totalPrice: selectedQuantity * price,
                quantity: selectedQuantity,
                productId: item.id,
                productVariantId: variant.id,
              } as {
                totalPrice: number;
                quantity: number;
                productId: number;
                productVariantId: number | null;
              }
            );
            }
          });
        }
        return orderItems;
      }),
      deliveryFee: 0,
      estimatedReadyTime: "string",
      estimatedDeliveryTime: "string",
      customerEmail: "string",
      deliveryStatus: "CONFIRMED"
    }
  };

  console.log(paymentPayload)

  const onlinePaymentPayload = { id: 0, totalAmount: this.cart.total, transactionDate: now, status: "PAID", };

  if (!navigator.onLine) {
    await this.offlineService.addPendingPayment(paymentPayload);
    this.messageService.add({
      severity: "info",
      summary: "Offline",
      detail: "Payment saved offline. It will sync when you're online.",
      key: "tl",
      life: 5000,
    });
    //  const historyState = history.state;
    //                 const paymentTrackingHistory = historyState.paymentTracking;
    //                 this.router.navigateByUrl(historyState.prevUrlBeforePaymentPage, {
    //                   state: {
    //                     ...historyState,
    //                     paymentTracking: paymentTrackingHistory
    //                       ? { ...paymentTrackingHistory, paymentSuccess: true }
    //                       : undefined,
    //                     paymentSuccess: true,
    //                   },
    //                 });
    const checkoutLink = this.navigationLink.getLink('checkoutLink');
      this.router.navigate([checkoutLink]);
      this.printReceipt();
    this.isLoading = false;
    return;
  }

  this.checkoutService.makePayment(onlinePaymentPayload).subscribe(
    { next: (paymentId) => {
      if (!paymentId) return this.showError("Missing payment ID from response"); 
      const paymentBreakdownPayloads = this.cart.paymentModes.map((mode) => (
        { id: 0, 
          amountPaid: this.paymentValues[mode], 
          transactionRefernce: "", 
          paymentMethod: this.getBackendPaymentMethod(mode), 
          paymentId: paymentId, 
        }
      )); 
    let breakdownCount = 0; 
    for (const breakdown of paymentBreakdownPayloads) { 
      this.checkoutService.savePaymentBreakdown(breakdown).subscribe({
         next: () => {
           breakdownCount++; 
           if (breakdownCount === paymentBreakdownPayloads.length) { 
            this.submitOrder(paymentId, now); this.isLoading = false; 
          } 
          }, 
         error: () => this.showError("Failed to save payment breakdown"),
         }); 
        } 
      },
         
      error: () => this.showError("Failed to process payment"), 
    });
}


  private async submitOrder(paymentId: number, now: string) {
  const branchId = await firstValueFrom(this.metaDataService.selectedBranchId$);

    const orderPayload: any = {
      id: 0 | this.cart.orderId,
      orderNumber: this.randomTokenService.getRandomToken(),
      orderStatus: "PAID",
      updatedAt: now,
      createdDate: now,
      totalAmount: this.totalPaid,
      tax: this.cart.tax,
      isOnline: false,
      amountTendered: this.totalPaid,
      quantity: 0,
      // customerId: 1,
      branchId: branchId,
      cashierId: Number(sessionStorage.getItem("userid")),
      paymentId: paymentId,
      orderItem: this.cart.cartItems.flatMap((item) => {
        const orderItems = item.count
          ? [
            {
              totalPrice: item.count * Number(item.sellingPrice || "0")  ,
              quantity: item.count,
              productId: item.id,
            },
          ]
          : [];

        if (item.selectedVariants?.length) {
          item.selectedVariants.forEach((variant) => {
            const selectedQuantity = variant.selectedQuantity ?? 0;
            const price = variant.price || 0;
            if (selectedQuantity > 0) {
              orderItems.push({
                totalPrice: selectedQuantity * price,
                quantity: selectedQuantity,
                productId: item.id,
                productVariantId: variant.id,
              } as {
                totalPrice: number;
                quantity: number;
                productId: number;
                productVariantId: number | null;
              });
            }
          });
        }
        return orderItems;
      }),
      //  Add deliveryStatus here from the cart object
      deliveryStatus: this.cart.deliveryStatus || 'CONFIRMED'
    };
    if(this.customerFound) {
      orderPayload.customerId = this.customerFound?.id
    }

    

    this.checkoutService
      .saveOrder(orderPayload as unknown as OrderPOST)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: "success",
            summary: "Success",
            detail: "Payment, Breakdown & Order saved successfully",
            key: "tl",
            life: 3000,
          });

          // const historyState = history.state;
          // const paymentTrackingHistory = historyState.paymentTracking;
          // this.router.navigateByUrl(historyState.prevUrlBeforePaymentPage, {
          //   state: {
          //     ...historyState,
          //     paymentTracking: paymentTrackingHistory
          //       ? { ...paymentTrackingHistory, paymentSuccess: true }
          //       : undefined,
          //     paymentSuccess: true, 
          //   },
          // });
          const checkoutLink = this.navigationLink.getLink('checkoutLink');
          this.router.navigate([checkoutLink]);
          this.printReceipt();
          this.isLoading = false;
        },
        error: (error) => this.handleOrderSaveError(error), // <-- **CHANGED** to use new error handler
      });
  }

  // **NEW METHOD** for handling Order Save Errors (including Out of Stock)
  private handleOrderSaveError(error: HttpErrorResponse): void {
    this.isLoading = false;
    let errorMessage = "Failed to save order. Please check the console for details.";

    // Attempt to extract the error message from the response body
    // Assuming the backend sends an "Out of Stock" message either as a string or inside an object.
    const errorBody = error.error;
    const errorStatus = error.status;

    let serverMessage = '';

    if (typeof errorBody === 'string') {
        serverMessage = errorBody;
    } else if (errorBody?.message) {
        serverMessage = errorBody.message;
    } else if (errorBody) {
        serverMessage = JSON.stringify(errorBody);
    }
    
    console.error("❌ Order save error details:", { status: errorStatus, serverMessage: serverMessage, fullError: error });

    // **Primary check for Out of Stock**
    if (errorStatus === 400 || errorStatus === 409) {
      if (serverMessage.toLowerCase().includes("out of stock") || 
          serverMessage.toLowerCase().includes("inventory depleted") ||
          serverMessage.toLowerCase().includes("insufficient stock")) {
        
        errorMessage = "⚠️ Product Out of Stock! One or more items in the cart are now unavailable. Please adjust the quantities and try again.";
        this.messageService.add({
          severity: "warn",
          summary: "Inventory Issue",
          detail: errorMessage,
          key: "tl",
          life: 7000,
        });
        return; // Exit after showing the specific toast
      }
    }
    
    // Default error handling
    if (serverMessage) {
        errorMessage = `Error saving order: ${serverMessage}`;
    } else if (errorStatus === 0) {
        errorMessage = "Network error. Unable to connect to the server.";
    } else {
        errorMessage = `Server Error (${errorStatus}). Failed to save order.`;
    }
    
    this.showError(errorMessage);
  }

  private showError(msg: string) {
    this.messageService.add({
      severity: "error",
      summary: "Error",
      detail: msg,
      key: "tl",
      life: 3000,
    });
    this.isLoading = false;
  }

  saveCurrentCartItem() {
    const paidCart = {
      name: "fulfilled",
      cart: this.cart?.cartItems.map((item) => ({ ...item })),
      cartDiscount: this.cart?.discount,
      tax: this.cart?.tax,
      subtotal: this.cart?.subtotal,
      state: "Paid",
      total: this.cart?.total,
      paymentMethod: "cash",
      priceTender: this.priceValue,
      changeOffered: this.priceValue - this.cart?.total,
      id: this.token,
      timestamp: new Date().toLocaleString(),
    };
    const savedItems = localStorage.getItem("savedItems");
    this.orders = savedItems ? JSON.parse(savedItems) : [];

    this.orders.push(paidCart);
    localStorage.setItem("savedItems", JSON.stringify(this.orders));
  }

  navigateBack() {
    // this._location.back();
    const cart = this.cart;
    const checkoutLink = this.navigationLink.getLink('checkoutLink');
    this.router.navigate([checkoutLink], { state: { cart } });
  }

  get approximateCartTotal() {
    return Math.round(this.cart?.total * 100) / 100;
  }

  printReceipt() {
    const content = document.getElementById("receipt-container")?.outerHTML;

    if (content) {
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
          <head>
            <title>Receipt</title>
            <style>
              @media print {
                @page { margin: 0; }
                body { margin: 0; font-size: 14px; }
                #receipt-container { width: 100%; }
              }
            </style>
          </head>
          <body onload="window.print();">
            ${content}
          </body>
          </html>
        `);
        doc.close();
      }

      setTimeout(() => document.body.removeChild(iframe), 5000);
    }
  }

  ngAfterViewInit() {
    JsBarcode("#barcode", this.token, {
      format: "CODE128",
      displayValue: false,
      width: 2,
      height: 40,
    });
  }

  parseFloat(arg: string) {
    return parseFloat(arg);
  }
}