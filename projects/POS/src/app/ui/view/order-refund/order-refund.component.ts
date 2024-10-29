import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Order, Refund } from '../../models/interface';
import { RegisterService } from '../../service/register.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-order-refund',
  templateUrl: './order-refund.component.html',
  styleUrl: './order-refund.component.scss',
  providers: [MessageService]
})
export class OrderRefundComponent {



  requestForm = false
  refundData: Refund = {
    orderId: '',
    customerName: '',
    refundMeans: '',
    refundReason: '',
    cashierComment: '',
    emailAddress: "",
    phoneNumber: "",
    status: "awaiting",
    timestamp:"",
    selectedItems: []

  };

  requests: Refund[] = []
  orderItems: Order[] = [];
  reloadPage: boolean = false; 

  constructor(
    private router: Router, 
   public navigationLink: NavigationLinksService,
   private messageService: MessageService,  private registerService: RegisterService
     ){}

     ngOnInit() {
      this.loadrefundRequests();
      this.sortRequestByTimestamp()

    }
  

    fetchOrderItems() {
      const savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
      const order = savedItems.find((item: any) => item.id === this.refundData.orderId);
    
      if (!order) {
        this.orderItems = [];
        this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'Order with order id does not exist', key: 'tl', life: 3000 });
        return;
      }

      
      if (order.state === 'Open') {
        this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'Invalid order', key: 'tl', life: 3000 });
        return;
      }

    
      const refundRequests = JSON.parse(localStorage.getItem('refundRequests') || '[]');
      const existingRequest = refundRequests.find((request: any) => request.orderId === this.refundData.orderId);
    
      if (existingRequest) {
        this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'A request as already been made on this order', key: 'tl', life: 3000 });

        return;
      }
    
      this.orderItems = order.cart; 
    }

    openRequestForm() {
    this.requestForm = !this.requestForm 
    }

  sortRequestByTimestamp() {
    this.requests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  sendRequest() {
    const savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
    const order = savedItems.find((item: any) => item.id === this.refundData.orderId);


    if (order.state === 'Paid') {
      const refundRequests = JSON.parse(localStorage.getItem('refundRequests') || '[]');
      const data = {...this.refundData,  timestamp: new Date().toLocaleString()}
      refundRequests.push(data);
      localStorage.setItem('refundRequests', JSON.stringify(refundRequests));
      this.messageService.add({ severity: 'success', summary: '', detail: 'Request made, await decision', key: 'tl', life: 3000 });
      this.refundData = {
        orderId: '',
        customerName: '',
        emailAddress: "",
        phoneNumber: "",
        refundMeans: '',
        refundReason: '',
        cashierComment: '',
        status: "awaiting",
        timestamp:"",
        selectedItems: []
      };

      this.reloadPage = true;
      this.requestForm = false
      this.loadrefundRequests();
    }
    }

    
  loadrefundRequests() {
    const refundRequests = localStorage.getItem('refundRequests');
    if (refundRequests) {
      this.requests = JSON.parse(refundRequests);
    }
  }

  requestDetails(request: Refund) { 
    const selectedRequest = request
    const checkoutLink = this.navigationLink.getLink("requestDetails")
    this.router.navigate([checkoutLink], { state: { selectedRequest } });
    }
    
    closeRegister() {
      this.registerService.triggerCloseRegister();
    }
}
