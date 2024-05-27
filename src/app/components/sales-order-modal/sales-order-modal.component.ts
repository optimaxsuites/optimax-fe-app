import {
  HttpRequest,
  HttpClient,
  HttpEventType,
  HttpResponse,
} from '@angular/common/http';
import { Component, ElementRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { Observable } from 'rxjs';
import { DropdownService } from '../../services/dropdown/dropdown.service';

interface RfqItem {
  item: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

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
  selector: 'app-sales-order-modal',
  templateUrl: './sales-order-modal.component.html',
  styleUrl: './sales-order-modal.component.scss',
})
export class SalesOrderModalComponent {
  showSecondComponent = false;
  showSignatureButton: boolean = false;
  showTermsConditionButton = false;
  showAmountWord = false;
  showNotes = false;
  showAttachments = false;
  showDiscount = false;
  showAdditionalCharges = false;
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
  rfqItems: RfqItem[] = [];
  showLogo = false;

  addRow() {
    this.rfqItems.push({
      item: '',
      description: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
    });
  }

  removeRow(index: number) {
    this.rfqItems.splice(index, 1);
  }

  getSelectedItem$(id: string): Observable<string | null> {
    return this.dropdownService.getSelectedItem$(id);
  }

  extractCurrencyCode(currency: string | null): string {
    if (!currency) {
      return 'NGN';
    }
    const match = currency.match(/\(([^)]+)\)/);
    return match ? match[1] : currency;
  }

  addTermGroup() {
    this.termsGroup.push({
      terms: [{}], // Initialize terms as an empty array for each term group
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

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dropdownService: DropdownService
  ) {}

  tableData: any[] = [
    {
      sn: '',
      name: '',
      taxRate: '',
      quantity: '',
      rate: '',
      amount: '',
      tax: '',
      total: '',
      showDescriptionBox: false,
    },
  ];

  sn: number = 0;
  name: string = '';
  taxRate: string = '';
  quantity: number = 0;
  rate: Number = 0;
  amount: number = 0;
  tax: number = 0;
  total: number = 0;
  totalAmount: number = 0;
  totalAmountInWords: string = '';
  isDropdownOpen$(id: string) {
    return this.dropdownService.isDropdownOpen$(id);
  }

  onInputChange(item: any): void {
    this.sn = item.sn;
    this.name = item.name;
    this.taxRate = item.taxRate;
    this.quantity = item.quantity;
    this.rate = item.rate;
    this.amount = item.amount;
    this.tax = item.tax;
    this.total = item.total;
  }

  saveField(index: number, event: any) {
    this.fields[index].isEditing = false;
    this.fields[index].text = event.target.value;
  }

  addField() {
    this.fields.push({ text: 'New field', isEditing: false });
  }

  removeField(index: number) {
    this.fields.splice(index, 1);
  }

  editField(index: number) {
    this.fields[index].isEditing = true;
  }

  fields: Field[] = [
    // { text: 'Click to edit me', isEditing: false }
  ];

  ngOnInit(): void {
    this.addTermGroup();

    this.myForm = this.fb.group({
      myOption: [''],
    });
  }

  calculateAmount(item: any): void {
    const quantity = parseFloat(item.quantity);
    const rate = parseFloat(item.rate);
    item.amount = quantity * rate;
  }

  // tableData: any[] = [{}];

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

  companies: Company[] = [
    { value: 'Centrifuge', viewValue: 'Centrifuge' },
    { value: 'GOP Gadgets', viewValue: 'GOP Gadgets' },
    { value: 'DeOne', viewValue: 'DeOne' },
  ];

  businessDetails: BusinessDetails = {
    name: '',
    address: '',
    phoneNumber: '',
    email: '',
  };

  updateBusinessInfo() {
    // Replace this logic with your actual business details fetching mechanism
    if (this.selectedValue === 'Centrifuge') {
      this.businessDetails = {
        name: 'Centrifuge Group',
        address: 'No 31 juju street, lagos road',
        phoneNumber: '09077556633',
        email: 'centrifuge@gmail.com',
      };
    } else if (this.selectedValue === 'GOP Gadgets') {
      // Add logic for GOP Gadgets
      this.businessDetails = {
        name: 'GOP Gadgets',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08144685954',
        email: 'gop@gmail.com',
      };
    } else if (this.selectedValue === 'DeOne') {
      // Add logic for DeOne
      this.businessDetails = {
        name: 'DeOne Gadgets',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08060393174',
        email: 'DeOne@gmail.com',
      };
    }
  }

  // client details

  clients: Client[] = [
    { value: 'MTN', viewValue: 'MTN' },
    { value: 'GLO', viewValue: 'GLO' },
    { value: 'Opay', viewValue: 'Opay' },
  ];

  updateClientInfo() {
    this.clientDetails = this.clients.find(
      (client) => client.value === this.selectedValue
    );
    this.showSecondComponent = true; // Show the second component

    // Replace this logic with your actual business details fetching mechanism
    if (this.selectedValue === 'MTN') {
      this.clientDetails = {
        name: 'MTN',
        address: 'No 31 juju street, lagos road',
        phoneNumber: '09077556633',
        email: 'mtn@gmail.com',
      };
    } else if (this.selectedValue === 'GLO') {
      // Add logic for GOP Gadgets
      this.clientDetails = {
        name: 'GLO',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08144685954',
        email: 'glo@gmail.com',
      };
    } else if (this.selectedValue === 'Opay') {
      // Add logic for DeOne
      this.clientDetails = {
        name: 'Opay',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08060393174',
        email: 'opay@gmail.com',
      };
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

  onLogoSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.logoUrl = reader.result;
      };
    }
  }

  clearLogo() {
    this.logoUrl = null;
    // this.showSignatureButton = false;
  }

  uploadedFiles: {
    name: string;
    size: number;
    progress: number;
    status: string;
  }[] = [];

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
      reportProgress: true,
    });

    this.http.request(req).subscribe((event) => {
      if (event.type === HttpEventType.UploadProgress && event.total) {
        const percentDone = Math.round((100 * event.loaded) / event.total);
        this.updateFileProgress(file.name, percentDone);
      } else if (event instanceof HttpResponse) {
        this.updateFileStatus(file.name, 'complete');
      }
    });

    this.uploadedFiles.push({
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'in-prog',
    });
  }

  updateFileProgress(fileName: string, progress: number) {
    const file = this.uploadedFiles.find((file) => file.name === fileName);
    if (file) {
      file.progress = progress;
    }
  }

  updateFileStatus(fileName: string, status: string) {
    const file = this.uploadedFiles.find((file) => file.name === fileName);
    if (file) {
      file.status = status;
    }
  }

  cancelUpload(index: number) {
    // Implement cancellation logic if needed
    this.uploadedFiles.splice(index, 1);
  }
}
