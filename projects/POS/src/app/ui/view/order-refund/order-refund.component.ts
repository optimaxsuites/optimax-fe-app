import { Component, HostListener, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CustomerDTO, Order, OrderItemDTO, ProductData, Refund, RefundMethod, ReturnDTO, ReturnItemDTO, ReturnStatus } from '../../models/interface';
import { RegisterService } from '../../service/register.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { NgForm } from '@angular/forms';
import { MetadataService } from '../../service/metadata.service';
import { PosServiceService } from '../../service/pos-service.service';
import { CustomerService } from '../../service/customer.service';
import { OrderService } from '../../service/order.service';

@Component({
  selector: 'app-order-refund',
  templateUrl: './order-refund.component.html',
  styleUrl: './order-refund.component.scss',
  providers: [MessageService],
})
export class OrderRefundComponent {
  requestForm = false;
  @ViewChild('returnForm') returnForm!: NgForm;
  returnData: ReturnDTO = {
    id: 0,
    name: '',
    phoneNumber: '',
    order: { id: '', orderItem: [], createdDate: new Date() } as Order,
    items: [],
    reason: '',
    cashierComment: '',
    status: ReturnStatus.PENDING,
    refundableAmount: 0,
    refundMethod: RefundMethod.CASH,
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountName: ''
    },
    royaltyAccount: {
      id: 0,
      name: '',
      phone: ''
    },
    exchangeFor: {
     
    } as ProductData
  };
  selectedItems: boolean[] = [];
  orderDetails: Order | null = null;
  availableProducts: ProductData[] = [];
  priceDifference: number = 0;
  hasSelectedItems: boolean = false;
  Math = Math;
  refundDetails: any = {};
  selectedRefundMethod = null;
  returnReasons = [
    { label: 'Defective Product', value: 'DEFECTIVE' },
    { label: 'Wrong Item Received', value: 'WRONG_ITEM' },
    { label: 'Changed Mind', value: 'CHANGED_MIND' },
    { label: 'Size/Fit Issue', value: 'SIZE_ISSUE' },
    { label: 'Item Not As Described', value: 'NOT_AS_DESCRIBED' },
    { label: 'Others', value: 'OTHERS' }
  ];

  refundMethods = [
    { label: 'Cash Refund', value: RefundMethod.CASH },
    { label: 'Bank Transfer', value: RefundMethod.BANK_TRANSFER },
    { label: 'Royalty Account Top-up', value: RefundMethod.ROYALTY_TOPUP },
    { label: 'Exchange for Another Product', value: RefundMethod.EXCHANGE }
  ];




  scannedReceipt: string = '';


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
    this.loadrefundRequests()
  }

  loadAvailableProducts(): void {
    this.metadataService.enrichedProduct$.subscribe(
      (products: ProductData[]) => {
        this.availableProducts = products;
      },
      (error) => {
        console.error('Error loading products:', error);
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
    
    this.returnData = {
      name: '',
      phoneNumber: '',
      order: { id: '', orderItem: [], createdDate: new Date() } as Order,
      items: [],
      reason: '',
      cashierComment: '',
      status: ReturnStatus.PENDING,
      refundableAmount: 0,
      refundMethod: RefundMethod.CASH,
      bankDetails: {
        bankName: '',
        accountNumber: '',
        accountName: ''
      },
      royaltyAccount: {
        id: 0,
        name: '',
        phone: ''
      },
      exchangeFor: {
    
      } as ProductData
    };
  }

  validateOrder(): void {
    if (!this.returnData.order.id) {
      this.orderItems = [];
      this.orderDetails = null;
      return;
    }

    // Call your service to fetch order details
    this.posService.getOrderById(parseInt(this.returnData.order.id)).subscribe(
      (order: Order) => {
        this.orderDetails = order;
        this.orderItems = order.orderItem;
        console.log(this.orderItems)
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
        console.error('Error fetching order:', error);
        // Show an error message to the user
      }
    );
  }

  calculateRefundableAmount(): void {
    let total = 0;
    let returnItems: ReturnItemDTO[] = [];

    this.hasSelectedItems = this.selectedItems.some(item => item);

    this.orderItems.forEach((item, index) => {
      if (this.selectedItems[index]) {
        total += item.totalPrice;
        
        // Create return item
        returnItems.push({
          id: 0, // Will be assigned by the backend
          orderItem: item,
          quantity: item.quantity // By default return all
        });
      }
    });

    this.returnData.refundableAmount = total;
    this.returnData.items = returnItems;
    
    // Recalculate price difference if exchange method is selected
    if (this.returnData.refundMethod === RefundMethod.EXCHANGE && 
        this.returnData.exchangeFor?.id) {
      this.calculatePriceDifference();
    }
  }
  calculatePriceDifference(): void {
    if (!this.returnData.exchangeFor?.sellingPrice) return;
    
    console.log(this.returnData.exchangeFor.sellingPrice)
    console.log( this.returnData.refundableAmount)
    this.priceDifference =  this.returnData.refundableAmount - parseInt(this.returnData.exchangeFor.sellingPrice) ;
  }

  validateRoyaltyAccount(): void {
    if (!this.returnData.royaltyAccount?.id) return;
    
    // Validate the royalty account
    this.customerService.getCustomerById(this.returnData.royaltyAccount.id).subscribe(
      (customer: CustomerDTO) => {
        this.returnData.royaltyAccount = customer;
      },
      (error) => {
        console.error('Error validating royalty account:', error);
        // Show error message to user
      }
    );
  }

  onRefundMethodChange(method: RefundMethod): void {
    // Reset relevant fields based on the selected method
    if (method !== RefundMethod.BANK_TRANSFER) {
      this.returnData.bankDetails = {
        bankName: '',
        accountNumber: '',
        accountName: ''
      };
    }
    
    if (method !== RefundMethod.ROYALTY_TOPUP) {
      this.returnData.royaltyAccount = {
        id: 0,
        name: '',
        phone: ''
      };
    }
    
    if (method !== RefundMethod.EXCHANGE) {
      this.returnData.exchangeFor = {
        id: 0,
        name: '',
        sellingPrice: ''
      } as ProductData;
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
        console.error('Error loading product details:', error);
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

    if (this.orderDetails?.orderStatus === 'PAID') {
      // const refundRequests = JSON.parse(
      //   localStorage.getItem('refundRequests') || '[]'
      // );
      const data = {
        ...this.returnData,
        timestamp: new Date().toLocaleString(),
      };
      this.orderService.makeRequest(data).subscribe( data =>
        console.log(data)
      )

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
    this.returnData.createdAt = new Date();
    
    // Submit the return request
    this.orderService.makeRequest(this.returnData).subscribe(
      (response) => {
        // Handle successful submission
        console.log('Return request submitted successfully:', response);
        this.openRequestForm();
        // Show success message
      },
      (error) => {
        console.error('Error submitting return request:', error);
        // Show error message
      }
    );
  }

  loadrefundRequests() {
    this.metadataService.returns$.subscribe(value => {
      console.log(value)
      this.requests = value
    })
  }

  requestDetails(request: Refund) {
    const selectedRequest = request;
    const checkoutLink = this.navigationLink.getLink('requestDetails');
    this.router.navigate([checkoutLink], { state: { selectedRequest } });
  }

  closeRegister() {
    this.registerService.triggerCloseRegister();
  }

  formatDate(parts: any): Date {
    // const parts = raw.split(',').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  }
  
}
