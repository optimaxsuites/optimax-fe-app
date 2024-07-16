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
// import { map } from 'rxjs/operators';
// import { MatDialog } from '@angular/material/dialog';


interface Company {
  value: string;
  viewValue: string;
}
interface BusinessDetails {
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
}

interface Client {
  value: string;
  viewValue: string;
}

interface Field {
  text: string;
  isEditing: boolean;
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
  selectedValue?: string;
  clientDetails: any = {};
  showDescriptionBox: boolean = false;
  signatureUrl: string | ArrayBuffer | null = null;
  logoUrl: string | ArrayBuffer | null = null;
  discounts: any[] = [];
  terms: any[] = [];
  termsGroup: any[] = [];
  charges: any[] = [];
  moreFields: any[] = [];

  isEdit: boolean = false

  // selectedCompany?: string;
  selectedClient?: string;

  quotationData: any = {
    clientDetails: {},
    businessDetails: {},
    fields: [],
  };
 




  dropdownOpen = false;
  selectedCompany?: Company;







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

ngOnInit(): void {
  this.addTermGroup();

  const id = this.route.snapshot.paramMap.get('id');
  if (id) {
    const item = this.quotationService.getItemById(id);
    if (item) {
      this.quotationData = { ...item };
      this.isEdit = true;
    }
  }
  
}

// ngOnInit(): void {
//   this.myForm = this.fb.group({
//     myOption: [''], 
//   });
// }

onSubmit(){
  console.log("quotation into", this.quotationData)
  if (this.isEdit) {
    this.quotationService.updateItem(this.quotationData);
  } else {
    this.quotationService.addItem(this.quotationData);
  }
  this.navigateToTable();
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

openAddNewClientDialog(){
  this.dialogRef.open(AddNewClientComponent)
}


addField() {
  this.quotationData.fields.push({});
}

removeField(index: number) {
  this.quotationData.fields.splice(index, 1);
}

// editField(index: number) {
//   this.quotationData.fields[index].isEditing = true;
// }

// saveField(index: number, event: any) {
//   this.quotationData.fields[index].isEditing = false;
//   this.quotationData.fields[index].text = event.target.value;
// }





      // Function to add a new term group
      addTermGroup() {
        this.termsGroup.push({
            terms: [{}] // Initialize terms as an empty array for each term group
        });
    }

    // Function to remove a term group
    removeTermGroup(index: number) {
        this.termsGroup.splice(index, 1);
    }

    // Function to reset the termsGroup array
    resetTermsGroup() {
        this.termsGroup = [];
    }

    // Function to add a new term condition to a specific term group
    addTermCondition(termGroupIndex: number) {
        this.termsGroup[termGroupIndex].terms.push({});
    }

    // Function to remove a term condition from a specific term group
    removeTermCondition(termGroupIndex: number, termIndex: number) {
        this.termsGroup[termGroupIndex].terms.splice(termIndex, 1);
    }

    // Function to close terms and reset data
    closeTermsConditions() {
        this.showTermsConditionButton = false;
        this.resetTermsGroup();
    }



    addMoreField() {
      this.moreFields.push({});
    }
  
    removeMoreField(index: number) {
      this.moreFields.splice(index, 1);
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

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '200px',
    maxHeight: '200px',
    translate: 'no',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    toolbarHiddenButtons: [
      [
        'undo',
        'redo',
        'strikeThrough',
        'subscript',
        'superscript',
        'justifyLeft',
        'justifyCenter',
        'justifyRight',
        'justifyFull',
        'insertUnorderedList',
        'insertOrderedList',
        'fontName',
      ],
      [
        'textColor',
        'backgroundColor',
        'customClasses',
        'link',
        'unlink',
        'insertImage',
        'insertVideo',
        'insertHorizontalRule',
        'removeFormat',
        'toggleEditorMode',
      ],
    ],
  };

  myForm!: FormGroup;
  options: string[] = ['Nigeria - NGN', 'US Dollar - USD', 'Cuba - CUD'];




  tableData: any[] = [
    {
      name:'',
      taxRate: '',
      quantity: '',
      rate: '',
      amount: '',
      tax: '',
      total: '',
      showDescriptionBox: false
    }
  ];


  addRow(): void {
    this.tableData.push({
      name: '',
      taxRate: 0,
      quantity: 0,
      rate: 0,
      amount: 0,
      tax: 0,
      total: 0,
      showDescriptionBox: false
    });

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
    // this.name = item.name;
    // this.taxRate = item.taxRate;
    // this.quantity = item.quantity;
    // this.rate = item.rate;
    // this.amount = item.amount;
    // console.log(this.amount)
    // this.tax = item.tax;
    // this.total = item.total;

  
    item.amount = item.quantity * item.rate;
    item.tax = (item.taxRate / 100) * item.amount;
    item.total = item.amount + item.tax;

    // Calculate total amount for all items
    this.calculateTotal();

  }

  calculateTotal(): void {
    // this.totalAmount = this.amount * this.tax;
    // // Call method to convert total amount to words
    // this.totalAmountInWords = this.convertToWords(this.totalAmount);

    // this.totalAmount = this.tableData.reduce((sum, item) => sum + item.total, 0);
    this.totalAmountInWords = this.convertToWords(this.grandTotal);

    this.totalAmount = this.tableData.reduce((sum, item) => sum + item.amount, 0);
    this.totalTax = this.tableData.reduce((sum, item) => sum + item.tax, 0);
    this.grandTotal = this.tableData.reduce((sum, item) => sum + item.total, 0);
  }

  convertToWords(grandTotal: number): string {
    // Your logic to convert amount to words
    // return 'Total Amount in Words'; // Placeholder
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
      this.tableData.splice(index, 1);
    // }
  }

  addNewRow(): void {
    // You can add a new empty row here
    this.tableData.push({});
  }

  toggleSecondComponent() {
    this.showSecondComponent = !this.showSecondComponent;
  }

  showDesBox() {
    this.showDescriptionBox = true;
  }


// ====================================company selection============================================
  companies: Company[] = [
    { value: 'Centrifuge', viewValue: 'Centrifuge' },
    { value: 'GOP Gadgets', viewValue: 'GOP Gadgets' },
    { value: 'DeOne', viewValue: 'DeOne' }
  ];
  toggleDropdownCompany() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectCompany(company: any) {
    this.quotationData.selectedCompany = company.value;
    this.selectedCompany = company;
    this.dropdownOpen = false;
    this.updateBusinessInfo();
  }


  addNewCompany(event: Event) {
    event.stopPropagation();
    // Your logic to add a new company goes here
  }

  updateBusinessInfo() {
    const selectedCompany = this.companies.find(company => company.value === this.quotationData.selectedCompany);
    // this.showSecondComponent = true;

    if (selectedCompany) {
      if (selectedCompany.value === 'Centrifuge') {
        this.quotationData.businessDetails = {
          name: 'Centrifuge Group',
          address: 'No 31 juju street, lagos road',
          phoneNumber: '09077556633',
          email: 'centrifuge@gmail.com'
        };
      } else if (selectedCompany.value === 'GOP Gadgets') {
        this.quotationData.businessDetails = {
          name: 'GOP Gadgets',
          address: 'No 9 Adesanya street, lagos, ikeja',
          phoneNumber: '08144685954',
          email: 'gop@gmail.com'
        };
      } else if (selectedCompany.value === 'DeOne') {
        this.quotationData.businessDetails = {
          name: 'DeOne Gadgets',
          address: 'No 9 Adesanya street, lagos, ikeja',
          phoneNumber: '08060393174',
          email: 'DeOne@gmail.com'
        };
      }
    }
  }

// ====================================company selection============================================


  // client details

  clients: Client[] = [
    { value: 'MTN', viewValue: 'MTN' },
    { value: 'GLO', viewValue: 'GLO' },
    { value: 'Opay', viewValue: 'Opay' }
  ];

  updateClientInfo() {
    const selectedClient = this.clients.find(client => client.value === this.quotationData.selectedClient);
    this.showSecondComponent = true;

    if (selectedClient) {
      if (selectedClient.value === 'MTN') {
        this.quotationData.clientDetails = {
          name: 'MTN',
          address: 'No 31 juju street, lagos road',
          phoneNumber: '09077556633',
          email: 'mtn@gmail.com'
        };
      } else if (selectedClient.value === 'GLO') {
        this.quotationData.clientDetails = {
          name: 'GLO',
          address: 'No 9 Adesanya street, lagos, ikeja',
          phoneNumber: '08144685954',
          email: 'glo@gmail.com'
        };
      } else if (selectedClient.value === 'Opay') {
        this.quotationData.clientDetails = {
          name: 'Opay',
          address: 'No 9 Adesanya street, lagos, ikeja',
          phoneNumber: '08060393174',
          email: 'opay@gmail.com'
        };
      }
    }
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


  // onLogoSelected(event: any) {
  //   const file: File = event.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.readAsDataURL(file);
  //     reader.onload = () => {
  //       this.logoUrl = reader.result;
  //     };
  //   }
  // }

  // clearLogo() {
  //   this.logoUrl = null;
  //   // this.showSignatureButton = false; 
  // }

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




uploadedFiles: { name: string, size: number, progress: number, status: string }[] = [];



  fileInputChange(event: any) {
    const fileList: FileList = event.target.files;
    if (fileList && fileList.length > 0) {
      for (let i = 0; i < fileList.length; i++) {
        const file: File = fileList[i];
        this.uploadFile(file);
      }
    }
  }

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', 'sender.php', formData, {
      reportProgress: true
    });

    this.http.request(req).subscribe(event => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        const percentDone = Math.round(100 * event.loaded / event.total);
        this.updateFileProgress(file.name, percentDone);
      } else if (event instanceof HttpResponse) {
        this.updateFileStatus(file.name, 'complete');
      }
    });
    
    this.uploadedFiles.push({ name: file.name, size: file.size, progress: 0, status: 'in-prog' });
  }

  updateFileProgress(fileName: string, progress: number) {
    const file = this.uploadedFiles.find(file => file.name === fileName);
    if (file) {
      file.progress = progress;
    }
  }

  updateFileStatus(fileName: string, status: string) {
    const file = this.uploadedFiles.find(file => file.name === fileName);
    if (file) {
      file.status = status;
    }
  }

  cancelUpload(index: number) {
    this.uploadedFiles.splice(index, 1);
  }


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
