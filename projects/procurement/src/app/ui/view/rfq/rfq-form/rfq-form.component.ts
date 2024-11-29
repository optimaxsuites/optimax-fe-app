import { HttpRequest, HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, Renderer2,} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AddressDTO, AttachmentDTO, BanksDTO, CompanyDTO, CustomerDTO, DiscountAndChargesDTO, FieldDTO, IndustryDTO, ItemDTO, ProjectDTO, QuotationDTO, ShippingDTO } from '../../../domain/quotation.dto';
import { QuotationService } from '../../../service/quotation.service';
import { NavigationLinksService } from '../../../sharedComponent/service/navigation-links/navigation-links.service';
import { RandomTokenService } from '../../../sharedComponent/service/random-token/random-token.service';
import { QuotationStage } from '../../../domain/procurement.dto';
// import { map } from 'rxjs/operators';
// import { MatDialog } from '@angular/material/dialog';


interface Term {
  term_des: string;
}

interface TermGroup {
  terms: Term[];
}

@Component({
  selector: 'app-rfq-form',
  templateUrl: './rfq-form.component.html',
  styleUrl: './rfq-form.component.scss',
})
export class RfqFormComponent implements OnInit {

  showSecondComponent = false;
  showSignatureButton: boolean = false;
  showTermsCondition: boolean = false;
  showAmountWord = false;
  showNotes: boolean = false;
  showAttachments: boolean = false;
  showDiscount = false;
  showAdditionalCharges = false;
  showLogo = false;
  selectedValue?: string;
  showDescriptionBox: boolean = false;
  isFormVisible: boolean = false;
  signatureUrl: string | ArrayBuffer | null = null;
  logoUrl: string | ArrayBuffer | null = null;
  discounts: any[] = [];
  terms: any[] = [];
  
  charges: any[] = [];
  moreFields: any[] = [];
  // isEdit: boolean = false
  itemsData: ItemDTO[] = [ ];
  industryData: IndustryDTO[] = [];
  discountChargesData: DiscountAndChargesDTO[] = [];
  bankData: BanksDTO[] = [];
  addressData: AddressDTO[] = [];
  shippingData: any = {};
  projectData: ProjectDTO = {};
  // customerData: CustomerDTO = {};
  vendorData: any = {}
  companyData: CompanyDTO = {};
  
  openAddItem: boolean = false;

  @Input() isCreate? : boolean;
  @Input() isRfq? : boolean;
  @Input() isQuote? : boolean;
  @Output() submitFrom = new EventEmitter<any>();
  @Input() rfqData: any = {
    discounts: [],
    charges: [],
    vendor: [] = [],
    termsGroup: [] = [ this.terms],
    attachments: [] as AttachmentDTO[]
  };
  @Input() isEdit!: boolean; 
  @Input() isView!: boolean; 
  idCounter: number = 1;
showCreate: boolean = true;
showViewing: boolean = false;

  constructor(
    private renderer: Renderer2, 
    private el: ElementRef,
    private http: HttpClient,
    private dialogRef:MatDialog,
    private quotationService: QuotationService,
    private navigationLink: NavigationLinksService,
    private router: Router,
    private route: ActivatedRoute,
    private randomToken: RandomTokenService
  ) { }

  @Output() back = new EventEmitter<void>();

  resetState() {
    this.showCreate = true;
    this.showViewing = false;
    this.showTermsCondition = false;
    this.showNotes = false;
    this.showAttachments = false;
    this.isEdit = false;
    this.isCreate = false;
    this.isFormVisible = false;
  }

  goBack() {
    this.back.emit();
    this.resetState()
  }
  get hasSerialNo(): boolean {
    return this.rfqData.items?.some((item: { serialNo: any; }) => item.serialNo) ?? false;

  }
  // selectedItem: any = null;
  // isItemEdit = false;

  // onItemEdited(event: { item: any }) {
  //   const { item } = event;
  //   this.rfqData.items = item; // Update the specific item in the array
  //   this.rfqData.items = [...this.rfqData.items]; // Trigger change detection
  // }

  // onItemAdded(item: any) {
  //   console.log('Emitted item:', item); // Confirm emitted item
  //   if (!this.rfqData.items) {
  //     this.rfqData.items = []; // Initialize if undefined
  //   }
  //   this.rfqData.items = [...this.rfqData.items, item]; // Spread syntax to ensure immutability
  //   console.log('Updated rfqData.items:', this.rfqData.items); // Confirm updated array
  // }

  // editItem(item: any) {
  //   this.openAddItem = true
  //   this.selectedItem = { ...item }; // Copy item to edit
  //   this.isItemEdit = true;
  // }

  // deleteItem(item: any) {
  //   this.rfqData.items = this.rfqData.items.filter((i: any) => i !== item);
  // }

  // resetEditState() {
  //   this.selectedItem = null;
  //   this.isItemEdit = false;
  // }

  selectedItem: any = null;
isItemEdit = false;

onItemEdited(event: { item: any }) {
  const { item } = event;
  const index = this.rfqData.items.findIndex((i: any) => i.id === item.id);
  if (index !== -1) {
    this.rfqData.items[index] = item; // Update specific item
    this.rfqData.items = [...this.rfqData.items]; // Trigger change detection
  }
  this.resetEditState();
  this.calculateTotal();
}

onItemAdded(item: any) {
  console.log(item)
  if (!this.rfqData.items) {
    this.rfqData.items = []; // Initialize if undefined
  }
  this.rfqData.items = [...this.rfqData.items, item];
  this.calculateTotal();
}

close() {
  this.openAddItem= false
  this.selectedItem = {}; 
}

editItem(item: any) {
  this.openAddItem = true;
  this.selectedItem = { ...item }; // Copy item to avoid mutation
  this.isItemEdit = true;
}

deleteItem(item: any) {
  this.rfqData.items = this.rfqData.items.filter((i: any) => i.id !== item.id);
  this.calculateTotal();
}

resetEditState() {
  this.selectedItem = null;
  this.isItemEdit = false;
  this.openAddItem = false;
}

// ===================================================================================
  ngOnInit(): void {
    this.rfqData.id = this.rfqData.id || this.randomToken.getRandomToken();
    this.rfqData.rfqNo = this.rfqData.rfqNo || `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.rfqData.date = this.rfqData.date || new Date().toISOString().split('T')[0];
    this.getCompanyInfo();
    this.loadVendors();

    console.log("is rfq = ",this.isRfq)
    console.log("is quote = ",this.isQuote)

    if (this.isEdit) {
      this.showViewing = false;
      this.showTermsCondition = true;
      this.showNotes = true;
      this.showAttachments = true;
    } 
    
    if (this.isCreate) {
      this.showViewing = false;
      this.showTermsCondition = false;
      this.showNotes = false;
      this.showAttachments = false;
    }


    if(this.isView){
      this.showCreate = false
      this.showViewing = true
      this.showTermsCondition = true;
      this.showNotes = true;
      this.showAttachments = true
      this.isFormVisible = true;
      this.showAmountWord = true;
      this.showSignatureButton = true
    }
    // this.resetState()


  }
// ===================================================================================
  companyOptions: { name: string }[] = [];
  selectedCompanyId!: number;

  getCompanyInfo(){
    this.quotationService.getCompany('').subscribe((data: CompanyDTO[]) => {
      this.companyOptions = data.map(company => ({ name: company.name! }));
    });
  }

  onCompanyChange(companyId: number): void {
    if (companyId) {
      this.quotationService.getCompanyById(companyId).subscribe((company: CompanyDTO) => {
        this.companyData = company;
      });
    } else {
      this.companyData = {};
    }
  }
// ================================================================================
    // customerOptions: CustomerDTO[] = [];
    vendorList: any[] = [
      {id: 1, name: "Adereal"},
      {id: 2, name: "GOP"},
      {id: 3, name: "DeONe"},
      {id: 4, name: "FAST Lane"}
    ]
    selectedVendorId!: number;

  loadVendors() {
    this.quotationService.getCustomer().subscribe(vendors => {
      this.vendorList = vendors;
      console.log("options", this.vendorList)
    });
  }

  onVendorChange(selectedVendorId: number) {
    this.selectedVendorId = selectedVendorId; // Set the selected customer ID

    if(selectedVendorId){
      console.log("Selected Vendor ID:", selectedVendorId);
    }
  
    // if (selectedVendorId) {
    //   this.quotationService.getCustomerById(selectedVendorId).subscribe(vendor => {
    //     this.vendorData = vendor;
    //     this.showSecondComponent = true; // Show customer details section
    //   });
    // } else {
    //   this.vendorData = {};
    //   this.showSecondComponent = false; // Hide customer details section if no customer is selected
    // }
  }
 
  // ====================================================================================

  // items = [
  //   { id: 1, name: 'Ladies shoes 1', serialNo: 5, qty: 10 },
  //   { id: 2, name: 'Item 2', serialNo: 10, qty: 20 },
  //   { id: 3, name: 'Item 3', serialNo: 8, qty: 15 },
  //   { id: 4, name: 'Item 4', serialNo: 12, qty: 25 },
  //   { id: 5, name: 'Item 5', serialNo: 7, qty: 30 },
  //   { id: 6, name: 'Item 6', serialNo: 6, qty: 18 },
  //   { id: 7, name: 'Item 7', serialNo: 9, qty: 12 },
  //   { id: 8, name: 'Item 8', serialNo: 11, qty: 22 },
  //   { id: 9, name: 'Item 9', serialNo: 10, qty: 8 },
  //   { id: 10, name: 'Item 10', serialNo: 4, qty: 50 }
  // ];

// SHIPPING DETAILS TOGGLE==================================================================================

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
    this.isRfq = false;
    this.isQuote = true;
  }

// SUBMIT QUOTATION ACTION============================================================================

// onSubmit() {
//   console.log("quotation into", this.rfqData);

//   // Retrieve existing data from localStorage
//   const storedData = JSON.parse(localStorage.getItem('rfqDataArray') || '[]');
//   // this.rfqData.id = this.idCounter++
//   // Add the current rfqData to the array
//   storedData.push({...this.rfqData, id: this.idCounter++});

//   // Save the updated array back to localStorage
//   localStorage.setItem('rfqDataArray', JSON.stringify(storedData));

//   console.log("Data saved to localStorage:", storedData);
// }
// onSubmit() {
//   console.log("Form data:", this.rfqData);
//   const storedData: any[] = JSON.parse(localStorage.getItem('rfqDataArray') || '[]');

//   const storedQuoteData: any[] = JSON.parse(localStorage.getItem('QuoteDataArray') || '[]');



//   if(this.isRfq){

//     if (this.isEdit) {
//       // Find the index of the existing entry by ID and update it
//       const index = storedData.findIndex(item => item.id === this.rfqData.id);
//       if (index !== -1) {
//         storedData[index] = { ...this.rfqData };
//         console.log("Data updated in localStorage:", storedData);
//       } else {
//         console.error("Edit failed: Entry not found for RFQ.");
//       }
//     } else {
//       // Assign a new ID and add the data
//       // this.rfqData.id = this.idCounter++;
//       storedData.push({ ...this.rfqData });
//       console.log("Data added to localStorage:", this.rfqData);
//     }
  
//     localStorage.setItem('rfqDataArray', JSON.stringify(storedData));

//   }

//   if(this.isQuote){

//     if (this.isEdit) {
//       const index = storedQuoteData.findIndex(item => item.id === this.rfqData.id);
//       if (index !== -1) {
//         storedQuoteData.push({ ...this.rfqData });
//         console.log("Data updated in localStorage:", storedQuoteData);
//       } else {
//         console.error("Edit failed: Entry not found for Quotation.");
//       }
//     }
  
//     localStorage.setItem('QuoteDataArray', JSON.stringify(storedQuoteData));

//   }



//   this.goBack();
// }

// onSubmit() {
//   console.log("Form data:", this.rfqData);

//   const storedData: any[] = JSON.parse(localStorage.getItem('rfqDataArray') || '[]');
//   const storedQuoteData: any[] = JSON.parse(localStorage.getItem('QuoteDataArray') || '[]');

//   if (this.isRfq) {
//     if (this.isEdit) {
//       const index = storedData.findIndex(item => item.id === this.rfqData.id);
//       if (index !== -1) {
//         storedData[index] = { ...this.rfqData };
//         console.log("Data updated in rfqDataArray localStorage:", storedData);
//       } else {
//         console.error("Edit failed: Entry not found for RFQ.");
//       }
//     } else {
//       const createRfq: any = {
//         ...storedData
//       }
//       storedData.push({ ...this.rfqData, ...this.rfqData.status: QuotationStage.Completed });
//       console.log("Data added to rfqDataArray in localStorage:", this.rfqData);
//     }

//     localStorage.setItem('rfqDataArray', JSON.stringify(storedData));
//   }

//   if (this.isQuote) {
//     // Find the entry in storedData by id
//     const existingEntry = storedData.find(item => item.id === this.rfqData.id);

//     if (existingEntry) {
//       // Update the entry and save it to storedQuoteData
//       const updatedEntry = { ...existingEntry, ...this.rfqData }; // Merge updates
//       const quoteIndex = storedQuoteData.findIndex(item => item.id === updatedEntry.id);

//       if (quoteIndex !== -1) {
//         storedQuoteData[quoteIndex] = updatedEntry; // Update existing entry in QuoteDataArray
//         console.log("Updated entry in QuoteDataArray:", storedQuoteData);
//       } else {
//         storedQuoteData.push(updatedEntry); // Add new entry to QuoteDataArray
//         console.log("Added new entry to QuoteDataArray:", storedQuoteData);
//       }

//       localStorage.setItem('QuoteDataArray', JSON.stringify(storedQuoteData));
//     } else {
//       console.error("Save failed: Entry not found in rfqDataArray.");
//     }
//   }

//   this.goBack();
// }

onSubmit() {
  console.log("Shipping Form data:", this.shippingData);

  const storedData: any[] = JSON.parse(localStorage.getItem('rfqDataArray') || '[]');
  const storedQuoteData: any[] = JSON.parse(localStorage.getItem('QuoteDataArray') || '[]');

  if (this.isRfq) {
    if (this.isEdit) {
      // Editing an RFQ
      const index = storedData.findIndex(item => item.id === this.rfqData.id);
      if (index !== -1) {
        storedData[index] = { ...this.rfqData };
        console.log("Data updated in rfqDataArray localStorage:", storedData);
      } else {
        console.error("Edit failed: Entry not found for RFQ.");
      }
    } else {
      // Creating a new RFQ
      const newRfq = { ...this.rfqData, stage: QuotationStage.Pending }; // Set stage to pending
      storedData.push(newRfq);
      console.log("Data added to rfqDataArray in localStorage:", newRfq);
    }

    localStorage.setItem('rfqDataArray', JSON.stringify(storedData));
  }

  if (this.isQuote) {
    // Converting an RFQ to a quotation
    const existingEntryIndex = storedData.findIndex(item => item.id === this.rfqData.id);
  
    if (existingEntryIndex !== -1) {
      // Update the stage in storedData
      storedData[existingEntryIndex].stage = QuotationStage.Converted; // Update only the stage
      localStorage.setItem('rfqDataArray', JSON.stringify(storedData));
      console.log("Stage updated to 'converted' in rfqDataArray:", storedData);
  
      // Save the updated RFQ to QuoteDataArray
      const updatedEntry = { ...storedData[existingEntryIndex], ...this.rfqData, stage: QuotationStage.Converted, shippingInfo: this.shippingData }; // Merge with rfqData
      const quoteIndex = storedQuoteData.findIndex(item => item.id === updatedEntry.id);
  
      if (quoteIndex !== -1) {
        storedQuoteData[quoteIndex] = updatedEntry; // Update existing entry in QuoteDataArray
        console.log("Updated entry in QuoteDataArray:", storedQuoteData);
      } else {
        storedQuoteData.push(updatedEntry); // Add new entry to QuoteDataArray
        console.log("Added new entry to QuoteDataArray:", storedQuoteData);
      }
  
      localStorage.setItem('QuoteDataArray', JSON.stringify(storedQuoteData));
    } else {
      console.error("Save failed: Entry not found in rfqDataArray.");
    }
  }
  

  this.goBack();
}





// NAVIGATE TO TABLE====================================================================================
navigateToTable() {
  const salesLink = this.navigationLink.getLink('salesLink')
  this.router.navigate([salesLink]);
  
}

// ADDITIONAL FIELDS=======================================================================================

addField() {
  if(!this.rfqData.field){
    this.rfqData.field = []
  }
  this.rfqData.field.push({})
}

removeField(index: number) {
  if (this.rfqData.field && index >= 0 && index < this.rfqData.field.length) {
    this.rfqData.field.splice(index, 1);
  }
}

// TERMS AND CONDITION=================================================================================
cancelTermsCondition(){
  this.showTermsCondition = false;
  this.rfqData.terms = ''; 
}

// NOTE==================================================================================================
  cancelNotes() {
    this.showNotes = false;
    this.rfqData.quotationNote = ''; 
  }

  // ATTACHMENT============================================================================================

  cancelAttachement() {
    this.showAttachments = false;
    this.rfqData.quotationNote = ''; 
  }

// DISCOUNT==================================================================================================

//   addDiscount() {
//     this.discounts.push({});
//   }

//   removeDiscount(index: number) {
//     this.discounts.splice(index, 1);
//   }

// // CHARGES=================================================================================================

//   addCharge() {
//     this.charges.push({});
//   }

//   removeCharge(index: number) {
//     this.charges.splice(index, 1);
//   }

  // totalAmount: number = 0;
  // totalAmountInWords: string = '';
  // totalTax: number = 0;
  // grandTotal: number = 0;


  // onInputChange(item: any): void {
  //   item.amount = item.quantity * item.rate;
  //   item.tax = (item.taxRate / 100) * item.amount;
  //   item.total = item.amount + item.tax;

  //   this.calculateTotal();
  // }

  // calculateTotal(): void {
  //   this.totalAmountInWords = this.numberToWords(this.grandTotal);

  //   this.totalAmount = this.rfqData.items.reduce((sum: any, item: { amount: any; }) => sum + item.amount!, 0);
  //   this.totalTax = this.rfqData.items.reduce((sum: any, item: { tax: any; }) => sum + item.tax!, 0);
  //   this.grandTotal = this.rfqData.items.reduce((sum: any, item: { total: any; }) => sum + item.total!, 0);
  // }

  // This method will be called on discount/charge value change
// onDiscountChange(): void {
//   this.calculateTotal();  // Recalculate total after a discount value change
// }

// onChargeChange(): void {
//   this.calculateTotal();  // Recalculate total after a charge value change
// }

//   addDiscount(): void {
//     this.rfqData.discounts.push({ value: 0 });
//     console.log(this.rfqData.discounts)
//     this.calculateTotal();  // Recalculate after adding a discount
//   }
  
//   removeDiscount(index: number): void {
//     this.rfqData.discounts.splice(index, 1);
//     this.calculateTotal();  // Recalculate after removing a discount
//   }
  
//   addCharge(): void {
//     this.rfqData.charges.push({ value: 0 });
//     this.calculateTotal();  // Recalculate after adding a charge
//   }
  
//   removeCharge(index: number): void {
//     this.rfqData.charges.splice(index, 1);
//     this.calculateTotal();  // Recalculate after removing a charge
//   }

//   calculateTotal(): void {
//     // Convert the grand total to words
//     this.rfqData.totalAmountInWords = this.numberToWords(this.grandTotal);
  
//     // Calculate the total amount by summing the 'amount' of each item
//     this.rfqData.totalAmount = this.rfqData.items.reduce((sum: any, item: { amount: any; }) => sum + item.amount!, 0);

//     // Calculate the total tax by summing the 'tax' of each item
//     this.rfqData.totalTax = this.rfqData.items.reduce((sum: any, item: { tax: any; }) => sum + item.tax!, 0);
  
//     // Calculate the grand total by summing the 'total' of each item
//     this.rfqData.grandTotal = this.rfqData.items.reduce((sum: any, item: { total: any; }) => sum + item.total!, 0);

//     // Calculate the total discount and subtract from grand total
//     this.rfqData.totalDiscount = this.rfqData.discounts.reduce((sum: any, discount: { value: any; }) => sum + discount.value, 0);
//     this.rfqData.grandTotal -= this.rfqData.totalDiscount;

//     // Calculate the total additional charges and add to grand total
//     this.rfqData.totalCharges = this.rfqData.charges.reduce((sum: any, charge: { value: any; }) => sum + charge.value, 0);
//     this.rfqData.grandTotal += this.rfqData.totalDiscount;
//   }

//   convertToWords(grandTotal: number): void {
//     const [naira, kobo] = grandTotal.toString().split('.');  // Split the total into naira and kobo parts
//     this.rfqData.totalAmountInWords = this.numberToWords(Number(naira)) + ' naira';
  
//     // If there is a decimal part (kobo)
//     if (kobo) {
//       const koboAmount = Number(kobo.slice());  // Take only the first two digits as kobo
//       if (koboAmount > 0) {
//         this.totalAmountInWords += ' ' + this.numberToWords(koboAmount) + ' kobo';
//       }
//     }
  
//     this.totalAmountInWords += ' only';  // Append 'only' at the end
//   }

onDiscountChange(): void {
  this.calculateTotal();
  this.convertToWords(this.rfqData.grandTotal)
}

onChargeChange(): void {
  this.calculateTotal();
  this.convertToWords(this.rfqData.grandTotal)
}

addDiscount(): void {
  if (!this.rfqData.discounts) {
    this.rfqData.discounts = []; // Ensure the array is defined
  }
  this.rfqData.discounts.push({ value: 0 });
  console.log(this.rfqData.discounts);
  this.calculateTotal(); // Recalculate after adding a discount
  this.convertToWords(this.rfqData.grandTotal)
}

removeDiscount(index: number): void {
  if (this.rfqData.discounts && this.rfqData.discounts.length > index) {
    this.rfqData.discounts.splice(index, 1);
    this.calculateTotal(); // Recalculate after removing a discount
  }
  this.convertToWords(this.rfqData.grandTotal)
}

addCharge(): void {
  if (!this.rfqData.charges) {
    this.rfqData.charges = []; // Ensure the array is defined
  }
  this.rfqData.charges.push({ value: 0 });
  console.log(this.rfqData.charges);
  this.calculateTotal(); // Recalculate after adding a charge
  this.convertToWords(this.rfqData.grandTotal)
}

removeCharge(index: number): void {
  if (this.rfqData.charges && this.rfqData.charges.length > index) {
    this.rfqData.charges.splice(index, 1);
    this.calculateTotal(); // Recalculate after removing a charge
  }
  this.convertToWords(this.rfqData.grandTotal)
}


calculateTotal(): void {
  this.rfqData.totalAmount = this.rfqData.items.reduce((sum: any, item: { amount: any; }) => sum + (item.amount || 0), 0);
  this.rfqData.totalTax = this.rfqData.items.reduce((sum: any, item: { tax: any; }) => sum + (item.tax || 0), 0);
  this.rfqData.grandTotal = this.rfqData.items.reduce((sum: any, item: { total: any; }) => sum + (item.total || 0), 0);

  // Subtract total discounts
  this.rfqData.totalDiscount = this.rfqData.discounts.reduce((sum: any, discount: { value: any; }) => sum + (discount.value || 0), 0);
  this.rfqData.grandTotal -= this.rfqData.totalDiscount;

  // Add total charges
  this.rfqData.totalCharges = this.rfqData.charges.reduce((sum: any, charge: { value: any; }) => sum + (charge.value || 0), 0);
  this.rfqData.grandTotal += this.rfqData.totalCharges;

  // Convert grand total to words
  this.convertToWords(this.rfqData.grandTotal);
}
showAmountInWord(){
  this.showAmountWord = true;
  this.convertToWords(this.rfqData.grandTotal)
}
convertToWords(grandTotal: number) {
  const [naira, kobo] = grandTotal.toFixed(2).split('.');
  this.rfqData.totalAmountInWords = this.numberToWords(Number(naira)) + ' naira';
  if (kobo && Number(kobo) > 0) {
    this.rfqData.totalAmountInWords += ' ' + this.numberToWords(Number(kobo)) + ' kobo';
  }
  this.rfqData.totalAmountInWords += ' only';

  // return this.rfqData.totalAmountInWords

}

// get amountInWords(): string {
//   return this.convertToWords(this.rfqData.grandTotal || 0);
// }
  
  numberToWords(num: number): string {
    if (num === 0) return "zero";
  
    const belowTwenty = [
      "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
      "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
      "seventeen", "eighteen", "nineteen"
    ];
  
    const tens = [
      "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"
    ];
  
    const thousands = ["", "thousand", "million", "billion", "trillion"];
  
    function helper(n: number): string {
      if (n === 0) return "";
      if (n < 20) return belowTwenty[n] + " ";
      if (n < 100) return tens[Math.floor(n / 10)] + " " + helper(n % 10);
      // Adding 'and' when we have hundreds
      return belowTwenty[Math.floor(n / 100)] + " hundred " + (n % 100 > 0 ? "and " : "") + helper(n % 100);
    }
  
    let word = "";
    let index = 0;
  
    while (num > 0) {
      if (num % 1000 !== 0) {
        word = helper(num % 1000) + thousands[index] + " " + word;
      }
      num = Math.floor(num / 1000);
      index++;
    }
  
    return word.trim();
  }
  
  

  // convertToWords(grandTotal: number): void {
  //   this.totalAmountInWords = this.numberToWords(grandTotal)+ ' naira only';
  // }

  // numberToWords(num: number): string {
  //   if (num === 0) return "zero";
  
  //   const belowTwenty = [
  //     "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  //     "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  //     "seventeen", "eighteen", "nineteen"
  //   ];
  
  //   const tens = [
  //     "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"
  //   ];
  
  //   const thousands = ["", "thousand", "million", "billion", "trillion"];
  
  //   function helper(n: number): string {
  //     if (n === 0) return "";
  //     if (n < 20) return belowTwenty[n] + " ";
  //     if (n < 100) return tens[Math.floor(n / 10)] + " " + helper(n % 10);
  //     return belowTwenty[Math.floor(n / 100)] + " hundred " + helper(n % 100);
  //   }
  
  //   let word = "";
  //   let index = 0;
  
  //   while (num > 0) {
  //     if (num % 1000 !== 0) {
  //       word = helper(num % 1000) + thousands[index] + " " + word;
  //     }
  //     num = Math.floor(num / 1000);
  //     index++;
  //   }
  
  //   return word.trim();
  // }
  

  // convertNumberToWords(amount: number): string {
  //   const ones = [
  //     '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'
  //   ];
  //   const teens = [
  //     'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
  //   ];
  //   const tens = [
  //     '', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
  //   ];
  //   const thousands = [
  //     '', 'thousand', 'million', 'billion', 'trillion'
  //   ];

  //   if (amount === 0) return 'zero';

  //   let words = '';

  //   const numToWords = (num: number, index: number): string => {
  //     if (num === 0) return '';
  //     let str = '';
  //     if (num > 99) {
  //       str += ones[Math.floor(num / 100)] + ' hundred ';
  //       num %= 100;
  //     }
  //     if (num > 10 && num < 20) {
  //       str += teens[num - 11] + ' ';
  //     } else {
  //       str += tens[Math.floor(num / 10)] + ' ';
  //       num %= 10;
  //       str += ones[num] + ' ';
  //     }
  //     return str.trim() + ' ' + thousands[index] + ' ';
  //   };

  //   let index = 0;
  //   while (amount > 0) {
  //     const chunk = amount % 1000;
  //     if (chunk > 0) {
  //       words = numToWords(chunk, index) + words;
  //     }
  //     amount = Math.floor(amount / 1000);
  //     index++;
  //   }

  //   return words.trim();
  // }

  calculateAmount(item: any): void {
    const quantity = parseFloat(item.quantity);
    const rate = parseFloat(item.rate);
    item.amount = (quantity * rate);
  }


  deleteRow(index: number) {
      this.itemsData.splice(index, 1);
  }

  addNewRow(): void {
    this.itemsData.push();
  }

  toggleSecondComponent() {
    this.showSecondComponent = !this.showSecondComponent;
  }

  showDesBox() {
    this.showDescriptionBox = true;
  }

  
  onSignatureSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.signatureUrl = reader.result;
      };
    }
  }

  clearSignature() {
    this.signatureUrl = null;
    this.showSignatureButton = false; 
  }


  onLogoSelected(event: any) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.logoUrl = reader.result;
      this.showLogo = true;
    };
    reader.readAsDataURL(file);
  }

  clearLogo() {
    this.logoUrl = null;
    this.showLogo = false;
  }


  fileInputChange(event: any) {
    const files = event.target.files;

    if (!this.rfqData.attachments) {
      this.rfqData.attachments = [];
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const attachment: AttachmentDTO = {
        name: file.name,
        size: file.size,
        type: file.type.includes('image') ? 'image' : 'document',
        url: '', // URL will be set after upload
        progress: 0,
        status: 'uploading',
      };

      this.rfqData.attachments.push(attachment); // Add attachment to the array
      this.uploadFile(file, attachment);
    }

    // Debugging log to ensure attachments are added
    console.log('Attachments after change:', this.rfqData.attachments);
  }

  uploadFile(file: File, attachment: AttachmentDTO) {
    const uploadSimulation = setInterval(() => {
      if (attachment.progress >= 100) {
        attachment.status = 'completed';
        attachment.url = `https://example.com/uploads/${attachment.name}`; // Simulated URL
        clearInterval(uploadSimulation);
      } else {
        attachment.progress += 10; // Simulate upload progress
      }
    }, 200); // Simulate every 200ms
  }

  cancelUpload(index: number) {
    if (index >= 0 && index < this.rfqData.attachments.length) {
      this.rfqData.attachments.splice(index, 1);
    }

    // Debugging log to confirm removal
    console.log('Attachments after cancel:', this.rfqData.attachments);
  }
}



