import { Component } from '@angular/core';

@Component({
  selector: 'app-purchase-req-management',
  templateUrl: './purchase-req-management.component.html',
  styleUrl: './purchase-req-management.component.scss'
})
export class PurchaseReqManagementComponent {
purchaseReqList: any[] = [];
searchTerm: any;
  activeItem: any = {}
  isEdit!: boolean;
  isCreate!: boolean;
purchaseReqTable: boolean = true;
purchaseReqForm: boolean = false;
  isView: boolean = false;
filters: any = {}

  goToCreatePR() {
  
}

clearFilters() {
  this.filters = {};
}



    search() {
    throw new Error('Method not implemented.');
  }

    openForm() {
    this.purchaseReqTable = false
    this.purchaseReqForm = true
    this.isCreate = true
    this.isEdit = false; 
    this.isView = false;

    // this.getRfqList();
  }

  close() {
    this.purchaseReqTable = true
    this.purchaseReqForm = false
    this.activeItem = {}; 
    // this.getRfqList();
  }
}
