import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { QuotationStage } from '../../../domain/procurement.dto';

@Component({
  selector: 'app-vendor-quote-list',
  templateUrl: './vendor-quote-list.component.html',
  styleUrl: './vendor-quote-list.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class VendorQuoteListComponent {
  activeItem: any = {}
  isEdit!: boolean;
  isCreate!: boolean;
  searchTerm: any;
  quoteList: any[] = [];
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
    this.getQuoteList();
    
    
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

  getQuoteList() {
    // Retrieve the 'QuoteDataArray' from localStorage
    const storedData = localStorage.getItem('QuoteDataArray');
  
    console.log('This is stored data:', storedData);
  
    // Check if data exists in localStorage and parse it into an array
    if (storedData) {
      // Parse the data and reverse the array
      this.quoteList = JSON.parse(storedData)
        .map((quote: any) => {
          // Check if the stage is 'Converted' and change it to 'Pending'
          if (quote.stage === QuotationStage.Converted) {
            quote.stage = QuotationStage.Pending;
          }
          return quote;
        })
        .reverse();
    }
  }
  

  convertToQuotation(SelectedItem: any) {
    console.log("rfq info", SelectedItem)
    this.activeItem = { ...SelectedItem };
    this.isEdit = true; 
    this.isView = false;
    this.isCreate = false
    this.rfqTable = false;
    this.rfqForm = true

    this.getQuoteList();

  }
  sendQuotation(SelectedItem: any){

  }
  viewRfq(SelectedItem: any){
    console.log("rfq info", SelectedItem)
    this.activeItem = { ...SelectedItem };
    this.isView = true; 
    this.rfqTable = false
    this.isCreate = false
    this.rfqForm = true
    
    this.getQuoteList();
  }
  deleteRfq(id: number) {
    // Filter out the RFQ with the given id
    this.quoteList = this.quoteList.filter((item: any) => item.id !== id);
  
    // Update localStorage with the new rfqList
    localStorage.setItem('rfqDataArray', JSON.stringify(this.quoteList));
  
    // Reload the list (optional if getQuoteList is used elsewhere)
    this.getQuoteList();
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

    this.getQuoteList();
  }

  close() {
    this.rfqTable = true
    this.rfqForm = false
    this.activeItem = {}; 

    this.getQuoteList();
  }
}
