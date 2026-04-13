import { Component, EventEmitter, Output } from '@angular/core';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { MessageService } from 'primeng/api';
import { MetadataService } from '../../../service/metadata.service';
import { formatDate } from '@angular/common';
import { TimeSheetComponent } from '../../attendance/time-sheet/time-sheet.component';
import { EmailValidator } from '@angular/forms';
import { EmployeeService } from '../../../service/employee.service';

@Component({
  selector: 'app-bulk-employee-instruction',
  templateUrl: './bulk-employee-instruction.component.html',
  styleUrl: './bulk-employee-instruction.component.scss',
  providers: [MessageService],
})
export class BulkEmployeeInstructionComponent {
  fileName: string | null = null;
  isDragging = false;
  alert: string = ""
  file!: File; 
  @Output() close = new EventEmitter<void>()
  buttonText: string = "Submit"
  levels: any[]=[]
  leaves: any[]=[]
  employmentTypes: any[]=[]
  departments: any[] = []

  constructor(
    private messageService: MessageService,
    private token: RandomTokenService, private metadataService: MetadataService, private employeeService: EmployeeService ) {}

    ngOnInit() {
    this.metadataService.ensureMetaLoaded();
    this.metadataService.departments$.subscribe(data => (this.departments = data));
      this.metadataService.levels$.subscribe(data => (this.levels = data))
      this.metadataService.leaves$.subscribe(data => (this.leaves = data));
     this.metadataService.employment$.subscribe(data => this.employmentTypes = data);
    }
  // Triggered when file is selected through the input field
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
    const departments = this.departments.map(dept => dept.name).join(',');
    const levels = this.levels.map(level => level.name).join(',');
    const employmentTypes = this.employmentTypes.map(type => type.name).join(',');



  
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');
  
    const headers = [
      'Employee ID', 'First Name', 'Last Name', 'Email', 'Work Email',
      'Job Title', 'Department', 'Employment Type', 'Level', 'Supervisor', 
      'Status', 'Employment Start Date', 'Employment End Date', 'On Probation', 
      'Probation Start Date', 'Probation End Date', 'Appraisal Due Date'
    ];
    worksheet.addRow(headers);
  
    const rows = [
      [1, 'John', 'Doe', 'john@email.com', 'john.work@email', 'HR Manager', 'HR', 'Contract', 'Senior', 'Jon Bellion', 
      'Active', '2022-01-01', '2022-12-31', 'No', '2022-01-01', '2022-12-31', '2022-12-31']
    ];
    rows.forEach(row => worksheet.addRow(row));
  
    for (let i = 1; i <= 500; i++) {
      worksheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae:[`"${departments}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${levels}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
      worksheet.getCell(`H${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae:[`"${employmentTypes}"`],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
      worksheet.getCell(`K${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Joining, Active,"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
    }
  
    workbook.xlsx.writeBuffer().then((buffer: BlobPart) => {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'employee_data.xlsx';
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
      this.employeeService.addBulkEmployee(newEmployees).subscribe(
        {
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Employee added successfully!', key: 'tl', life: 3000 });
            resolve(true);
          },
          error: (err: any) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add employee. Please check your input.', key: 'tl', life: 3000 });
            console.error('Failed to add employee:', err);
            resolve(false);
          }
        }
      );

    });
  }
  
  
  
  
  validateDate(date: string): string | null {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString().split('T')[0];
  }
  
}
