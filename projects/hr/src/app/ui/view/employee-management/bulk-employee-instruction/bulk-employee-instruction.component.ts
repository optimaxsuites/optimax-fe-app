import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
@Component({
  selector: 'app-bulk-employee-instruction',
  templateUrl: './bulk-employee-instruction.component.html',
  styleUrl: './bulk-employee-instruction.component.scss'
})
export class BulkEmployeeInstructionComponent {
  fileName: string | null = null;
  isDragging = false;
  alert: string = ""

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
        this.alert = ""
        console.log('File uploaded:', file);
      } else {
        this.alert = 'Please upload a valid .xlsx file';
      }
    }
  }

  createExcelSheet() {
 
    const wb = XLSX.utils.book_new();
  
  // Define headers for the columns
  const headers = [
    'Employee ID', 'First Name', 'Last Name', 'Email', 'Work Email',
    'Job Title', 'Department', 'Employment Type', 'Level', 'Supervisor', 
    'Status', 'Employment Start Date', 'Employment End Date', 'On Probation', 
    'Probation Start Date', 'Probation End Date', 'Appraisal Due Date', 'Annual Leave', 
    'Sick leave', 'Public Holiday', 'Casual leave', 'Bereavement leave', 
    'Managerial Access', 'Administrative Access'
  ];

  // Add sample rows of data for the employees
  const rows = [
    [1, 'John', 'Doe', 'john@email.com', 'john.work@email', 'HR Manager', 'HR', 'Contract', 'Senior', 'Jon Bellion', 
    'Active', '2022-01-01', '2022-12-31', 'No', '2022-01-01', '2022-12-31', '2022-12-31', 5, 0, 8, 9, 8, 'Yes', 'Yes']
  ];

  // Create the worksheet from the header and rows data
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Add data validation (dropdown for 'Department' column)
  ws['!dataValidations'] = [{
    sqref: 'G2:G100',  // Range for the Department column (G2 to G100)
    type: 'list',
    formula1: '"HR,Engineering,Sales"',  // Dropdown options for the Department
    showDropDown: true  // Show dropdown button in the cell
  }];

  // Append the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');

  // Write the Excel file to binary format
  const excelFile = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  const blob = new Blob([this.s2ab(excelFile)], { type: 'application/octet-stream' });

  // Create a link and trigger a download of the file
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'employee_data_with_dropdown.xlsx';
  link.click();
}


  s2ab(s: string) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i !== s.length; ++i) {
    view[i] = s.charCodeAt(i) & 0xFF;
  }
  return buf;
  }
  
}
