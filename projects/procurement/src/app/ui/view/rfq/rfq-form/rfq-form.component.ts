import { HttpRequest, HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, Renderer2,} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AddressDTO, AttachmentDTO, BanksDTO, CompanyDTO, CustomerDTO, DiscountAndChargesDTO, FieldDTO, IndustryDTO, ItemDTO, ProjectDTO, QuotationDTO, ShippingDTO } from '../../../domain/quotation.dto';
import { QuotationService } from '../../../service/quotation.service';
import { NavigationLinksService } from '../../../sharedComponent/service/navigation-links/navigation-links.service';
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
  showTermsConditionButton = false;
  showAmountWord = false;
  showNotes = false;
  showAttachments = false;
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
  termsGroup: any[] = [ this.terms];
  charges: any[] = [];
  moreFields: any[] = [];
  // isEdit: boolean = false
  itemsData: ItemDTO[] = [];
  industryData: IndustryDTO[] = [];
  discountChargesData: DiscountAndChargesDTO[] = [];
  bankData: BanksDTO[] = [];
  addressData: AddressDTO[] = [];
  shippingData: ShippingDTO[] = [];
  projectData: ProjectDTO = {};
  // customerData: CustomerDTO = {};
  vendorData: any = {}
  companyData: CompanyDTO = {};
  
  openAddItem: boolean = false;


  @Output() submitFrom = new EventEmitter<any>();
  @Input() rfqData: any = {
    items: [],
  };
  @Input() isEdit?: boolean; 

  constructor(
    private renderer: Renderer2, 
    private el: ElementRef,
    private http: HttpClient, 
    // private dropdownService: DropdownService, 
    private dialogRef:MatDialog,
    private quotationService: QuotationService,
    private navigationLink: NavigationLinksService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  @Output() back = new EventEmitter<void>();

  goBack() {
    this.back.emit();
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
}

onItemAdded(item: any) {
  if (!this.rfqData.items) {
    this.rfqData.items = []; // Initialize if undefined
  }
  this.rfqData.items = [...this.rfqData.items, item];
}

editItem(item: any) {
  this.openAddItem = true;
  this.selectedItem = { ...item }; // Copy item to avoid mutation
  this.isItemEdit = true;
}

deleteItem(item: any) {
  this.rfqData.items = this.rfqData.items.filter((i: any) => i.id !== item.id);
}

resetEditState() {
  this.selectedItem = null;
  this.isItemEdit = false;
  this.openAddItem = false;
}

// ===================================================================================
  ngOnInit(): void {
    this.addTerm();
    this.getCompanyInfo();
    this.loadVendors();
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
  }

// SUBMIT QUOTATION ACTION============================================================================

  onSubmit(){
    console.log("quotation into", this.rfqData)
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
    this.rfqData.quotationNote = ''; 
  }

  // ATTACHMENT============================================================================================

  cancelAttachement() {
    this.showAttachments = false;
    this.rfqData.quotationNote = ''; 
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

  totalAmount: number = 0;
  totalAmountInWords: string = '';
  totalTax: number = 0;
  grandTotal: number = 0;


  onInputChange(item: any): void {
    item.amount = item.quantity * item.rate;
    item.tax = (item.taxRate / 100) * item.amount;
    item.total = item.amount + item.tax;

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

      this.rfqData.attachments?.push(attachment);
      this.uploadFile(file, attachment);
    }
  }

  uploadFile(file: File, attachment: AttachmentDTO) {
    const uploadSimulation = setInterval(() => {
      if (attachment.progress! >= 100) {
        attachment.status = 'completed';
        attachment.url = ''; 
        clearInterval(uploadSimulation);
      } else {
        attachment.progress! += 10; 
      }
    }, 200);
  }

  cancelUpload(index: number) {
    if (this.rfqData.attachments && this.rfqData.attachments[index]) {
      this.rfqData.attachments.splice(index, 1);
    }
  }


}



