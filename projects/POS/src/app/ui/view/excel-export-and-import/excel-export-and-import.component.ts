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
  ProductCategoryDTO,
  ProductJSONFormat,
} from '../../models/interface';
import { formatDate } from '@angular/common';
import { MessageService } from 'primeng/api';
import { MetadataService } from '../../service/metadata.service';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';

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
  
  @Output() fileUploaded = new EventEmitter<File>();
  @Output() close = new EventEmitter<false>();

  @Input() parsedProductArray: ProductJSONFormat[] = [];

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



  ngOnInit(): void {
   this.fetchMetaData()

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
    const branches = this.branches.map(branch => branch.name).join(',');
    const categories = this.categories.map(cat => cat.name).join(',');
    const measurementUnits = this.measurementUnits.map(type => type).join(',');



  
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');
  
    const headers = [
      'Name', 'Description', 'Branch(es)', 'Part number', 'SKU',
      'Code', 'Category', 'Weight (KG)', 'Measurement Unit', 'Reorder Threshold', 
      'Combo?', 'Combo Items', 
    ];
    worksheet.addRow(headers);
  
    const rows = [
      ['Water', 'Table Water', 'Headquarter', 'tablewater1', 'table-water', 'water1', 'Drinks',15, 'UNIT', 5, 
      false, []]
    ];
    rows.forEach(row => worksheet.addRow(row));
  
    for (let i = 1; i <= 500; i++) {
      worksheet.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae:[`"${branches}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
      worksheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${categories}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae:[`"${measurementUnits}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
      // worksheet.getCell(`K${i}`).dataValidation = {
      //   type: 'list',
      //   allowBlank: true,
      //   formulae: ['"Joining, Active,"'],
      //   showErrorMessage: true,
      //   errorTitle: 'Invalid Selection',
      //   error: 'Please select a value from the dropdown.',
      // };
    }
  
    workbook.xlsx.writeBuffer().then((buffer: BlobPart) => {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'product_data.xlsx';
      link.click();
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
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      
    //   Get the first sheet's data
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

    //   Convert the sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // console.log(jsonData)
      this.addNewEmployee(jsonData);
    };
    reader.readAsArrayBuffer(this.file);
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
