import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
// import * as ExcelJS from "exceljs"
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Column, Row, Workbook } from 'exceljs';
import { ProductExcelColumns } from '../../models/enums';
import { PosServiceService } from '../../service/pos-service.service';
import {
  BranchDTO,
  DiscountDTO,
  MeasurementUnit,
  ProductCategoryPOST,
  ProductJSONFormat,
  ProductJSONFormatGET,
  ProductJSONFormatPOST,
  InventoryStatus,
} from '../../models/interface';
import { formatDate } from '@angular/common';
import { MessageService } from 'primeng/api';
import { MetadataService } from '../../service/metadata.service';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

interface ProductRow {
  name: string;
  description: string;
  branches: string[]; // ✅ this is what solves the issue
  sku: string;
  category: string;
  unit: string;
  reorder: number;
}
@Component({
  selector: 'app-excel-export-and-import',
  templateUrl: './excel-export-and-import.component.html',
  styleUrls: [],
})
export class ExcelExportAndImportComponent implements OnInit {
  fileName: string | null = null;
  isDragging = false;
  alert: string = ""
  file!: File;
  buttonText: string = "Submit"
  levels: any[]=[]
  leaves: any[]=[]
  employmentTypes: any[]=[]
  departments: any[] = []
  measurementUnits = Object.keys(MeasurementUnit)
  loading = false; 
  private readonly _defaultExpiryDate = new Date(
      Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000
    );
  @Output() fileUploaded = new EventEmitter<File>();
  @Output() close = new EventEmitter<boolean>();

  @Input() parsedProductArray: ProductJSONFormatPOST[] = [];

  private categoryNames: string[] = ['Food', 'Medicine'];
  private discountNames: string[] = ['Black Friday', '10%'];
  private branchNames: string[] = ['Wuse', 'HQ'];
  discounts: any[] = [];
  categories: any[] = [];
  suppliers: any[] = [];
  discountTypes: any[] = [];
  taxes: any[] = [];
  branches: BranchDTO[] = [];
  originalProducts: any[] = [];
  tableData: ProductRow[] = [
    {
      name: '',
      description: '',
      branches: [],
      sku: '',
      category: '',
      unit: '',
      reorder: 0
    }
  ];
  headers = [
     'S/N', 'Name', 'Description', 'Branch(es)', 'Part number', 'SKU',
    'Code', 'Category', 'Weight (KG)', 'Measurement Unit', 'Reorder Threshold',
    'Combo?', 'Combo Items',
  ];
  form: FormGroup;

  constructor(private posService: PosServiceService,
  private messageService: MessageService,
  private metadataService: MetadataService,
  private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      rows: this.fb.array([])
    });
    this.initRows(20);

  }

existingCodes = new Set<string>();
existingPartNumbers = new Set<string>();

  ngOnInit(): void {
  this.fetchMetaData();

  // 🔹 Initialize sets
  this.existingCodes = new Set<string>();
  this.existingPartNumbers = new Set<string>();

  // 🔹 Fetch all products from backend to fill the sets
  this.posService.getProducts().subscribe({
    next: (products) => {
      for (const p of products || []) {
        if (p.code) {
          this.existingCodes.add(p.code.trim().toLowerCase());
        }
        if (p.partNumber) {
          this.existingPartNumbers.add(p.partNumber.trim().toLowerCase());
        }
      }
    },
    error: (err) => {
      console.error('Failed to fetch existing products', err);
    }
  });
}


  get formArray(): FormArray {
    return this.form.get('rows') as FormArray;
  }
initRows(count: number) {
  for (let i = 0; i < count; i++) {
    this.formArray.push(this.addRow());
  }

}
addRow(): FormGroup {
  return this.fb.group({
    name: [''],
    description: [''],
    branches: [[]],
    partNumber: [''],
    sku: [''],
    code: [''],
    category: [''],
    weight: [null],
    unit: [''],
    reorderThreshold: [null],
    isCombo: [false],
    comboItems: ['']
  });
}

  fetchMetaData(){
    this.metadataService.discount$.subscribe(data => (this.discounts = data));
    this.metadataService.category$.subscribe(data => (this.categories = data));
    this.metadataService.supplier$.subscribe(data => (this.suppliers = data));
    this.metadataService.discountTypes$.subscribe(data => (this.discountTypes = data));
    this.metadataService.taxes$.subscribe(data => (this.taxes = data));
    this.metadataService.branches$.subscribe(data => (this.branches = data));
    this.metadataService.products$.subscribe(data => {this.originalProducts = data});


  }

// Helper: create inventory (with initial movement) after a product is created
private async createInventoryForNewProduct(
  productId: number,
  branchId: number,
  initialQty: number,
  purchasePrice: number,
  sellingPrice: number,
  supplierId?: number | null
): Promise<void> {
  const payload = {
    availableQuantity: Math.abs(Number(initialQty) || 0),
    status: (Number(initialQty) || 0) > 0 ? 'IN_STOCK' as InventoryStatus : 'OUT_OF_STOCK' as InventoryStatus,

    productId: Number(productId),          // keep productId (backend confirmed this worked)
    branchId: Number(branchId),
    stockMovement: (Number(initialQty) || 0) > 0 ? [
      {
        quantity: Math.abs(Number(initialQty) || 0),
        reference: 'Initial stock',
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        createdDate: new Date().toISOString(),
        supplierId: supplierId ?? null
        // DO NOT send id/stockMovementsId/createdById/ingredientId/inventoryId here
      }
    ] : []
  };

  await this.posService.createInventory(payload).toPromise();
}


private toNum(v: any, def = 0): number {
  const n = Number((v ?? '').toString().replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : def;
}

private toBranchId(row: any, fallbackBranchId: number): number {
  // Try to read “BranchId” or “Branch” from the Excel row; fall back to selected branch
  return this.toNum(row?.BranchId ?? row?.Branch ?? fallbackBranchId);
}

private resolveSupplierId(row: any, suppliers: Array<{id:number; name:string}>): number | null {
  // If your Excel has SupplierId column, use it directly; else try to match by name
  const excelId = this.toNum(row?.SupplierId, NaN);
  if (Number.isFinite(excelId)) return excelId;

  const name = (row?.Supplier || row?.SupplierName || '').toString().trim().toLowerCase();
  if (!name) return null;
  const hit = suppliers?.find(s => (s.name || '').toLowerCase() === name);
  return hit?.id ?? null;
}



  async generateExcelTemplate() {
    const MAX_RANGE = 110;
    const STARTING_INDEX = 1; // NOTE: The index starts at 1 instead of 0!

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Products to Add', {
      properties: { tabColor: { argb: 'FFC0000' } },
    });

    const applyCellAlignmentToRow = (
      row: Row,
      startIndex = STARTING_INDEX,
      maxRange = MAX_RANGE
    ) => {
      for (let i = startIndex; i <= maxRange; i++) {
        const cell = row.getCell(i);
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
      }
    };
    // REVIEW: I could probably merge these two functions together
    const applyBorderToRow = (
      row: Row,
      startIndex = STARTING_INDEX,
      maxRange = MAX_RANGE
    ) => {
      for (let i = startIndex; i <= maxRange; i++) {
        const cell = row.getCell(i);
        cell.border = {
          top: { style: 'thick' },
          right: { style: 'thick' },
          bottom: { style: 'thick' },
          left: { style: 'thick' },
        };
      }
    };
    const increaseCellWidthOfColumn = (
      columnIndexes: ProductExcelColumns[],
      rowToGetCells: Row
    ) => {
      columnIndexes.forEach((columnIndex) => {
        const index = columnIndex + 1;
        const column = worksheet.getColumn(index);
        const cellWidth = rowToGetCells.getCell(index).text.length + 2;

        column.width =
          (column.width ?? 0) < cellWidth ? cellWidth : column.width;
      });
    };

    // This stores the a row of values to serve as the first row in the spreadsheet
    const headers: string[] = [];
    headers[ProductExcelColumns.NAME] = 'Name';
    headers[ProductExcelColumns.DESCRIPTION] = 'Description';
    headers[ProductExcelColumns.IMAGE_URL] = 'Image URL';
    headers[ProductExcelColumns.BRANCH] = 'Branch';
    headers[ProductExcelColumns.CODE] = 'Code';
    headers[ProductExcelColumns.BASE_PRICE] = 'Base Price';
    headers[ProductExcelColumns.TAX_PERCENTAGE] = 'Tax (%)';
    // headers[ProductExcelColumns.DISCOUNT_PERCENTAGE] = 'Discount (%)';
    headers[ProductExcelColumns.DISCOUNT_NAME] = 'Discount Name';
    // headers[ProductExcelColumns.DISCOUNT_TYPE] = 'Discount Type';
    headers[ProductExcelColumns.QUANTITY] = 'Quantity';
    headers[ProductExcelColumns.SKU] = 'SKU';
    headers[ProductExcelColumns.PART_NUMBER] = 'Part Number';
    headers[ProductExcelColumns.CATEGORY] = 'Category';
    headers[ProductExcelColumns.VARIANTS] = 'Variant(s) (comma seperated)';
    headers[ProductExcelColumns.ITEM_WEIGHT] = 'Item Weight (in grams)';

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    applyCellAlignmentToRow(headerRow, undefined, ProductExcelColumns.END);
    applyBorderToRow(headerRow, undefined, ProductExcelColumns.END);

    // This is just to show the user how to fill in the data
    const sampleInfo: (string | number)[] = [];
    sampleInfo[ProductExcelColumns.NAME] = 'Dummy Product';
    sampleInfo[ProductExcelColumns.DESCRIPTION] =
      'The Dummy Product does everything out of the box!';
    // sampleInfo[ProductExcelColumns.IMAGE_URL] = ''; // TODO: Figure out how images should be added.
    sampleInfo[ProductExcelColumns.BRANCH] = ''; // TODO: Fetch these from somewhere
    sampleInfo[ProductExcelColumns.CODE] = 1500;
    sampleInfo[ProductExcelColumns.BASE_PRICE] = 1200;
    sampleInfo[ProductExcelColumns.TAX_PERCENTAGE] = 10;
    // sampleInfo[ProductExcelColumns.DISCOUNT_PERCENTAGE] = 0
    sampleInfo[ProductExcelColumns.DISCOUNT_NAME] = '';
    // sampleInfo[ProductExcelColumns.DISCOUNT_TYPE] = ;
    sampleInfo[ProductExcelColumns.QUANTITY] = 55;
    sampleInfo[ProductExcelColumns.SKU] = 1500;
    sampleInfo[ProductExcelColumns.PART_NUMBER] = 1500;
    sampleInfo[ProductExcelColumns.CATEGORY] = ''; // TODO:
    sampleInfo[ProductExcelColumns.VARIANTS] = 'Blue, Red, Yellow';
    sampleInfo[ProductExcelColumns.ITEM_WEIGHT] = 300;

    const sampleInfoRow = worksheet.addRow(sampleInfo);
    // for (let i = STARTING_INDEX; i < ProductExcelColumns.END; i++) {
    //   const cell = sampleInfoRow.getCell(i);

    //   cell.model.comment = {
    //     texts: [{ text: 'Make sure to delete this Dummy Data!' }],
    //   };
    // }

    const stringArrayToXlsxFormulae = (arr: string[]) => {
      return [`"${arr.join(',')}"`];
    };

    for (let i = STARTING_INDEX + 1; i < MAX_RANGE; i++) {
      const row = worksheet.getRow(i);
      const branchCell = row.getCell(ProductExcelColumns.BRANCH + 1);
      const discountNameCell = row.getCell(
        ProductExcelColumns.DISCOUNT_NAME + 1
      );
      const categoryCell = row.getCell(ProductExcelColumns.CATEGORY + 1);

      branchCell.dataValidation = {
        formulae: stringArrayToXlsxFormulae(this.branchNames),
        type: 'list',
        allowBlank: false,
      };
      discountNameCell.dataValidation = {
        formulae: stringArrayToXlsxFormulae(this.discountNames),
        type: 'list',
        allowBlank: true,
      };
      categoryCell.dataValidation = {
        formulae: stringArrayToXlsxFormulae(this.categoryNames),
        type: 'list',
        allowBlank: false,
      };

      applyCellAlignmentToRow(row, undefined, ProductExcelColumns.END);

      // REVIEW: I'm running it using both rows to ensure that each column is wide enough
      for (let j = 1; j <= 2; j++) {
        increaseCellWidthOfColumn(
          (() => {
            let i = ProductExcelColumns.START;
            const returnArr: ProductExcelColumns[] = [];
            while (i < ProductExcelColumns.END) {
              returnArr.push(i);
              i++;
            }
            return returnArr;
          })(),
          worksheet.getRow(j)
        );
      }
    }

    return workbook;
  }

  async downloadTemplate() {
    const template = await this.generateExcelTemplate();
    // console.log(template);

    try {
      // await template.xlsx.writeFile('product-template.xlsx');
      const buffer = await template.xlsx.writeBuffer();
      const xlsxBlob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const templateUrl = URL.createObjectURL(xlsxBlob);
      const link = document.createElement('a');
      link.href = templateUrl;
      link.download = 'product-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error writing file: ', error);
    }
  }

  // onFileSelected(event: Event): void {
  //   const input = event.target as HTMLInputElement;
  //   if (input.files && input.files.length > 0) {
  //     const file: File = input.files[0];
  //     this.fileUploaded.emit(file);
  //   }
  // }
  closeModal() {
    this.close.emit(false);
  }

  // onImageUpload(event: any) {
  //   const file = event.target.files[0];

  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = (e: any) => {
  //       this.productImage = e.target.result;
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // }
  onImageUpload(event: any) {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        // this.productImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }




  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.validateFile(file);
  }

  // Triggered when dragging a file over the drop area
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  // Triggered when dragging a file out of the drop area
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  // Triggered when a file is dropped
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    this.validateFile(file);
  }

  // Validate file type and size
  private validateFile(file: File | undefined): void {
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        this.fileName = file.name;
        this.file=file
        this.alert = ""
        console.log('File uploaded:', file);
      } else {
        this.alert = 'Please upload a valid .xlsx file';
      }
    }
  }

 createExcelSheet() {
    // Prepare dropdown options with **Name only** for relational fields
    const branches = this.branches.map(branch => branch.name).join(',');
    const categories = this.categories.map(cat => cat.name).join(',');
    const measurementUnits = this.measurementUnits.join(',');
    const discounts = this.discounts.map(discount => discount.name).join(',');
    const taxes = this.taxes.map(tax => tax.name).join(',');
    const suppliers = this.suppliers.map(supplier => supplier.name).join(',');
    const products = this.originalProducts.map(product => product.name).join(',');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    // Define headers with required fields marked with *
    const headers = [
        'Name*', 
        'Description*', 
        'Branch*', 
        'Category*',
        'Cost Price*',
        'Selling Price*',
        'Quantity*',
        'Expiry Date (YYYY-MM-DD)',
        'Discount',
        'Tax',
        'Supplier',
        'Part Number',
        'Code',
        'Measurement Unit',
        'Reorder Threshold',
        'Weight (KG)',
        'Is Combo? (TRUE/FALSE)',
        'Combo Items (comma separated names)'
    ];
    worksheet.addRow(headers);
          worksheet.columns = [
        { width: 25 }, // Name*
        { width: 30 }, // Description*
        { width: 20 }, // Branch*
        { width: 20 }, // Category*
        { width: 15 }, // Cost Price*
        { width: 15 }, // Selling Price*
        { width: 12 }, // Quantity*
        { width: 25 }, // Expiry Date
        { width: 20 }, // Discount
        { width: 16 }, // Tax
        { width: 20 }, // Supplier
        { width: 16 }, // Part Number
        { width: 16 }, // Code
        { width: 20 }, // Measurement Unit
        { width: 18 }, // Reorder Threshold
        { width: 15 }, // Weight (KG)
        { width: 20 }, // Is Combo?
        { width: 35 }  // Combo Items
      ];

    // Add sample data row
    const sampleRow = [
        'Sample Product', 
        'Product description', 
        branches.split(',')[0], // First branch as sample
        categories.split(',')[0], // First category as sample
        100, // Cost price
        150, // Selling price
        50, // Quantity
        '', // Expiry date
        discounts.split(',')[0], // First discount as sample
        taxes.split(',')[0], // First tax as sample
        suppliers.split(',')[0], // First supplier as sample
        'PART123', // Part number
        'CODE123', // Code
        measurementUnits.split(',')[0], // First unit as sample
        10, // Reorder threshold
        1.5, // Weight
        false, // Is combo
        '' // Combo items
    ];
    worksheet.addRow(sampleRow);

    // Add data validation for dropdowns
    const addDropdownValidation = (column: string, options: string, required: boolean = true) => {
        for (let i = 2; i <= 500; i++) {
            worksheet.getCell(`${column}${i}`).dataValidation = {
                type: 'list',
                allowBlank: !required,
                formulae: [`"${options}"`],
                showErrorMessage: true,
                errorTitle: 'Invalid Selection',
                error: 'Please select from the dropdown list.'
            };
        }
    };

    // Apply validation to columns
    addDropdownValidation('C', branches); // Branch
    addDropdownValidation('D', categories); // Category
    addDropdownValidation('I', discounts, false); // Discount
    addDropdownValidation('J', taxes, false); // Tax
    addDropdownValidation('K', suppliers, false); // Supplier
    addDropdownValidation('N', measurementUnits, false); // Measurement Unit

    // Special validation for combo items (uses existing products)
    for (let i = 2; i <= 500; i++) {
        worksheet.getCell(`R${i}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`"${products}"`],
            showErrorMessage: true,
            errorTitle: 'Invalid Product',
            error: 'Please select from existing products.'
        };
    }

    // Format numeric columns
    ['E', 'F', 'G', 'O', 'P'].forEach(col => {
        for (let i = 2; i <= 500; i++) {
            worksheet.getCell(`${col}${i}`).numFmt = '0.00';
        }
    });

    
    // for (let i = 2; i <= 500; i++) {
    //     worksheet.getCell(`H${i}`).numFmt = 'yyyy-mm-dd';
    // }
    
    for (let i = 2; i <= 500; i++) {
      worksheet.getCell(`H${i}`).dataValidation = {
        type: 'date',
        operator: 'between',
        allowBlank: true, 
        formulae: [new Date(1900, 0, 1), new Date(2999, 11, 31)],
        showErrorMessage: true,
        errorTitle: 'Invalid Date',
        error: 'Please enter a valid date in the format YYYY-MM-DD.'
      };
    }


    // Generate and download the file
    workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product_import_template.xlsx'; // Ensure .xlsx extension
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
}

  s2ab(s: string) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i !== s.length; ++i) {
    view[i] = s.charCodeAt(i) & 0xFF;
  }
  return buf;
  }


readExcelFile(): void {
  if (!this.file) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please select a file first',
      key: 'tl',
      life: 3000
    });
    return;
  }

  this.buttonText = "Processing...";
  const reader = new FileReader();

  reader.onload = async (event) => {
    try {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      await this.processProductImport(jsonData);

    } catch (error) {
      console.error('Error processing file:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to process the Excel file',
        key: 'tl',
        life: 3000
      });

    } finally {
     
      this.buttonText = "Submit";
    }
  };

  reader.onerror = () => {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to read the file',
      key: 'tl',
      life: 3000
    });
    this.buttonText = "Submit"; // also reset here
  };

  reader.readAsArrayBuffer(this.file);
}


async processProductImport(data: any[]): Promise<void> {
  const userName = sessionStorage.getItem("username") || 'system';
  let successCount = 0;
  let errorCount = 0;
  this.loading = true;

  const existingCodes = new Set<string>();

  // ✅ Fetch all name-to-ID mappings before the loop
 const branches   = await firstValueFrom(this.metadataService.branches$);
const categories = await firstValueFrom(this.metadataService.category$);
const taxes      = await firstValueFrom(this.metadataService.taxes$);
const discounts  = await firstValueFrom(this.metadataService.discount$);
const suppliers  = await firstValueFrom(this.metadataService.supplier$);


 const getIdByName = (list: any[], name: string): number | null => {
  const cleanName = (name || '').toString().trim().toLowerCase();
  const item = list.find((x) => (x?.name || '').toString().trim().toLowerCase() === cleanName);
  return item ? item.id : null;
};

 const getItemByName = (list: any[], name: string): number | null => {
  const cleanName = (name || '').toString().trim().toLowerCase();
  const item = list.find((x) => (x?.name || '').toString().trim().toLowerCase() === cleanName);
  return item || null
};


  for (const [index, row] of data.entries()) {
    const rowNumber = index + 2;

   try {

    const baseCode = row['Code']?.toString().trim();
    if (baseCode) {
      if (existingCodes.has(baseCode.toLowerCase())) {
        throw new Error(`Duplicate code "${baseCode}" already exists (row ${rowNumber})`);
      }
      existingCodes.add(baseCode.toLowerCase());
    }

    const partNumber = row['Part Number']?.toString().trim();
    if (partNumber) {
      if (this.existingPartNumbers?.has(partNumber.toLowerCase())) {
        throw new Error(`Duplicate part number "${partNumber}" already exists (row ${rowNumber})`);
      }
      this.existingPartNumbers?.add(partNumber.toLowerCase());
    }
     const name = row['Name*']?.toString().trim();
    if (!name) {
      throw new Error(`Product name is missing in row ${rowNumber}`);
    }
    let sku = row['SKU']?.toString().trim();
    if (!sku) {
      sku = this.generateSKU(name);
    }
    row['SKU'] = sku;
  

    const uniqueCode = this.generateUniqueCode(
      baseCode || 'AUTO-CODE',
      existingCodes
    );

      const product = {
        id: 0,
        name: String(row['Name*']),
        description: String(row['Description*']),
        code: baseCode,

        partNumber: row['Part Number'] || '',
        measurementUnit: row['Measurement Unit'] || 'UNIT',
        isBundle: String(row['Is Combo? (TRUE/FALSE)']).toLowerCase() === 'true',
        bundleItems: row['Combo Items (comma separated names)'] 
          ? this.parseComboItems(String(row['Combo Items (comma separated names)']))
          : [],
        productCategoryId: categories ? getIdByName(categories, row['Category*']) : null,

        variants: [],
        sku: row['SKU'] || '',
        purchasePrice: Number(row['Cost Price*']),
        sellingPrice: Number(row['Selling Price*']),
        quantity: Number(row['Quantity*']),
        weight: row['Weight (KG)'] ? Number(row['Weight (KG)']) : 0,
        reorderThreshold: row['Reorder Threshold'] ? Number(row['Reorder Threshold']) : 0,
        tax: [getItemByName(taxes, row['Tax'])],
        discountId: getIdByName(discounts, row['Discount']),
        supplierId: getIdByName(suppliers, row['Supplier']),
        branchId: getIdByName(branches, row['Branch*']),
        createdBy: userName,
        createdDate: new Date().toISOString(),
        expiryDate: row['Expiry Date (YYYY-MM-DD)'] || this._defaultExpiryDate.toISOString()
      };

      const formData = new FormData();
      formData.append("product", JSON.stringify(product));

      const defaultImage = await this.createDefaultImage(product.name);
      formData.append("files", defaultImage, 'default_product.jpg');


      await new Promise<void>((resolve, reject) => {
      this.posService.addProduct(formData).subscribe(
        async (response) => {
          if (!response?.id) {
            return reject(new Error('Empty product response (no id)'));
          }

          this.metadataService.fetchMetaData()

          // ✅ Create inventory right after product is created
          try {
            await this.createInventoryForNewProduct(
              response.id,
              Number(product.branchId || 0),
              Number(product.quantity || 0),
              Number(product.purchasePrice || 0),
              Number(product.sellingPrice || 0),
              product.supplierId ?? null
            );
            // optional: console.log the new inventory id if backend returns it
            // console.log('Inventory created for product', response.id);
          } catch (invErr) {
            // Don’t fail the whole row if inventory creation fails—just warn and continue
            console.warn('Inventory create failed for product', response.id, invErr);
          }

          successCount++;
          resolve();
        },
        (error) => reject(error)
      );
    });



    } catch (error: unknown) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error importing row ${rowNumber}:`, errorMessage);

      this.messageService.add({
        severity: 'error',
        summary: `Row ${rowNumber} Error`,
        detail: errorMessage,
        key: 'tl',
        life: 5000
      });
    }
  }

  this.loading = false;
  if (errorCount === 0) {
    this.messageService.add({
      severity: 'success',
      summary: 'Import Successful',
      detail: `${successCount} products imported successfully`,
      key: 'tl',
      life: 3000
    });
    this.close.emit(true);
  } else {
    this.messageService.add({
      severity: successCount > 0 ? 'warn' : 'error',
      summary: 'Import Completed',
      detail: `${successCount} succeeded, ${errorCount} failed`,
      key: 'tl',
      life: 5000
    });
  }
}


// Helper methods
private extractId(value: any): number | null {
  if (!value) return null;
  const str = value.toString();
  const match = str.match(/^(\d+):/);
  return match ? parseInt(match[1]) : parseInt(str);
}
private generateUniqueCode(baseCode: string, existingCodes: Set<string>): string {
  let newCode = baseCode || 'AUTO-CODE';
  let counter = 1;

  while (existingCodes.has(newCode.toLowerCase())) {
    newCode = `${baseCode}-${counter}`;
    counter++;
  }

  existingCodes.add(newCode.toLowerCase()); 
  return newCode;
}

private existingSKUs = new Set<string>();

private generateSKU(productName: string): string {
  const prefix = productName
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  let sku: string;
  let counter = 1;

  do {
    const number = counter.toString().padStart(4, '0');
    sku = `${prefix}-${number}`;
    counter++;
  } while (this.existingSKUs.has(sku));

  this.existingSKUs.add(sku);
  return sku;
}


private parseComboItems(input: string): any[] {
  if (!input) return [];
  return input.split(',')
    .map(item => {
      const id = this.extractId(item.trim());
      return id ? { productId: id, quantity: 1 } : null;
    })
    .filter(item => item !== null);
}

// Replace your existing createDefaultImage with this:
private createDefaultImage(name?: string): Promise<Blob> {
  return new Promise((resolve) => {
    const baseSize = 200;
    const scale = 2; // crisp on retina
    const canvas = document.createElement('canvas');
    canvas.width = baseSize * scale;
    canvas.height = baseSize * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      // fallback to empty blob
      return resolve(new Blob());
    }

    // stable color palette
    const palette = [
      '#3B82F6', // blue
      '#10B981', // emerald
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // violet
      '#06B6D4', // cyan
      '#F97316', // orange
      '#14B8A6', // teal
      '#EC4899', // pink
      '#84CC16', // lime
    ];

    const initial = (name?.trim()?.[0] ?? 'P').toUpperCase();
    const color = palette[initial.charCodeAt(0) % palette.length];

    // background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // letter
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // responsive font size
    const fontPx = Math.floor(baseSize * 0.6);
    ctx.font = `bold ${fontPx * scale}px Inter, Segoe UI, Arial, sans-serif`;

    ctx.fillText(initial, (baseSize * scale) / 2, (baseSize * scale) / 2);

    canvas.toBlob(
      (blob) => resolve(blob ?? new Blob()),
      'image/jpeg',
      0.9
    );
  });
}


  // Validate the extracted data
  async validateData(data: any[]): Promise<void> {
    const requiredFields = [
      'First Name', 'Last Name', 'Email', 'Work Email',
      'Job Title', 'Department', 'Employment Type', 'Level', 'Supervisor',
      'Status', 'Employment Start Date', 'Appraisal Due Date'
    ];

    let skippedCount = 0;
    let successfullyAddedCount = 0;
  console.log(data)
    for (const row of data) {
      const isMissingFields = requiredFields.some(field => !row[field]);

      if (isMissingFields) {
        skippedCount++;
        console.warn(`Skipped row due to missing fields:`, row);
      } else if (!(await this.addNewEmployee(data))) {
        skippedCount++;
      } else {
        successfullyAddedCount++;
      }
    }

    this.fileName = "";

    // Display appropriate message
    if (successfullyAddedCount > 0) {
      const message = skippedCount > 0
        ? `${successfullyAddedCount} employees added successfully. ${skippedCount} rows were skipped due to errors or duplicates.`
        : 'Employees added successfully!';
      this.messageService.add({ severity: 'success', summary: 'Success', detail: message, key: 'tl', life: 3000 });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No employees were added due to errors or duplicates. Please check your file.', key: 'tl', life: 3000 });
    }

    this.buttonText = "Submit";
    setTimeout(() => { this.close.emit() }, 2000);
  }


  toLocalDateTime(date: Date | string | null): string {
    if (!date) return '';
    const parsedDate = new Date(date);
    return formatDate(parsedDate, "yyyy-MM-dd'T'HH:mm:ss", 'en-US');
  }
  addNewEmployee(data: any): Promise<boolean> {
    console.log(this.levels)
    console.log(data[0]['Department'])

    const newEmployees = data.map((item: any) => ({
      ...(item['Employee ID'] && !isNaN(Number(item['Employee ID'])) && Number(item['Employee ID']) > 0
        ? { id: Number(item['Employee ID']) }
        : {}),
      firstName: item['First Name'],
      lastName: item['Last Name'],
      email: item['Email'],
      workEmail: item['Work Email'],
      jobTitle: item['Job Title'],
      departmentId: this.departments.find(dept => dept.name === item['Department'])?.id,
      levelId: this.levels.find(level => level.name === item['Level'])?.id,
      jobTypeId: this.employmentTypes.find(type => type.name === item['Employment Type'])?.id,
      supervisor: item['Supervisor'],
      status: item['Status'].toUpperCase() || 'ACTIVE',
      startDate: this.toLocalDateTime(this.validateDate(item['Employment Start Date'])),
      endDate: this.toLocalDateTime(this.validateDate(item['Employment End Date'])),
      onProbation: item['On Probation']?.toLowerCase() === 'yes' ? true : false,
      probationStartDate: this.toLocalDateTime(this.validateDate(item['Probation Start Date'])),
      probationEndDate: this.toLocalDateTime(this.validateDate(item['Probation End Date'])),
      appraisalDueDate: this.toLocalDateTime(this.validateDate(item['Appraisal Due Date'])),
    }));

    console.log(newEmployees);


    return new Promise<boolean>((resolve) => {
      // this.employeeService.addBulkEmployee(newEmployees).subscribe(
      //   {
      //     next: () => {
      //       this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Employee added successfully!', key: 'tl', life: 3000 });
      //       resolve(true);
      //     },
      //     error: (err: any) => {
      //       this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add employee. Please check your input.', key: 'tl', life: 3000 });
      //       console.error('Failed to add employee:', err);
      //       resolve(false);
      //     }
      //   }
      // );

    });
  }




  validateDate(date: string): string | null {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString().split('T')[0];
  }


  handleBranchChange(event: Event, rowIndex: number) {
    const select = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(select.selectedOptions).map(option => option.value);
    this.tableData[rowIndex].branches = selectedOptions;
  }
}
