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
  isLoading: boolean = false;

  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private messageService: MessageService,
    private customerService: CustomerService,
    private randomTokenService: RandomTokenService,
    private checkoutService: CheckoutService,
    private _location: Location
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.navigationState = navigation?.extras.state as NavigationState;
    console.log(this.navigationState);
  }
  businessInfo: string | any;

  ngOnInit(): void {
    this.cart = this.navigationState?.cart;
    this.initializePriceOptions();
    this.token = this.randomTokenService.getRandomToken();
    const userInfoString = sessionStorage.getItem("userInfo");
    if (userInfoString) {
      this.businessInfo = JSON.parse(userInfoString);
    }
  }

  get totalPaid() {
    return (
      (Number(this.paymentValues.cash) ?? 0) +
      (Number(this.paymentValues.card) ?? 0) +
      (Number(this.paymentValues.loyalty) ?? 0) +
      (Number(this.paymentValues.mobile) ?? 0) 
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
  
  // New method to update payment values
  updatePaymentValue(mode: PaymentModes, value: string) {
    this.paymentValues[mode] = parseFloat(value) || null;
    this.updatePriceOptions();
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

  getPriceOptions(method: string) {
    const commonOptions = [
      { label: "Balance", value: this.balanceLeft },
      { label: "10000", value: 10000 },
      { label: "20000", value: 20000 },
    ];
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

  processCashPayment() {
    this.isLoading = true;
    if (this.totalPaid < this.cart?.total) {
      this.isLoading = false;
      this.messageService.add({
        severity: "warn",
        summary: "Error",
        detail: "Wrong amount tendered",
        key: "tl",
        life: 3000,
      });
      return;
    }

    const now = new Date().toISOString();
    const paymentPayload = {
      id: 0,
      totalAmount: this.cart.total,
      transactionDate: now,
      status: "PAID",
    };

    this.checkoutService.makePayment(paymentPayload).subscribe({
      next: (paymentId) => {
        if (!paymentId) {
          this.isLoading = false;
          return this.showError("Missing payment ID from response");
        }

        const paymentBreakdownPayloads = this.cart.paymentModes.map((mode) => ({
          id: 0,
          amountPaid: this.paymentValues[mode],
          transactionRefernce: "",
          paymentMethod: this.getBackendPaymentMethod(mode),
          paymentId: paymentId,
        }));

        let breakdownCount = 0;
        for (const breakdown of paymentBreakdownPayloads) {
          this.checkoutService.savePaymentBreakdown(breakdown).subscribe({
            next: () => {
              breakdownCount++;
              if (breakdownCount === paymentBreakdownPayloads.length) {
                this.submitOrder(paymentId, now);
              }
            },
            error: () => {
              this.isLoading = false;
              this.showError("Failed to save payment breakdown");
            },
          });
        }
      },
      error: () => {
        this.isLoading = false;
        this.showError("Failed to process payment");
      },
    });
  }

  private submitOrder(paymentId: number, now: string) {
    const orderPayload = {
      id: 0 | this.cart.orderId,
      orderNumber: this.randomTokenService.getRandomToken(),
      orderStatus: "PAID",
      updatedAt: now,
      createdDate: now,
      totalAmount: this.cart.total, 
      amountTendered: this.totalPaid,
      quantity: 0,
      customerId: 1,
      branchId: 1,
      cashier: 67,
      paymentId: paymentId,
      orderItem: this.cart.cartItems.flatMap((item) => {
        const orderItems = item.count
          ? [
            {
              totalPrice: item.count * parseInt(item.sellingPrice || "0"),
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
    };

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

          this.router.navigate([this.navigationLink.getLink('checkoutLink')]);

          this.printReceipt();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.showError("Failed to save order");
        },
      });
  }

  private showError(msg: string) {
    this.messageService.add({
      severity: "error",
      summary: "Error",
      detail: msg,
      key: "tl",
      life: 3000,
    });
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
    this._location.back();
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