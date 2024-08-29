import { HttpRequest, HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnInit, Renderer2,} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { AddNewClientComponent } from '../add-new-client/add-new-client.component';
import { DropdownService } from 'src/app/ui/shared/service/dropdown/dropdown.service';
import { ConfigureTaxPopupComponent } from 'src/app/ui/shared/view/configure-tax-popup/configure-tax-popup.component';
import { NumberCurrencyPopupComponent } from 'src/app/ui/shared/view/number-currency-popup/number-currency-popup.component';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotationService } from '../../service/quotation/quotation.service';
import { AddressDTO, AttachmentDTO, BanksDTO, CompanyDTO, CustomerDTO, DiscountAndChargesDTO, FieldDTO, IndustryDTO, ItemsDTO, ProjectDTO, QuotationDTO, ShippingDTO } from '../../domain/quotation.dto';
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

  // termsGroup: TermGroup[] = [
  //   { terms: [{ term_des: '' }] }
  // ];

// ===================================================================================
  ngOnInit(): void {
    this.addTerm();
    this.getCompanyInfo();
    this.getCustomerInfo();
  }
// ===================================================================================
  companyOptions: { id: number, name: string }[] = [];
  selectedCompanyId!: number;

  getCompanyInfo(){
    this.quotationService.getCompany('').subscribe((data: CompanyDTO[]) => {
      this.companyOptions = data.map(company => ({ id: company.id!, name: company.name! }));
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
  customerOptions: { id: number, name: string }[] = [];
  selectedCustomerId!: number;

  getCustomerInfo(){
    this.quotationService.getCustomer('').subscribe((data: CustomerDTO[]) => {
      this.customerOptions = data.map(customer => ({ id: customer.id!, name: customer.name! }));
    });
  }

  onCustomerChange(customerId: number): void {
    if (customerId) {
      this.quotationService.getCustomerById(customerId).subscribe((customer: CustomerDTO) => {
        this.customerData = customer;
      });
    } else {
      this.customerData = {};
    }
  }
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
















  isFormVisible: boolean = false;

  toggleForm() {
    this.isFormVisible = !this.isFormVisible;
  }


  countryList = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 
    'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 
    'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 
    'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 
    'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 
    'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 
    'Comoros', 'Congo, Democratic Republic of the', 'Congo, Republic of the', 
    'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 
    'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 
    'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 
    'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 
    'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 
    'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 
    'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 
    'Kazakhstan', 'Kenya', 'Kiribati', 'Korea, North', 'Korea, South', 'Kosovo', 
    'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 
    'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 
    'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 
    'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 
    'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 
    'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 
    'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 
    'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 
    'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 
    'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 
    'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 
    'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 
    'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 
    'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 
    'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 
    'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 
    'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 
    'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 
    'Zambia', 'Zimbabwe'
  ];

  currencyList = [
    'Algerian Dinar (DZD)',
    'Angolan Kwanza (AOA)',
    'Argentine Peso (ARS)',
    'Australian Dollar (AUD)',
    'Bahraini Dinar (BHD)',
    'Bangladeshi Taka (BDT)',
    'Brazilian Real (BRL)',
    'British Pound Sterling (GBP)',
    'Canadian Dollar (CAD)',
    'Chilean Peso (CLP)',
    'Chinese Yuan (CNY)',
    'Colombian Peso (COP)',
    'Comorian Franc (KMF)',
    'Congolese Franc (CDF)',
    'Czech Koruna (CZK)',
    'Danish Krone (DKK)',
    'Djiboutian Franc (DJF)',
    'Egyptian Pound (EGP)',
    'Eritrean Nakfa (ERN)',
    'Ethiopian Birr (ETB)',
    'Euro (EUR)',
    'Gambian Dalasi (GMD)',
    'Guinean Franc (GNF)',
    'Hong Kong Dollar (HKD)',
    'Indian Rupee (INR)',
    'Indonesian Rupiah (IDR)',
    'Iraqi Dinar (IQD)',
    'Israeli New Shekel (ILS)',
    'Japanese Yen (JPY)',
    'Jordanian Dinar (JOD)',
    'Kenyan Shilling (KES)',
    'Kuwaiti Dinar (KWD)',
    'Lebanese Pound (LBP)',
    'Lesotho Loti (LSL)',
    'Liberian Dollar (LRD)',
    'Libyan Dinar (LYD)',
    'Malagasy Ariary (MGA)',
    'Malawian Kwacha (MWK)',
    'Malaysian Ringgit (MYR)',
    'Mauritanian Ouguiya (MRU)',
    'Mauritian Rupee (MUR)',
    'Mexican Peso (MXN)',
    'Moroccan Dirham (MAD)',
    'Mozambican Metical (MZN)',
    'Namibian Dollar (NAD)',
    'New Zealand Dollar (NZD)',
    'Nigerian Naira (NGN)',
    'Norwegian Krone (NOK)',
    'Omani Rial (OMR)',
    'Pakistani Rupee (PKR)',
    'Peruvian Sol (PEN)',
    'Philippine Peso (PHP)',
    'Polish Zloty (PLN)',
    'Qatari Riyal (QAR)',
    'Romanian Leu (RON)',
    'Russian Ruble (RUB)',
    'Rwandan Franc (RWF)',
    'Saudi Riyal (SAR)',
    'Seychellois Rupee (SCR)',
    'Sierra Leonean Leone (SLL)',
    'Singapore Dollar (SGD)',
    'Somali Shilling (SOS)',
    'South African Rand (ZAR)',
    'South Korean Won (KRW)',
    'South Sudanese Pound (SSP)',
    'Sudanese Pound (SDG)',
    'Swazi Lilangeni (SZL)',
    'Swedish Krona (SEK)',
    'Swiss Franc (CHF)',
    'Syrian Pound (SYP)',
    'Taiwanese Dollar (TWD)',
    'Tanzanian Shilling (TZS)',
    'Thai Baht (THB)',
    'Tunisian Dinar (TND)',
    'Turkish Lira (TRY)',
    'Ugandan Shilling (UGX)',
    'Ukrainian Hryvnia (UAH)',
    'United Arab Emirates Dirham (AED)',
    'United States Dollar (USD)',
    'Uruguayan Peso (UYU)',
    'Vietnamese Dong (VND)',
    'West African CFA Franc (XOF)',
    'Zambian Kwacha (ZMW)',
    'Zimbabwean Dollar (ZWL)'
]


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




  // more fields
  addMoreField() {
    this.moreFields.push({});
  }

  removeMoreField(index: number) {
    this.moreFields.splice(index, 1);
  }






  onSubmit(){
    console.log("quotation into", this.quotationData)
    console.log("quotation into", this.companyData)
    console.log("quotation into", this.customerData)


    // if (this.isEdit) {
    //   this.quotationService.updateQuotationById(this.quotationData);
    //   this.quotationService.updateCompanyById(this.companyData);
    //   this.quotationService.updateCustomerById(this.customerData);
    // } else {
    //   this.quotationService.createQuotation(this.quotationData);
    //   this.quotationService.createCompany(this.companyData);
    //   this.quotationService.createCompany(this.customerData);
    // }
    // this.navigateToTable();
  }




navigateToTable() {
  const salesLink = this.navigationLink.getLink('salesLink')
  this.router.navigate([salesLink]);
  
}


openTaxDialog(){
  this.dialogRef.open(ConfigureTaxPopupComponent)
}


openNumberCurrencyDialog(){
  this.dialogRef.open(NumberCurrencyPopupComponent)
}



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






  //     // Function to add a new term group
  // addTermGroup() {
  //   this.termsGroup.push({
  //       terms: [{}] // Initialize terms as an empty array for each term group
  //   });
  // }

  // // Function to remove a term group
  // removeTermGroup(index: number) {
  //     this.termsGroup.splice(index, 1);
  // }

  // // Function to reset the termsGroup array
  // resetTermsGroup() {
  //     this.termsGroup = [];
  // }

  // // Function to add a new term condition to a specific term group
  // addTermCondition(termGroupIndex: number) {
  //     this.termsGroup[termGroupIndex].terms.push({});
  // }

  // // Function to remove a term condition from a specific term group
  // removeTermCondition(termGroupIndex: number, termIndex: number) {
  //     this.termsGroup[termGroupIndex].terms.splice(termIndex, 1);
  // }

  // // Function to close terms and reset data
  // closeTermsConditions() {
  //     this.showTermsConditionButton = false;
  //     this.resetTermsGroup();
  // }




  // Method to add a new term to the group
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


  cancelNotes() {
    this.showNotes = false;
    this.quotationData.quotationNote = ''; 
  }

  cancelAttachement() {
    this.showAttachments = false;
    this.quotationData.quotationNote = ''; 
  }















  addDiscount() {
    this.discounts.push({});
  }

  removeDiscount(index: number) {
    this.discounts.splice(index, 1);
  }



  addCharge() {
    this.charges.push({});
  }

  removeCharge(index: number) {
    this.charges.splice(index, 1);
  }


  myForm!: FormGroup;
  options: string[] = ['Nigeria - NGN', 'US Dollar - USD', 'Cuba - CUD'];





  addRow(): void {
    this.itemsData.push({});

    // Recalculate totals
    this.calculateTotal();
  }

  
  // name: string = '';
  taxRate: number = 0;
  // quantity!: number;
  // rate?: number;
  amount: number = 0;
  tax: number =0;
  // total: number = 0;
  // totalAmount?: number;
  // totalAmountInWords?: string;
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




  attachment: AttachmentDTO[] = [];


  fileInputChange(event: any) {
    console.log('File input change event:', event);
    const fileList: FileList = event.target.files;
    if (fileList && fileList.length > 0) {
      for (let i = 0; i < fileList.length; i++) {
        const file: File = fileList[i];
        this.uploadFile(file);
      }
    }
  }
  
  
  uploadFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      const fileData = event.target.result;
  
      // Initialize attachment array if not present
      if (!this.quotationData.attachment) {
        this.quotationData.attachment = [];
      }
  
      // Add file to QuotationDTO
      this.quotationData.attachment.push({
        name: file.name,
        size: file.size,
        // data: fileData,
        progress: 0,
        status: 'in-progress'
      });
    };
    reader.readAsDataURL(file);
  }
  
  updateFileProgress(fileName: string, progress: number) {
    const file = this.attachment.find(file => file.name === fileName);
    if (file) {
      file.progress = progress;
    }
  }
  
  updateFileStatus(fileName: string, status: string) {
    const file = this.attachment.find(file => file.name === fileName);
    if (file) {
      file.status = status;
    }
  }
  
  cancelUpload(index: number) {
    this.attachment.splice(index, 1);
  }


  // fileInputChange(event: any) {
  //   const fileList: FileList = event.target.files;
  //   if (fileList && fileList.length > 0) {
  //     for (let i = 0; i < fileList.length; i++) {
  //       const file: File = fileList[i];
  //       this.uploadFile(file);
  //     }
  //   }
  // }

  // uploadFile(file: File) {
  //   const formData = new FormData();
  //   formData.append('file', file);

  //   const req = new HttpRequest('POST', 'sender.php', formData, {
  //     reportProgress: true
  //   });

  //   this.http.request(req).subscribe(event => {
  //     if (event.type === HttpEventType.UploadProgress && event.total) {
  //       const percentDone = Math.round(100 * event.loaded / event.total);
  //       this.updateFileProgress(file.name, percentDone);
  //     } else if (event instanceof HttpResponse) {
  //       this.updateFileStatus(file.name, 'complete');
  //     }
  //   });
    
  //   this.attachment.push({ name: file.name, size: file.size, progress: 0, status: 'in-prog' });
  // }

  // updateFileProgress(fileName: string, progress: number) {
  //   const file = this.attachment.find(file => file.name === fileName);
  //   if (file) {
  //     file.progress = progress;
  //   }
  // }

  // updateFileStatus(fileName: string, status: string) {
  //   const file = this.attachment.find(file => file.name === fileName);
  //   if (file) {
  //     file.status = status;
  //   }
  // }

  // cancelUpload(index: number) {
  //   this.attachment.splice(index, 1);
  // }


  // showForm: boolean = false;
  sameAsBusinessAddress: boolean = false;
  sameAsClientAddress: boolean = false;
  saveToClientDetails: boolean = false;

  shippedFrom = {
    businessName: '',
    country: '',
    address: '',
    city: '',
    postalCode: '',
    state: ''
  };

  shippedTo = {
    businessName: '',
    country: '',
    address: '',
    city: '',
    postalCode: '',
    state: ''
  };

  addMoreFields() {
    // Logic to add more fields
  }



  currency = this.currencyList;
  companyCountry = this.countryList; 
  clientCountry = this.countryList; 
  clientShippingDetails = ['None', 'Shipping 1', 'Shipping 2', 'Shipping 3'];

  isDropdownOpen$(id: string) {
    return this.dropdownService.isDropdownOpen$(id);
  }

  getSelectedItem$(id: string): Observable<string | null> {
    return this.dropdownService.getSelectedItem$(id);
  }

  toggleDropdown(id: string) {
    this.dropdownService.toggleDropdown(id);
  }

  selectItem(id: string, item: string) {
    this.dropdownService.selectItem(id, item);
  }

  extractCurrencyCode(currency: string | null): string {
    if (!currency) {
      return 'NGN';
    }
    const match = currency.match(/\(([^)]+)\)/);
    return match ? match[1] : currency;
  }
}
