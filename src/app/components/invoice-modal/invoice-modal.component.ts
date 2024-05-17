import { HttpRequest, HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AngularEditorConfig } from '@kolkov/angular-editor';
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

@Component({
  selector: 'app-invoice-modal',
  templateUrl: './invoice-modal.component.html',
  styleUrl: './invoice-modal.component.scss',
})
export class InvoiceModalComponent {
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
  imageUrl: string | ArrayBuffer | null = null;
  discounts: any[] = [];
  terms: any[] = [];
  termsGroup: any[] = [];

  // addTermGroup() {
  //   // Create a new term group with an initial term
  //   this.termsGroup.push({ terms: [{}] });
  // }

  // removeTermGroup(index: number) {
  //   this.termsGroup.splice(index, 1);
  // }

  // addTermCondition(groupIndex: number) {
  //   // Add a new term to the specified term group
  //   this.termsGroup[groupIndex].terms.push({});
  // }

  // removeTermCondition(groupIndex: number, termIndex: number) {
  //   this.termsGroup[groupIndex].terms.splice(termIndex, 1);
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






  addDiscount() {
    this.discounts.push({});
  }

  removeDiscount(index: number) {
    this.discounts.splice(index, 1);
  }

  //  signature
  // signatures: any[] = [];

  // addSignature(){
  //   this.signatures.push({});
  // }
  // removeSignature(index: number){
  //   this.signatures.splice(index, 1);
  // }

  // signature

  charges: any[] = [];

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

  constructor(private fb: FormBuilder, private http: HttpClient) { }

  ngOnInit(): void {
    this.addTermGroup();


    this.myForm = this.fb.group({
      myOption: [''], // Set default value if needed
    });
  }

  tableData: any[] = [{}];

  deleteRow(index: number) {
    if (index > 0) {
      this.tableData.splice(index, 1);
    }
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

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.imageUrl = reader.result;
      };
    }
  }

  clearSignature() {
    this.imageUrl = null;
    this.showSignatureButton = false; 
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
    // Implement cancellation logic if needed
    this.uploadedFiles.splice(index, 1);

  }

}
