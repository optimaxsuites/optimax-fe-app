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

// interface ClientDetails {
//   name: string;
//   address: string;
//   phoneNumber: string;
//   email: string;
// }


@Component({
  selector: 'app-invoice-modal',
  templateUrl: './invoice-modal.component.html',
  styleUrl: './invoice-modal.component.scss'
})
export class InvoiceModalComponent {
  showSecondComponent = false;
  showDiscount = false;
  showAdditionalCharges = false;
  selectedValue?: string;
  clientDetails: any = {}; 
  showDescriptionBox: boolean = false;

  
  discounts: any[] = [];

  addDiscount() {
    this.discounts.push({});
  }

  removeDiscount(index: number) {
    this.discounts.splice(index, 1);
  }
  charges: any[] = [];

  addCharge() {
    this.charges.push({});
  }

  removeCharge(index: number) {
    this.charges.splice(index, 1);
  }

  // removeContainer(event: MouseEvent) {
  //   const button = event.target as HTMLButtonElement;
  //   const container = button.parentElement;
  //   if (container) {
  //     container.remove();
  //   }
  // }

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
        'fontName'
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
        'toggleEditorMode'
      ]
    ]
  };
 
  myForm!: FormGroup ;
  options: string[] = ['Nigeria - NGN', 'US Dollar - USD', 'Cuba - CUD'];

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.myForm = this.fb.group({
      myOption: [''] // Set default value if needed
    });
  }

  

  // tableData = [
  //   { name: 'Product 1', taxRate: '0.5%', quantity: 1, rate: 5000, amount: 5000, tax: 25.00, total: 5025.00 },
  //   { name: 'Product 2', taxRate: '0.5%', quantity: 1, rate: 5000, amount: 10000, tax: 50.00, total: 5050.00 }
  //   // Add more data as needed
  // ];

  tableData: any[] = [{}];

  deleteRow(index: number) {
    if (index > 0) {
        this.tableData.splice(index, 1);
    } else {
        // Optionally, you can notify the user that the first row cannot be deleted.
        // console.log("Cannot delete the first row.");
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
    {value: 'Centrifuge', viewValue: 'Centrifuge'},
    {value: 'GOP Gadgets', viewValue: 'GOP Gadgets'},
    {value: 'DeOne', viewValue: 'DeOne'},
  ];

  businessDetails: BusinessDetails = {
    name: '',
    address: '',
    phoneNumber: '',
    email: ''
  };

  updateBusinessInfo() {
    // Replace this logic with your actual business details fetching mechanism
    if (this.selectedValue === 'Centrifuge') {
      this.businessDetails = {
        name: 'Centrifuge Group',
        address: 'No 31 juju street, lagos road',
        phoneNumber: '09077556633',
        email: 'centrifuge@gmail.com'
      };
    } else if (this.selectedValue === 'GOP Gadgets') {
      // Add logic for GOP Gadgets
      this.businessDetails = {
        name: 'GOP Gadgets',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08144685954',
        email: 'gop@gmail.com'
      };
    } else if (this.selectedValue === 'DeOne') {
      // Add logic for DeOne
      this.businessDetails = {
        name: 'DeOne Gadgets',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08060393174',
        email: 'DeOne@gmail.com'
      };
    }
  }



  // client details

  clients: Client[] = [
    {value: 'MTN', viewValue: 'MTN'},
    {value: 'GLO', viewValue: 'GLO'},
    {value: 'Opay', viewValue: 'Opay'},
  ];

  // clientDetails: ClientDetails = {
  //   name: '',
  //   address: '',
  //   phoneNumber: '',
  //   email: ''
  // };


  updateClientInfo() {
    this.clientDetails = this.clients.find(client => client.value === this.selectedValue);
      this.showSecondComponent = true; // Show the second component


    // Replace this logic with your actual business details fetching mechanism
    if (this.selectedValue === 'MTN') {
      this.clientDetails = {
        name: 'MTN',
        address: 'No 31 juju street, lagos road',
        phoneNumber: '09077556633',
        email: 'mtn@gmail.com'
      };
    } else if (this.selectedValue === 'GLO') {
      // Add logic for GOP Gadgets
      this.clientDetails = {
        name: 'GLO',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08144685954',
        email: 'glo@gmail.com'
      };
    } else if (this.selectedValue === 'Opay') {
      // Add logic for DeOne
      this.clientDetails = {
        name: 'Opay',
        address: 'No 9 Adesanya street, lagos, ikeja',
        phoneNumber: '08060393174',
        email: 'opay@gmail.com'
      };
    }
  }


  


}





