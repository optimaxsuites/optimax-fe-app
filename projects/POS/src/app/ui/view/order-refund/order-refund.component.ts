import { Component, HostListener, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { MessageService } from "primeng/api";
import {
  CustomerDTO,
  Order,
  OrderItemDTO,
  ProductData,
  Refund,
  RefundMethod,
  RefundStatus,
  ReturnDTO,
  ReturnItemDTO,
  ReturnStatus,
} from "../../models/interface";
import { RegisterService } from "../../service/register.service";
import { NavigationLinksService } from "../../sharedComponent/service/navigation-links/navigation-links.service";
import { NgForm } from "@angular/forms";
import { MetadataService } from "../../service/metadata.service";
import { PosServiceService } from "../../service/pos-service.service";
import { CustomerService } from "../../service/customer.service";
import { OrderService } from "../../service/order.service";
import { from, Subject } from "rxjs";
import { concatMap, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-order-refund",
  templateUrl: "./order-refund.component.html",
  styleUrl: "./order-refund.component.scss",
  providers: [MessageService],
})
export class OrderRefundComponent {
  requestForm = false;
  @ViewChild("returnForm") returnForm!: NgForm;
  returnData: ReturnDTO = {
    id: 0,
    name: "",
    phoneNumber: "",
    order: { id: "", orderItem: [], createdDate: new Date() } as Order,
    items: [],
    reason: "",
    cashierComment: "",
    status: ReturnStatus.PENDING,
    refundableAmount: 0,
    refundStatus: RefundStatus.PROCESSING,
    refundMethod: RefundMethod.CASH,
    bankDetails: {
      bankName: "",
      accountNumber: "",
      accountName: "",
    },
    royaltyAccount: {
      id: null as any,
      name: "",
      phoneNumber: "",
    },
    exchangeFor: {} as ProductData,
  };
  selectedItems: boolean[] = [];
  orderDetails: Order | null = null;
  availableProducts: ProductData[] = [];
  priceDifference: number = 0;
  hasSelectedItems: boolean = false;
   isValidatingRoyaltyAccount: boolean = false;
  Math = Math;
  refundDetails: any = {};
  selectedRefundMethod = null;
  returnReasons = [
    { label: "Defective Product", value: "DEFECTIVE" },
    { label: "Wrong Item Received", value: "WRONG_ITEM" },
    { label: "Changed Mind", value: "CHANGED_MIND" },
    { label: "Size/Fit Issue", value: "SIZE_ISSUE" },
    { label: "Item Not As Described", value: "NOT_AS_DESCRIBED" },
    { label: "Others", value: "OTHERS" },
  ];
  phoneInput$ = new Subject<string>();
  orderNumber$ = new Subject<string>();
  refundMethods = [
    { label: "Cash Refund", value: RefundMethod.CASH },
    { label: "Bank Transfer", value: RefundMethod.BANK_TRANSFER },
    { label: "Royalty Account Top-up", value: RefundMethod.ROYALTY_TOPUP },
    { label: "Exchange for Another Product", value: RefundMethod.EXCHANGE },
  ];

  scannedReceipt: string = "";

  //  @HostListener('window:keydown', ['$event'])
  // handleKeyDown(event: KeyboardEvent) {
  //   if (event.ctrlKey || event.altKey || event.metaKey) {
  //     return;
  //   }

  //   if (event.key === 'Enter') {
  //     if (this.refundData.orderId.trim() !== '') {
  //       this.validateReceipt();
  //     }
  //     event.preventDefault();
  //     return;
  //   }

  //   if (event.key.length === 1) {
  //     this.refundData.orderId += event.key;
  //   }

  //   console.log('Current order ID:', this.refundData.orderId);
  // }

  requests: Refund[] = [];
  orderItems: OrderItemDTO[] = [];
  reloadPage: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public navigationLink: NavigationLinksService,
    private messageService: MessageService,
    private registerService: RegisterService,
    private metadataService: MetadataService,
    private posService: PosServiceService,
    private customerService: CustomerService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.loadAvailableProducts();
    this.loadrefundRequests();
    this.phoneInput$
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((phone) => this.validateRoyaltyAccount(phone));
    this.orderNumber$
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((number) => this.validateOrder(number));
  }

  loadAvailableProducts(): void {
    this.metadataService.enrichedProduct$.subscribe(
      (products: ProductData[]) => {
        this.availableProducts = products;
      },
      (error) => {
        console.error("Error loading products:", error);
      }
    );
  }

   resetForm(): void {
    if (this.returnForm) {
      this.returnForm.resetForm();
    }

    this.orderItems = [];
    this.selectedItems = [];
    this.orderDetails = null;
    this.hasSelectedItems = false;
    this.priceDifference = 0;
    this.isValidatingRoyaltyAccount = false; // Reset loading state

    this.returnData = {
      id: 0,
      name: "",
      phoneNumber: "",
      order: { id: "", orderItem: [], createdDate: new Date() } as Order,
      items: [],
      reason: "",
      cashierComment: "",
      status: ReturnStatus.PENDING,
      refundableAmount: 0,
      refundStatus: RefundStatus.PROCESSING,
      refundMethod: RefundMethod.CASH,
      bankDetails: {
        bankName: "",
        accountNumber: "",
        accountName: "",
      },
      royaltyAccount: {
        id:  null as any,
        name: "",
        phoneNumber: "",
      },
      exchangeFor: {} as ProductData,
    };

    // Make sure royaltyAccountId is not set initially
    delete this.returnData.royaltyAccountId;
  }

  validateOrder(number: any): void {
    if (!this.returnData.order.id) {
      this.orderItems = [];
      this.orderDetails = null;
      return;
    }

    // Call your service to fetch order details
    this.posService.getOrderByOrderNumber(parseInt(number)).subscribe(
      (order: Order) => {
        this.orderDetails = order;
        this.orderItems = order.orderItem;
        console.log(this.orderItems);
        this.selectedItems = new Array(this.orderItems.length).fill(false);

        // Pre-fill customer name if available from the order
        if (order.customer?.name && !this.returnData.name) {
          this.returnData.name = order.customer.name;
        }

        // Pre-fill phone number if available from the order
        if (order.customer?.phoneNumber && !this.returnData.phoneNumber) {
          this.returnData.phoneNumber = order.customer.phoneNumber;
        }
      },
      (error) => {
        console.error("Error fetching order:", error);
        // Show an error message to the user
      }
    );
  }

  calculateRefundableAmount(): void {
    let total = 0;
    let returnItems: ReturnItemDTO[] = [];

    this.hasSelectedItems = this.selectedItems.some((item) => item);

    this.orderItems.forEach((item, index) => {
      if (this.selectedItems[index]) {
        total += item.totalPrice;

        // Create return item
        returnItems.push({
          id: 0, // Will be assigned by the backend
          orderItem: item,
          quantity: item.quantity, // By default return all
        });
      }
    });

    this.returnData.refundableAmount = total;
    this.returnData.items = returnItems;

    // Recalculate price difference if exchange method is selected
    if (
      this.returnData.refundMethod === RefundMethod.EXCHANGE &&
      this.returnData.exchangeFor?.id
    ) {
      this.calculatePriceDifference();
    }
  }
  calculatePriceDifference(): void {
    if (!this.returnData.exchangeFor?.sellingPrice) return;

    console.log(this.returnData.exchangeFor.sellingPrice);
    console.log(this.returnData.refundableAmount);
    this.priceDifference =
      this.returnData.refundableAmount -
      parseInt(this.returnData.exchangeFor.sellingPrice);
  }

 validateRoyaltyAccount(phone: any): void {
    if (!phone || phone.trim() === "") {
      this.returnData.royaltyAccount = {
        id: null as any,
        name: "",
        phoneNumber: "",
      };
      this.isValidatingRoyaltyAccount = false;
      return;
    }

     this.isValidatingRoyaltyAccount = true;

    this.customerService.getCustomerByPhone(phone).subscribe(
      (customer: CustomerDTO) => {
        console.log(customer);
        this.returnData.royaltyAccount = customer;
        this.returnData.name = customer.name;
        this.isValidatingRoyaltyAccount = false;
      },
      (error) => {
        console.error("Error validating royalty account:", error);
        this.returnData.royaltyAccount = {
          id: 0, 
          name: "",
          phoneNumber: "",
        };
        this.isValidatingRoyaltyAccount = false;

        this.messageService.add({
          severity: "info", 
          summary: "Customer Not Found",
          detail: "No customer found with this phone number. You can create a new account.",
          key: "tl",
          life: 4000,
        });
      }
    );
  }

   createCustomer() {
    if (!this.returnData.name || !this.returnData.phoneNumber) {
      this.messageService.add({
        severity: "warn",
        summary: "Missing Information",
        detail: "Customer name and phone number are required to create an account",
        key: "tl",
        life: 4000,
      });
      return;
    }

    if (this.returnData.phoneNumber.length !== 11) {
      this.messageService.add({
        severity: "warn",
        summary: "Invalid Phone Number",
        detail: "Please enter a valid 11-digit phone number",
        key: "tl",
        life: 4000,
      });
      return;
    }

    // Show loading state during customer creation
    this.isValidatingRoyaltyAccount = true;

    this.customerService
      .createCustomer({
        name: this.returnData.name,
        phoneNumber: this.returnData.phoneNumber,
        loyaltyPoints: 0,
        email: "",
      })
      .subscribe(
        (customer) => {
          // Automatically validate the newly created customer
          this.validateRoyaltyAccount(this.returnData.phoneNumber);
          
          this.messageService.add({
            severity: "success",
            summary: "Account Created",
            detail: "Customer account created successfully and linked to this refund",
            key: "tl",
            life: 4000,
          });
        },
        (error) => {
          this.isValidatingRoyaltyAccount = false;
          
          // Handle different types of errors
          let errorMessage = "Failed to create customer account";
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 409) {
            errorMessage = "A customer with this phone number already exists";
          }

          this.messageService.add({
            severity: "error",
            summary: "Creation Failed",
            detail: errorMessage,
            key: "tl",
            life: 5000,
          });
          console.error("Customer creation error:", error);
        }
      );
  }
  onRefundMethodChange(method: RefundMethod): void {
    this.returnData.refundMethod = method;

    // Reset relevant fields based on the selected method
    if (method !== RefundMethod.BANK_TRANSFER) {
      this.returnData.bankDetails = {
        bankName: "",
        accountNumber: "",
        accountName: "",
      };
    }

    if (method !== RefundMethod.ROYALTY_TOPUP) {
      this.returnData.royaltyAccount = {
        id: 0,
        name: "",
        phoneNumber: "",
      };
      // Remove royaltyAccountId if it exists
      delete this.returnData.royaltyAccountId;
    }

    if (method !== RefundMethod.EXCHANGE) {
      this.returnData.exchangeFor = {} as ProductData;
      this.priceDifference = 0;
    }
  }
  onExchangeProductSelected(productId: number): void {
    if (!productId) return;

    this.posService.getProductById(productId).subscribe(
      (product: ProductData) => {
        this.returnData.exchangeFor = product;
        this.calculatePriceDifference();
      },
      (error) => {
        console.error("Error loading product details:", error);
      }
    );
  }

  updateFormFields(event: any) {
    this.selectedRefundMethod = event.value;

    this.refundDetails = {};
  }
  // fetchOrderItems() {
  //   const savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
  //   const order = savedItems.find(
  //     (item: any) => item.id === this.refundData.orderId
  //   );

  //   if (!order) {
  //     this.orderItems = [];
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'Error',
  //       detail: 'Order with order id does not exist',
  //       key: 'tl',
  //       life: 3000,
  //     });
  //     return;
  //   }

  //   console.log(order);
  //   this.orderItems = order.cart;
  //   this.refundData.timestamp = order.timestamp;

  //   if (order.state === 'Open') {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'Error',
  //       detail: 'Invalid order',
  //       key: 'tl',
  //       life: 3000,
  //     });
  //     return;
  //   }

  //   const refundRequests = JSON.parse(
  //     localStorage.getItem('refundRequests') || '[]'
  //   );
  //   const existingRequest = refundRequests.find(
  //     (request: any) => request.orderId === this.refundData.orderId
  //   );

  //   if (existingRequest) {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'Error',
  //       detail: 'A request as already been made on this order',
  //       key: 'tl',
  //       life: 3000,
  //     });

  //     return;
  //   }
  //   console.log(order);
  //   this.orderItems = order.cart;
  //   this.refundData.timestamp = order.timestamp;
  // }

  openRequestForm() {
    this.requestForm = !this.requestForm;
  }

  sortRequestByTimestamp() {
    this.requests.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  sendRequest() {
    // const savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
    // const order = savedItems.find(
    //   (item: any) => item.id === this.refundData.orderId
    // );

    if (this.orderDetails?.orderStatus === "PAID") {
      // const refundRequests = JSON.parse(
      //   localStorage.getItem('refundRequests') || '[]'
      // );
      const data = {
        ...this.returnData,
        timestamp: new Date().toLocaleString(),
      };
      this.orderService
        .makeRequest(data)
        .subscribe((data) => console.log(data));

      this.reloadPage = true;
      this.requestForm = false;
      this.loadrefundRequests();
    }
  }

  submitReturnRequest(): void {
    if (this.returnForm.invalid || !this.hasSelectedItems) {
      return;
    }

    // Set the current date for the return request
    this.returnData.orderId = parseInt(this.orderDetails?.id || "0");

    // Only set royaltyAccountId if the refund method is ROYALTY_TOPUP and we have a valid customer
    if (
      this.returnData.refundMethod === RefundMethod.ROYALTY_TOPUP &&
      this.returnData.royaltyAccount?.id &&
      this.returnData.royaltyAccount.id > 0
    ) {
      this.returnData.royaltyAccountId = this.returnData.royaltyAccount.id;
    } else {
      // Don't send royaltyAccountId if it's not needed or invalid
      delete this.returnData.royaltyAccountId;
    }

    this.returnData.createdAt = new Date();
    console.log(this.returnData);

    const returnItems = this.returnData.items.map((item) => ({
      quantity: item.quantity || item.orderItem.quantity, // Use the actual quantity
      totalPricePaid: item.orderItem.totalPrice,
      productId: item.orderItem.product.id,
      ...(item.orderItem.productVariant && {
        variantId: item.orderItem.productVariant.id,
      }),
    }));

    this.returnData.returnItems = returnItems;

    this.orderService.makeRequest(this.returnData).subscribe(
      (response) => {
        console.log("Return request submitted successfully:", response);
        this.openRequestForm();
        this.resetForm(); // Reset the form after successful submission
      },
      (error) => {
        console.error("Error submitting return request:", error);
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Failed to submit return request",
          key: "tl",
          life: 3000,
        });
      }
    );
  }
  loadrefundRequests() {
    this.metadataService.returns$.subscribe((value) => {
      console.log(value);
      this.requests = value;
    });
  }

  requestDetails(request: Refund) {
    const selectedRequest = request;

    // Get current UUID from route
    const currentUuid = this.route.snapshot.params["uuid"];

    if (!currentUuid) {
      console.error("No UUID found in current route");
      return;
    }

    // Navigate with proper route structure
    this.router.navigate(["refund-request", currentUuid], {
      relativeTo: this.route.parent,
      state: { selectedRequest },
    });
  }
  closeRegister() {
    this.registerService.triggerCloseRegister();
  }

  formatDate(dateInput: any): Date | string {
  // Handle null or undefined
  if (!dateInput) {
    return new Date(); // or return 'N/A' if you prefer
  }

  // If it's already a Date object, return it
  if (dateInput instanceof Date) {
    return dateInput;
  }

  // If it's an ISO string, convert it
  if (typeof dateInput === 'string') {
    return new Date(dateInput);
  }

  // If it's an array (your old format), convert it
  if (Array.isArray(dateInput) && dateInput.length >= 3) {
    const [year, month, day, hour, minute, second] = dateInput;
    return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
  }

  // Fallback
  console.warn('Unknown date format:', dateInput);
  return new Date();
}

  getRefundStatusClass(status: string): string {
    switch (status) {
      case "Pending":
        return "text-yellow-500 bg-yellow-100";
      case "Approved":
        return "text-green-600 bg-green-100";
      case "Rejected":
        return "text-red-600 bg-red-100";
      case "Processing":
        return "text-blue-500 bg-blue-100";
      case "Canceled":
        return "text-gray-500 bg-gray-100";
      case "Expired":
        return "text-orange-600 bg-orange-100";
      case "UnderReview":
        return "text-purple-600 bg-purple-100";
      case "Chargeback":
        return "text-pink-600 bg-pink-100";
      default:
        return "text-gray-800 bg-gray-200";
    }
  }

getReceiptId(request: any): string {
  console.log("Request object for debugging:", request);
  
  if (!request) return 'N/A';
  
  // First try to get the actual order ID (which is the receipt number)
  // This follows the same pattern as order-detail component
  return (
    request.order?.id?.toString() ||
    request.orderId?.toString() ||
    request.orderNumber?.toString() ||
    request.id?.toString() ||
    'N/A'
  );
}
getOrderId(request: any): string {
  return request?.order?.orderNumber || request?.order?.id || 'N/A';
}

}
