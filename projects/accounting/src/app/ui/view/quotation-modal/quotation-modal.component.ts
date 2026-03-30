import { HttpRequest, HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnInit, Renderer2,} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AddNewClientComponent } from '../add-new-client/add-new-client.component';

import { ActivatedRoute, Router } from '@angular/router';
import { QuotationService } from '../../service/quotation/quotation.service';
import { AddressDTO, AttachmentDTO, BanksDTO, CompanyDTO, CustomerDTO, DiscountAndChargesDTO, FieldDTO, IndustryDTO, ItemsDTO, ProjectDTO, QuotationDTO, ShippingDTO } from '../../domain/quotation.dto';
import { DropdownService } from '../../sharedComponent/service/dropdown/dropdown.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
// import { map } from 'rxjs/operators';
// import { MatDialog } from '@angular/material/dialog';


interface Term {
  term_des: string;
}

interface TermGroup {
  terms: Term[];
}

@Component({
  selector: 'app-quotation-modal',
  templateUrl: './quotation-modal.component.html',
  styleUrl: './quotation-modal.component.scss',
})
export class QuotationModalComponent implements OnInit {

  showSecondComponent = false;
  showSignatureButton: boolean = false;
  showTermsConditionButton = false;
  showAmountWord = false;
  showNotes = false;
  showAttachments = false;
  showDiscount = false;
  showAdditionalCharges = false;
  showLogo = false;
  openAddClient?: boolean;
  openAddShipping?: boolean;
  openAddItem?: boolean;
  selectedValue?: string;
  showDescriptionBox: boolean = false;
  isFormVisible: boolean = false;
  signatureUrl: string | ArrayBuffer | null = null;
  logoUrl: string | ArrayBuffer | null = null;
  discounts: any[] = [];
  terms: any[] = [];
  termsGroup: any[] = [ this.terms];
  charges: any[] = [];
  moreFields: any[] = [];
  isEdit: boolean = false
  itemsData: ItemsDTO[] = [];
  industryData: IndustryDTO[] = [];
  discountChargesData: DiscountAndChargesDTO[] = [];
  bankData: BanksDTO[] = [];
  addressData: AddressDTO[] = [];
  shippingData: ShippingDTO[] = [];
  quotationData: QuotationDTO = {};
  projectData: ProjectDTO = {};
  customerData: CustomerDTO = {};
  companyData: CompanyDTO = {};

  constructor(
    private renderer: Renderer2, 
    private el: ElementRef,
    private http: HttpClient, 
    private dropdownService: DropdownService, 
    private dialogRef:MatDialog,
    private quotationService: QuotationService,
    private navigationLink: NavigationLinksService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

// ===================================================================================
  ngOnInit(): void {
    this.addTerm();
    this.getCompanyInfo();
    this.loadCustomers();

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
  // companyOptions: CustomerDT[];
  // selectedCustomerId!: number;

  // getCustomerInfo(){
  //   this.quotationService.getCustomer().subscribe((data: CustomerDTO[]) => {
  //     this.customerOptions = data.map(customer => ({ id: customer.id!, name: customer.name! }));
  //   });
  // }

  // loadCompanyOptions(): void {
  //   // Assuming this.yourService.getCompanies() returns an array of { id: number, name: string }
  //   this.quotationService.getCustomer().subscribe((data) => {
  //     companyOptions = data;
  //   });
  // }

  // getCustomerInfo() {
  //   this.quotationService.getCustomer('').subscribe((data: CustomerDTO[]) => {
  //     this.customerOptions = data.map(customer => ({ id: customer.id!, name: `${customer.firstname} ${customer.lastname}` }));
  //   });
  // }

  // onCustomerChange(customerId: number): void {
  //   if (customerId) {
  //     this.quotationService.getCustomerById(customerId).subscribe((customer: CustomerDTO) => {
  //       this.customerData = customer;
  //       this.showSecondComponent = true;
  //     });
  //   } else {
  //     this.customerData = {};
  //     this.showSecondComponent = false;
  //   }
  // }

    customerOptions: CustomerDTO[] = [];
    selectedCustomerId!: number;

  loadCustomers() {
    this.quotationService.getCustomer().subscribe(customers => {
      this.customerOptions = customers;
      console.log("options", this.customerOptions)
    });
  }

  onCustomerChange(selectedCustomerId: number) {
    this.selectedCustomerId = selectedCustomerId; // Set the selected customer ID
    console.log("Selected Customer ID:", selectedCustomerId);
  
    if (selectedCustomerId) {
      this.quotationService.getCustomerById(selectedCustomerId).subscribe(customer => {
        this.customerData = customer;
        this.showSecondComponent = true; // Show customer details section
      });
    } else {
      this.customerData = {};
      this.showSecondComponent = false; // Hide customer details section if no customer is selected
    }
  }
  // loadCustomers(): void {
  //   this.quotationService.getCustomer().subscribe(
  //     (data: CustomerDTO[]) => {
  //       this.customerOptions = data;
  //     },
  //     error => {
  //       console.error('Error fetching customer data:', error);
  //     }
  //   );
  // }

  // onCustomerChange(selectedCustomerId: number): void {
  //   this.selectedCustomerId = selectedCustomerId;
  //   this.loadCustomerDetails(selectedCustomerId);
  // }

  // loadCustomerDetails(customerId: number): void {
  //   this.quotationService.getCustomerById(customerId).subscribe(
  //     (data: any) => {
  //       this.customerData = data;
  //       this.showSecondComponent = true;
  //     },
  //     error => {
  //       console.error('Error fetching customer details:', error);
  //     }
  //   );
  // }
  // ====================================================================================

  items = [
    { id: 1, name: 'Ladies shoes 1', taxRate: 5, qty: 10, rate: 100, amount: 1000, tax: 50, total: 1050 },
    { id: 2, name: 'Item 2', taxRate: 10, qty: 20, rate: 150, amount: 3000, tax: 300, total: 3300 },
    { id: 3, name: 'Item 3', taxRate: 8, qty: 15, rate: 200, amount: 3000, tax: 240, total: 3240 },
    { id: 4, name: 'Item 4', taxRate: 12, qty: 25, rate: 50, amount: 1250, tax: 150, total: 1400 },
    { id: 5, name: 'Item 5', taxRate: 7, qty: 30, rate: 75, amount: 2250, tax: 157.5, total: 2407.5 },
    { id: 6, name: 'Item 6', taxRate: 6, qty: 18, rate: 80, amount: 1440, tax: 86.4, total: 1526.4 },
    { id: 7, name: 'Item 7', taxRate: 9, qty: 12, rate: 120, amount: 1440, tax: 129.6, total: 1569.6 },
    { id: 8, name: 'Item 8', taxRate: 11, qty: 22, rate: 90, amount: 1980, tax: 217.8, total: 2197.8 },
    { id: 9, name: 'Item 9', taxRate: 10, qty: 8, rate: 300, amount: 2400, tax: 240, total: 2640 },
    { id: 10, name: 'Item 10', taxRate: 4, qty: 50, rate: 25, amount: 1250, tax: 50, total: 1300 }
  ];

// SHIPPING DETAILS TOGGLE==================================================================================

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
  }

// SUBMIT QUOTATION ACTION============================================================================

  onSubmit(){
    console.log("quotation into", this.quotationData)
  }

// NAVIGATE TO TABLE====================================================================================
navigateToTable() {
  const salesLink = this.navigationLink.getLink('salesLink')
  this.router.navigate([salesLink]);
  
}

// ADDITIONAL FIELDS=======================================================================================

addField() {
  if(!this.quotationData.field){
    this.quotationData.field = []
  }
  this.quotationData.field.push({})
}

removeField(index: number) {
  if (this.quotationData.field && index >= 0 && index < this.quotationData.field.length) {
    this.quotationData.field.splice(index, 1);
  }
}

// TERMS AND CONDITION=================================================================================
  addTerm() {
    this.terms.push({ term_des: '' });
  }

  removeTerm(index: number) {
    this.terms.splice(index, 1);
  }

  addTermGroup() {
    this.terms = [];
    this.termsGroup = [this.terms];
    this.addTerm(); // Add initial term
    this.showTermsConditionButton = true;
  }

  removeTermGroup(index: number) {
    this.termsGroup.splice(index, 1);
    this.showTermsConditionButton = false;
  }

// NOTE==================================================================================================
  cancelNotes() {
    this.showNotes = false;
    this.quotationData.quotationNote = ''; 
  }

  // ATTACHMENT============================================================================================

  cancelAttachement() {
    this.showAttachments = false;
    this.quotationData.quotationNote = ''; 
  }

// DISCOUNT==================================================================================================

  addDiscount() {
    this.discounts.push({});
  }

  removeDiscount(index: number) {
    this.discounts.splice(index, 1);
  }

// CHARGES=================================================================================================

  addCharge() {
    this.charges.push({});
  }

  removeCharge(index: number) {
    this.charges.splice(index, 1);
  }


  // myForm!: FormGroup;
  // options: string[] = ['Nigeria - NGN', 'US Dollar - USD', 'Cuba - CUD'];



// ADD ROW

  // addRow(): void {
  //   this.itemsData.push({});

  //   // Recalculate totals
  //   this.calculateTotal();
  // }

  
  // // name: string = '';
  // taxRate: number = 0;
  // // quantity!: number;
  // // rate?: number;
  // amount: number = 0;
  // tax: number =0;
  // // total: number = 0;
  // // totalAmount?: number;
  // // totalAmountInWords?: string;
  totalAmount: number = 0;
  totalAmountInWords: string = '';
  totalTax: number = 0;
  grandTotal: number = 0;


  onInputChange(item: any): void {

  
    item.amount = item.quantity * item.rate;
    item.tax = (item.taxRate / 100) * item.amount;
    item.total = item.amount + item.tax;

    // Calculate total amount for all items
    this.calculateTotal();

  }

  calculateTotal(): void {
    this.totalAmountInWords = this.convertToWords(this.grandTotal);

    this.totalAmount = this.itemsData.reduce((sum, item) => sum + item.amount!, 0);
    this.totalTax = this.itemsData.reduce((sum, item) => sum + item.tax!, 0);
    this.grandTotal = this.itemsData.reduce((sum, item) => sum + item.total!, 0);
  }

  convertToWords(grandTotal: number): string {
    return this.convertNumberToWords(grandTotal);
  }

  convertNumberToWords(amount: number): string {
    const ones = [
      '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'
    ];
    const teens = [
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'
    ];
    const tens = [
      '', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
    ];
    const thousands = [
      '', 'thousand', 'million', 'billion', 'trillion'
    ];

    if (amount === 0) return 'zero';

    let words = '';

    const numToWords = (num: number, index: number): string => {
      if (num === 0) return '';
      let str = '';
      if (num > 99) {
        str += ones[Math.floor(num / 100)] + ' hundred ';
        num %= 100;
      }
      if (num > 10 && num < 20) {
        str += teens[num - 11] + ' ';
      } else {
        str += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
        str += ones[num] + ' ';
      }
      return str.trim() + ' ' + thousands[index] + ' ';
    };

    let index = 0;
    while (amount > 0) {
      const chunk = amount % 1000;
      if (chunk > 0) {
        words = numToWords(chunk, index) + words;
      }
      amount = Math.floor(amount / 1000);
      index++;
    }

    return words.trim();
  }





  calculateAmount(item: any): void {
    const quantity = parseFloat(item.quantity);
    const rate = parseFloat(item.rate);
    item.amount = (quantity * rate);
  }


  deleteRow(index: number) {
    // if (index > 0) {
      this.itemsData.splice(index, 1);
    // }
  }

  addNewRow(): void {
    // You can add a new empty row here
    this.itemsData.push();
  }

  toggleSecondComponent() {
    this.showSecondComponent = !this.showSecondComponent;
  }

  showDesBox() {
    this.showDescriptionBox = true;
  }


  openAddClientDialog(){
    this.dialogRef.open(AddNewClientComponent)
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
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const attachment: AttachmentDTO = {
        name: file.name,
        size: file.size,
        type: file.type.includes('image') ? 'image' : 'document',
        url: '', // This will be set after upload
        progress: 0,
        status: 'uploading',
      };

      this.quotationData.attachments?.push(attachment);
      this.uploadFile(file, attachment);
    }
  }

  uploadFile(file: File, attachment: AttachmentDTO) {
    // Simulate file upload process
    const uploadSimulation = setInterval(() => {
      if (attachment.progress! >= 100) {
        attachment.status = 'completed';
        attachment.url = ''; // Set the file URL after upload
        clearInterval(uploadSimulation);
      } else {
        attachment.progress! += 10; // Increase progress
      }
    }, 200);
  }

  cancelUpload(index: number) {
    if (this.quotationData.attachments && this.quotationData.attachments[index]) {
      this.quotationData.attachments.splice(index, 1);
    }
  }


}



