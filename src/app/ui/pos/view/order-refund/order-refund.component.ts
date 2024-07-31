import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Order, Refund } from '../../models/interface';

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
    status: "awaiting",
    timestamp:"",
    selectedItems: []

  };

  requests: Refund[] = []
  orderItems: Order[] = [];
  reloadPage: boolean = false; 

  constructor(
    private router: Router, 
     private messageService: MessageService
     ){}

     ngOnInit() {
      this.loadrefundRequests();
      this.sortRequestByTimestamp()

    }
  

    fetchOrderItems() {
      const savedItems = JSON.parse(localStorage.getItem('savedItems') || '[]');
      const order = savedItems.find((item: any) => item.id === this.refundData.orderId);
  
      if (order) {
        this.orderItems = order.cart
      } else {
        this.orderItems = [];
        console.log('Order does not exist');
      }
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

    if (!order) {
      this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'Order with order id does not exist', key: 'tl', life: 3000 });
      return;
    }

    if (order.state === 'Open') {
      this.messageService.add({ severity: 'warn', summary: 'Error', detail: 'Invalid order', key: 'tl', life: 3000 });
      return;
    }

    if (order.state === 'Paid') {
      const refundRequests = JSON.parse(localStorage.getItem('refundRequests') || '[]');
      const data = {...this.refundData,  timestamp: new Date().toISOString()}
      refundRequests.push(data);
      localStorage.setItem('refundRequests', JSON.stringify(refundRequests));
      this.messageService.add({ severity: 'success', summary: '', detail: 'Request made, await decision', key: 'tl', life: 3000 });
      this.refundData = {
        orderId: '',
        customerName: '',
        refundMeans: '',
        refundReason: '',
        cashierComment: '',
        status: "awaiting",
        timestamp:"",
    selectedItems: []

      };

      this.reloadPage = true;
      this.requestForm = false
    }
    }

    
  loadrefundRequests() {
    const refundRequests = localStorage.getItem('refundRequests');
    if (refundRequests) {
      this.requests = JSON.parse(refundRequests);
    }
  }
}
