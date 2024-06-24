import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../../services/inventory/inventory.service';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { DropdownService } from '../../services/dropdown/dropdown.service';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NumberCurrencyPopupComponent } from '../number-currency-popup/number-currency-popup.component';
import { ToastrService } from 'ngx-toastr';
import { InventoryItem } from '../../interface/data';
import { MessageService } from 'primeng/api';







@Component({
  selector: 'app-inventory-form',
  templateUrl: './inventory-form.component.html',
  styleUrl: './inventory-form.component.scss',
  providers: [MessageService]
})
export class InventoryFormComponent implements OnInit {
  showLogo = false;

  // inventoryItem: InventoryItem[] = [];  


  inventoryItem: any = {};

  // inventoryItem: InventoryItem = {
  //   id: '',
  //   itemName: '',
  //   partNo: 0,
  //   image: '',
  //   description: '',
  //   buyingPrice: 0,
  //   sellingPrice: 0,
  //   initialStock: 0,
  //   purchaseLedger: '',
  //   salesLedger: '',
  //   inventoryLedger: '',
  //   taxRate: 0,
  //   hsn: '',
  //   tag: '',
  //   images: []
  // };

  // inventoryItem = { 
  //   id: '', 
  //   itemName: '', 
  //   partNo: 0, 
  //   image: '',
  //   description: '', 
  //   buyingPrice: 0, 
  //   sellingPrice: 0, 
  //   initialStock: 0,
  //   purchaseLedger: '',
  //   salesLedger: '',
  //   inventoryLedger: '',
  //   taxRate: 0,
  //   hsn: '',
  //   tag: '',
  // };

  inventoryLedgers = [
    'Inventory Ledger 1',
    'Inventory Ledger 2',
    'Inventory Ledger 3',
    'Inventory Ledger 4',
    'Inventory Ledger 5'
  ];

  purchaseLedgers = [
    'Ledger 1',
    'Ledger 2',
    'Ledger 3',
    'Ledger 4',
    'Ledger 5'
  ];

  salesLedgers = [
    'Ledger sales 1',
    'Ledger sales 2',
    'Ledger sales 3',
    'Ledger sales 4',
    'Ledger sales 5'
  ];
  isEdit = false;

//   currencyList = [
//     'Algerian Dinar (DZD)',
//     'Angolan Kwanza (AOA)',
//     'Argentine Peso (ARS)',
//     'Australian Dollar (AUD)',
//     'Bahraini Dinar (BHD)',
//     'Bangladeshi Taka (BDT)',
//     'Brazilian Real (BRL)',
//     'British Pound Sterling (GBP)',
//     'Canadian Dollar (CAD)',
//     'Chilean Peso (CLP)',
//     'Chinese Yuan (CNY)',
//     'Colombian Peso (COP)',
//     'Comorian Franc (KMF)',
//     'Congolese Franc (CDF)',
//     'Czech Koruna (CZK)',
//     'Danish Krone (DKK)',
//     'Djiboutian Franc (DJF)',
//     'Egyptian Pound (EGP)',
//     'Eritrean Nakfa (ERN)',
//     'Ethiopian Birr (ETB)',
//     'Euro (EUR)',
//     'Gambian Dalasi (GMD)',
//     'Guinean Franc (GNF)',
//     'Hong Kong Dollar (HKD)',
//     'Indian Rupee (INR)',
//     'Indonesian Rupiah (IDR)',
//     'Iraqi Dinar (IQD)',
//     'Israeli New Shekel (ILS)',
//     'Japanese Yen (JPY)',
//     'Jordanian Dinar (JOD)',
//     'Kenyan Shilling (KES)',
//     'Kuwaiti Dinar (KWD)',
//     'Lebanese Pound (LBP)',
//     'Lesotho Loti (LSL)',
//     'Liberian Dollar (LRD)',
//     'Libyan Dinar (LYD)',
//     'Malagasy Ariary (MGA)',
//     'Malawian Kwacha (MWK)',
//     'Malaysian Ringgit (MYR)',
//     'Mauritanian Ouguiya (MRU)',
//     'Mauritian Rupee (MUR)',
//     'Mexican Peso (MXN)',
//     'Moroccan Dirham (MAD)',
//     'Mozambican Metical (MZN)',
//     'Namibian Dollar (NAD)',
//     'New Zealand Dollar (NZD)',
//     'Nigerian Naira (NGN)',
//     'Norwegian Krone (NOK)',
//     'Omani Rial (OMR)',
//     'Pakistani Rupee (PKR)',
//     'Peruvian Sol (PEN)',
//     'Philippine Peso (PHP)',
//     'Polish Zloty (PLN)',
//     'Qatari Riyal (QAR)',
//     'Romanian Leu (RON)',
//     'Russian Ruble (RUB)',
//     'Rwandan Franc (RWF)',
//     'Saudi Riyal (SAR)',
//     'Seychellois Rupee (SCR)',
//     'Sierra Leonean Leone (SLL)',
//     'Singapore Dollar (SGD)',
//     'Somali Shilling (SOS)',
//     'South African Rand (ZAR)',
//     'South Korean Won (KRW)',
//     'South Sudanese Pound (SSP)',
//     'Sudanese Pound (SDG)',
//     'Swazi Lilangeni (SZL)',
//     'Swedish Krona (SEK)',
//     'Swiss Franc (CHF)',
//     'Syrian Pound (SYP)',
//     'Taiwanese Dollar (TWD)',
//     'Tanzanian Shilling (TZS)',
//     'Thai Baht (THB)',
//     'Tunisian Dinar (TND)',
//     'Turkish Lira (TRY)',
//     'Ugandan Shilling (UGX)',
//     'Ukrainian Hryvnia (UAH)',
//     'United Arab Emirates Dirham (AED)',
//     'United States Dollar (USD)',
//     'Uruguayan Peso (UYU)',
//     'Vietnamese Dong (VND)',
//     'West African CFA Franc (XOF)',
//     'Zambian Kwacha (ZMW)',
//     'Zimbabwean Dollar (ZWL)'
// ]



currencyList = [
  { name: 'Algerian Dinar', code: 'DZD' },
  { name: 'Angolan Kwanza', code: 'AOA' },
  { name: 'Argentine Peso', code: 'ARS' },
  { name: 'Australian Dollar', code: 'AUD' },
  { name: 'Bahraini Dinar', code: 'BHD' },
  { name: 'Bangladeshi Taka', code: 'BDT' },
  { name: 'Brazilian Real', code: 'BRL' },
  { name: 'British Pound Sterling', code: 'GBP' },
  { name: 'Canadian Dollar', code: 'CAD' },
  { name: 'Chilean Peso', code: 'CLP' },
  { name: 'Chinese Yuan', code: 'CNY' },
  { name: 'Colombian Peso', code: 'COP' },
  { name: 'Comorian Franc', code: 'KMF' },
  { name: 'Congolese Franc', code: 'CDF' },
  { name: 'Czech Koruna', code: 'CZK' },
  { name: 'Danish Krone', code: 'DKK' },
  { name: 'Djiboutian Franc', code: 'DJF' },
  { name: 'Egyptian Pound', code: 'EGP' },
  { name: 'Eritrean Nakfa', code: 'ERN' },
  { name: 'Ethiopian Birr', code: 'ETB' },
  { name: 'Euro', code: 'EUR' },
  { name: 'Gambian Dalasi', code: 'GMD' },
  { name: 'Guinean Franc', code: 'GNF' },
  { name: 'Hong Kong Dollar', code: 'HKD' },
  { name: 'Indian Rupee', code: 'INR' },
  { name: 'Indonesian Rupiah', code: 'IDR' },
  { name: 'Iraqi Dinar', code: 'IQD' },
  { name: 'Israeli New Shekel', code: 'ILS' },
  { name: 'Japanese Yen', code: 'JPY' },
  { name: 'Jordanian Dinar', code: 'JOD' },
  { name: 'Kenyan Shilling', code: 'KES' },
  { name: 'Kuwaiti Dinar', code: 'KWD' },
  { name: 'Lebanese Pound', code: 'LBP' },
  { name: 'Lesotho Loti', code: 'LSL' },
  { name: 'Liberian Dollar', code: 'LRD' },
  { name: 'Libyan Dinar', code: 'LYD' },
  { name: 'Malagasy Ariary', code: 'MGA' },
  { name: 'Malawian Kwacha', code: 'MWK' },
  { name: 'Malaysian Ringgit', code: 'MYR' },
  { name: 'Mauritanian Ouguiya', code: 'MRU' },
  { name: 'Mauritian Rupee', code: 'MUR' },
  { name: 'Mexican Peso', code: 'MXN' },
  { name: 'Moroccan Dirham', code: 'MAD' },
  { name: 'Mozambican Metical', code: 'MZN' },
  { name: 'Namibian Dollar', code: 'NAD' },
  { name: 'New Zealand Dollar', code: 'NZD' },
  { name: 'Nigerian Naira', code: 'NGN' },
  { name: 'Norwegian Krone', code: 'NOK' },
  { name: 'Omani Rial', code: 'OMR' },
  { name: 'Pakistani Rupee', code: 'PKR' },
  { name: 'Peruvian Sol', code: 'PEN' },
  { name: 'Philippine Peso', code: 'PHP' },
  { name: 'Polish Zloty', code: 'PLN' },
  { name: 'Qatari Riyal', code: 'QAR' },
  { name: 'Romanian Leu', code: 'RON' },
  { name: 'Russian Ruble', code: 'RUB' },
  { name: 'Rwandan Franc', code: 'RWF' },
  { name: 'Saudi Riyal', code: 'SAR' },
  { name: 'Seychellois Rupee', code: 'SCR' },
  { name: 'Sierra Leonean Leone', code: 'SLL' },
  { name: 'Singapore Dollar', code: 'SGD' },
  { name: 'Somali Shilling', code: 'SOS' },
  { name: 'South African Rand', code: 'ZAR' },
  { name: 'South Korean Won', code: 'KRW' },
  { name: 'South Sudanese Pound', code: 'SSP' },
  { name: 'Sudanese Pound', code: 'SDG' },
  { name: 'Swazi Lilangeni', code: 'SZL' },
  { name: 'Swedish Krona', code: 'SEK' },
  { name: 'Swiss Franc', code: 'CHF' },
  { name: 'Syrian Pound', code: 'SYP' },
  { name: 'Taiwanese Dollar', code: 'TWD' },
  { name: 'Tanzanian Shilling', code: 'TZS' },
  { name: 'Thai Baht', code: 'THB' },
  { name: 'Tunisian Dinar', code: 'TND' },
  { name: 'Turkish Lira', code: 'TRY' },
  { name: 'Ugandan Shilling', code: 'UGX' },
  { name: 'Ukrainian Hryvnia', code: 'UAH' },
  { name: 'United Arab Emirates Dirham', code: 'AED' },
  { name: 'United States Dollar', code: 'USD' },
  { name: 'Uruguayan Peso', code: 'UYU' },
  { name: 'Vietnamese Dong', code: 'VND' },
  { name: 'West African CFA Franc', code: 'XOF' },
  { name: 'Zambian Kwacha', code: 'ZMW' },
  { name: 'Zimbabwean Dollar', code: 'ZWL' }
];




  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    private dropdownService: DropdownService,
    private dialogRef:MatDialog,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const item = this.inventoryService.getItemById(id);
      if (item) {
        this.inventoryItem = { ...item };
        this.isEdit = true;
      }
    }
  }

  // onLogoSelected(event: any) {
  //   const files = event.target.files;
  //   if (files.length > 0) {
  //     for (const file of files) {
  //       const reader = new FileReader();
  //       reader.onload = () => {
  //         if (!this.inventoryItem.images) {
  //           this.inventoryItem.images = [];
  //         }
  //         this.inventoryItem.images.push(reader.result as string);
  //         this.showLogo = true;
  //       };
  //       reader.readAsDataURL(file);
  //     }
  //   }
  // }





  onLogoSelected(event: any) {
    const files = event.target.files;
    if (files.length > 0) {
      if ((this.inventoryItem.images ? this.inventoryItem.images.length : 0) + files.length > 5) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'You can only upload a maximum of 5 images' });

        // this.toastr.error('You can only upload a maximum of 5 images.');
        // alert('masimum picture selected')
        return;
      }

      for (const file of files) {
        const reader = new FileReader();
        reader.onload = () => {
          if (!this.inventoryItem.images) {
            this.inventoryItem.images = [];
          }
          this.inventoryItem.images.push(reader.result as string);
          this.showLogo = true;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Image added successfully!' });
          
          // this.toastr.success('Image added successfully!');
        };
        reader.readAsDataURL(file);
      }
    }
  }







  
  removeImage(index: number) {
    if (this.inventoryItem.images) {
      this.inventoryItem.images.splice(index, 1);
      if (this.inventoryItem.images.length === 0) {
        this.showLogo = false;
      }
    }
  }

  onSubmit() {

    //   // Perform form validation
    // if (!this.isFormFilled()) {
    //   alert('Form must be filled out');
    //   return;
    // }

    if (this.isEdit) {
      this.inventoryService.updateItem(this.inventoryItem);
    } else {
      this.inventoryService.addItem(this.inventoryItem);
    }
    this.navigateToTable();
  }

  // Helper function to check if the form is filled
isFormFilled() {
  // Iterate over each property in the inventoryItem object
  for (let key in this.inventoryItem) {
    if (this.inventoryItem.hasOwnProperty(key)) {
      // Check if the property value is empty
      if (!this.inventoryItem[key]) {
        return false;
      }
    }
  }
  return true;
}

  navigateToTable() {
    this.router.navigate(['/inventory']);
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

  openNumberCurrencyDialog(){
    this.dialogRef.open(NumberCurrencyPopupComponent)
  }

  currency = this.currencyList;

  isDropdownOpen$(id: string) {
    return this.dropdownService.isDropdownOpen$(id);
  }

  getSelectedItem$(id: string): Observable<string | null> {
    return this.dropdownService.getSelectedItem$(id);
  }

  toggleDropdown(id: string) {
    this.dropdownService.toggleDropdown(id);
  }

  selectItem(id: string, item: { name: string; code: string }) {
    this.dropdownService.selectItem(id, `${item.name} (${item.code})`);
  }

}
