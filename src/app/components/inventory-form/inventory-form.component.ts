import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../../services/inventory/inventory.service';
import { AngularEditorConfig } from '@kolkov/angular-editor';
import { DropdownService } from '../../services/dropdown/dropdown.service';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NumberCurrencyPopupComponent } from '../number-currency-popup/number-currency-popup.component';



interface InventoryItem {
  id?: string;
  itemName?: string;
  partNo?: number;
  image?: string;
  description?: string;
  buyingPrice?: number;
  sellingPrice?: number;
  initialStock?: number;
  purchaseLedger?: string;
  salesLedger?: string;
  inventoryLedger?: string;
  taxRate?: number;
  hsn?: string;
  tag?: string;
}


@Component({
  selector: 'app-inventory-form',
  templateUrl: './inventory-form.component.html',
  styleUrl: './inventory-form.component.scss'
})
export class InventoryFormComponent implements OnInit {


  inventoryItem: InventoryItem = {};

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
    private router: Router,
    private route: ActivatedRoute,
    private inventoryService: InventoryService,
    private dropdownService: DropdownService,
    private dialogRef:MatDialog,
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

  onSubmit() {
    if (this.isEdit) {
      this.inventoryService.updateItem(this.inventoryItem);
    } else {
      this.inventoryService.addItem(this.inventoryItem);
    }
    this.navigateToTable();
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

  selectItem(id: string, item: string) {
    this.dropdownService.selectItem(id, item);
  }

}
