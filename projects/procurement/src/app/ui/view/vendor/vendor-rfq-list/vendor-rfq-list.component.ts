import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { OverlayPanel } from 'primeng/overlaypanel';
import { NavigationLinksService } from '../../../sharedComponent/service/navigation-links/navigation-links.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-vendor-rfq-list',
  templateUrl: './vendor-rfq-list.component.html',
  styleUrl: './vendor-rfq-list.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class VendorRfqListComponent {
  activeItem: any = {}
  isEdit!: boolean;
  isCreate!: boolean;
  searchTerm: any;
  rfqList: any[] = [];
  rfqTable: boolean = true;
  rfqForm: boolean = false;
  isView: boolean = false;

  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ){
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.getRfqList();
    
    
  }

  getStatusClass(stage: string) {
    switch (stage) {
      case 'Pending':
        return 'badge badge-lightgrey';
      case 'Converted':
        return 'badge badge-lightblue';
      case 'Sent':
        return 'badge badge-lightgreen';
      default:
        return '';
    }
  }

  getRfqList(){
    // Retrieve the 'rfqDataList' from localStorage
    const storedData = localStorage.getItem('rfqDataArray');
    console.log('this is stored data')


    // Check if data exists in localStorage and parse it into an array
    if (storedData) {
      this.rfqList = JSON.parse(storedData).reverse();
    }
  }

  convertToQuotation(item: any) {
    console.log("rfq info", item)
    this.activeItem = { ...item };
    this.isEdit = true; 
    this.isView = false;
    this.isCreate = false
    this.rfqTable = false;
    this.rfqForm = true

    this.getRfqList();

  }
  viewRfq(item: any){
    console.log("rfq info", item)
    this.activeItem = { ...item };
    this.isView = true; 
    this.rfqTable = false
    this.isCreate = false
    this.rfqForm = true
    
    this.getRfqList();
  }
  deleteRfq(id: number) {
    // Filter out the RFQ with the given id
    this.rfqList = this.rfqList.filter((item: any) => item.id !== id);
  
    // Update localStorage with the new rfqList
    localStorage.setItem('rfqDataArray', JSON.stringify(this.rfqList));
  
    // Reload the list (optional if getRfqList is used elsewhere)
    this.getRfqList();
  }
  search() {
    throw new Error('Method not implemented.');
  }
  openForm() {
    this.rfqTable = false
    this.rfqForm = true
    this.isCreate = true
    this.isEdit = false; 
    this.isView = false;

    this.getRfqList();
  }

  close() {
    this.rfqTable = true
    this.rfqForm = false
    this.activeItem = {}; 

    this.getRfqList();
  }

}
