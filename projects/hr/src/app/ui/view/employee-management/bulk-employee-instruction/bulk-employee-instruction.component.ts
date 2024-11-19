import { Component, EventEmitter, Output } from '@angular/core';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { MessageService } from 'primeng/api';

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

  constructor(
    private messageService: MessageService,
    private token: RandomTokenService, ) {}

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
    let salaryStructure = localStorage.getItem("salaryStructure");
    let salaryStructureMAP: string[] = [];
  
    if (salaryStructure) {
      try {
        const parsedStructure = JSON.parse(salaryStructure);
        parsedStructure.map((salary: { level: { toString: () => any; }; }) => {
          if (salary.level) {
            salaryStructureMAP.push(salary.level.toString().trim());
          }
        });
      } catch (error) {
        console.error("Invalid salaryStructure data in localStorage", error);
      }
    }
    const levelList = [`"${salaryStructureMAP.join(',')}"`];
    console.log("Level List:", levelList); 
  
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');
  
    const headers = [
      'Employee ID', 'First Name', 'Last Name', 'Email', 'Work Email',
      'Job Title', 'Department', 'Employment Type', 'Level', 'Supervisor', 
      'Status', 'Employment Start Date', 'Employment End Date', 'On Probation', 
      'Probation Start Date', 'Probation End Date', 'Appraisal Due Date', 'Annual Leave', 
      'Sick leave', 'Public Holiday', 'Casual leave', 'Bereavement leave', 
      'Managerial Access', 'Administrative Access'
    ];
    worksheet.addRow(headers);
  
    const rows = [
      [1, 'John', 'Doe', 'john@email.com', 'john.work@email', 'HR Manager', 'HR', 'Contract', 'Senior', 'Jon Bellion', 
      'Active', '2022-01-01', '2022-12-31', 'No', '2022-01-01', '2022-12-31', '2022-12-31', 5, 0, 8, 9, 8, 'Yes', 'Yes']
    ];
    rows.forEach(row => worksheet.addRow(row));
  
    for (let i = 2; i <= 100; i++) {
      worksheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Human Resources,Finance,Marketing,Sales,Operations,IT,Customer Service,Legal,Procurement,Administration,Product Development,Research Development,Quality Assurance"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
      worksheet.getCell(`H${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Contract,Full Time,Part Time,Internship,Seasonal,Temporary"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Selection',
        error: 'Please select a value from the dropdown.',
      };
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: levelList,
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
  
    workbook.xlsx.writeBuffer().then((buffer) => {
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
      
      // Get the first sheet's data
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert the sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log(jsonData)
      this.validateData(jsonData);
    };
    reader.readAsArrayBuffer(this.file);
  }

  // Validate the extracted data
  validateData(data: any[]): void {
    const requiredFields = [
      'First Name', 'Last Name', 'Email', 'Job Title', 'Department'
    ];
    
    // Track validation results
    let skippedCount = 0; // Number of employees skipped
    let successfullyAddedCount = 0; // Number of employees successfully added
  
    // Validate each row
    data.forEach(row => {
      const isMissingFields = requiredFields.some(field => !row[field]);
      
      if (isMissingFields) {
        skippedCount++;
        console.warn(`Skipped row due to missing fields:`, row);
      } else if (!this.addNewEmployee(row)) {
        // If `addNewEmployee` returns `false`, it means the employee was not added
        skippedCount++;
      } else {
        successfullyAddedCount++;
      }
    });
  
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
  
  
  addNewEmployee(data: any): boolean {
    const employeesFromStorage = localStorage.getItem("employeesList");
    const employeesList = employeesFromStorage ? JSON.parse(employeesFromStorage) : [];
  
    // Check if employee already exists (based on unique fields like Email or Employee ID)
    const existingEmployee = employeesList.find(
      (employee: any) =>
        employee.email === data['Email'] || 
        (data['Employee ID'] && employee.id === data['Employee ID'])
    );
  
    if (existingEmployee) {
    // this.messageService.add({ severity:'warn', summary: 'warning', detail: `Employee with Email: ${data['Email']} or ID: ${data['Employee ID']} already exists and is being skipped.`, key: 'tl', life: 5000  });

      return false; 
    }
  
    // Create new employee object
    const newEmployee = {
      id: data['Employee ID'] && !isNaN(Number(data['Employee ID'])) && Number(data['Employee ID']) > 0
        ? data['Employee ID']
        : this.token.getRandomToken(),
      firstName: data['First Name'],
      lastName: data['Last Name'],
      email: data['Email'],
      workemail: data['Work Email'],
      jobTitle: data['Job Title'],
      department: data['Department'],
      level: data['Level'],
      employmentType: data['Employment Type'],
      supervisor: data['Supervisor'],
      status: data['Status'] || 'Active',
      startDate: this.validateDate(data['Employment Start Date']),
      endDate: this.validateDate(data['Employment End Date']),
      isProbation: data['On Probation']?.toLowerCase() === 'yes',
      probationStartDate: this.validateDate(data['Probation Start Date']),
      probationEndDate: this.validateDate(data['Probation End Date']),
      appraisalDueDate: this.validateDate(data['Appraisal Due Date']),
      leave: {
        annual: data['Annual Leave'],
        sick: data['Sick leave'],
        holiday: data['Public Holiday'],
        bereavement: data['Bereavement leave'],
        casual: data['Casual leave']
      },
      employeePortalAccess: false,
      emailAccess: false,
      hrSystemAccess: false,
      projectManagementAccess: false,
      buildingAccess: false,
      managerialAccess: data['Managerial Access']?.toLowerCase() === 'yes',
      adminAccess: data['Administrative Access']?.toLowerCase() === 'yes',
    };
  
    // Add new employee
    console.log(`Adding new employee:`, newEmployee);
    employeesList.push(newEmployee);
    localStorage.setItem("employeesList", JSON.stringify(employeesList));
    return true
  }
  
  
  validateDate(date: string): string | null {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString().split('T')[0];
  }
  
}
