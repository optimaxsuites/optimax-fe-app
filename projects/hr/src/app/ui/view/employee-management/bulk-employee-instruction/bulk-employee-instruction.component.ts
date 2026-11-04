import { Component, EventEmitter, Output } from '@angular/core';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { MessageService } from 'primeng/api';
import { MetadataService } from '../../../service/metadata.service';
import { formatDate } from '@angular/common';
import { finalize } from 'rxjs';
import { EmployeeService } from '../../../service/employee.service';
import { findIdByName, parseSpreadsheetDate } from '../employee-import.util';

/** Template columns, in order. The upload is read by these header names. */
const COLUMNS = [
  'First Name', 'Last Name', 'Email', 'Work Email', 'Job Title', 'Department', 'Employment Type', 'Level',
  'Supervisor', 'Status', 'Employment Start Date', 'Employment End Date', 'On Probation',
  'Probation Start Date', 'Probation End Date', 'Appraisal Due Date',
];

const REQUIRED_COLUMNS = [
  'First Name', 'Last Name', 'Email', 'Work Email', 'Job Title', 'Department', 'Employment Type', 'Level',
  'Supervisor', 'Status', 'Employment Start Date', 'Appraisal Due Date',
];

/** Statuses a new employee can be created with; the template's Status dropdown offers these. */
const IMPORT_STATUSES = ['JOINING', 'ACTIVE'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Spreadsheet column letter for a template column. */
function columnLetter(column: string): string {
  return String.fromCharCode('A'.charCodeAt(0) + COLUMNS.indexOf(column));
}

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
  submitting = false;
  /** Why each skipped row was skipped ("Row 4: Department "Sales" not found"), shown under the upload. */
  rowErrors: string[] = [];
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
        this.rowErrors = [];
      } else {
        this.alert = 'Please upload a valid .xlsx file';
      }
    }
  }

  createExcelSheet() {
    const workbook = new ExcelJS.Workbook();
    // The upload reads the first sheet, so the empty Employees sheet must come first.
    const worksheet = workbook.addWorksheet('Employees');
    const example = workbook.addWorksheet('Example');

    // Dropdown values live on a hidden sheet: Excel caps a typed-in list ("A,B,C") at 255 characters,
    // which a company's departments or levels soon pass, and names containing commas would split.
    const lists = workbook.addWorksheet('Lists', { state: 'hidden' });
    const writeList = (column: string, values: string[]): string | null => {
      const names = values.filter((value) => !!value);
      names.forEach((value, index) => (lists.getCell(`${column}${index + 1}`).value = value));
      return names.length ? `Lists!$${column}$1:$${column}$${names.length}` : null;
    };
    const departmentList = writeList('A', this.departments.map(dept => dept.name));
    const levelList = writeList('B', this.levels.map(level => level.name));
    const employmentTypeList = writeList('C', this.employmentTypes.map(type => type.name));

    worksheet.addRow(COLUMNS);
    worksheet.getRow(1).font = { bold: true };

    // A filled-in row on its own sheet, so it can't be uploaded by mistake.
    example.addRow(COLUMNS);
    example.getRow(1).font = { bold: true };
    example.addRow([
      'John', 'Doe', 'john.doe@gmail.com', 'john.doe@company.com', 'HR Manager',
      this.departments[0]?.name ?? 'Human Resources', this.employmentTypes[0]?.name ?? 'Full-Time',
      this.levels[0]?.name ?? 'Senior', 'Jane Smith', 'Active', '2026-01-05', '', 'No', '', '', '2026-04-05',
    ]);
    example.addRow([]);
    example.addRow(['Fill in the Employees sheet, not this one. Dates as YYYY-MM-DD (or an Excel date). Status is Joining or Active.']);

    const listValidation = (formula: string) => ({
      type: 'list' as const,
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: 'Invalid Selection',
      error: 'Please select a value from the dropdown.',
    });
    const dateColumns = ['Employment Start Date', 'Employment End Date', 'Probation Start Date', 'Probation End Date', 'Appraisal Due Date'];

    // Row 1 is the header row, so dropdowns start at row 2.
    for (let i = 2; i <= 500; i++) {
      if (departmentList) worksheet.getCell(`${columnLetter('Department')}${i}`).dataValidation = listValidation(departmentList);
      if (levelList) worksheet.getCell(`${columnLetter('Level')}${i}`).dataValidation = listValidation(levelList);
      if (employmentTypeList) worksheet.getCell(`${columnLetter('Employment Type')}${i}`).dataValidation = listValidation(employmentTypeList);
      worksheet.getCell(`${columnLetter('Status')}${i}`).dataValidation = listValidation('"Joining,Active"');
      worksheet.getCell(`${columnLetter('On Probation')}${i}`).dataValidation = listValidation('"Yes,No"');
      dateColumns.forEach((column) => (worksheet.getCell(`${columnLetter(column)}${i}`).numFmt = 'yyyy-mm-dd'));
    }

    workbook.xlsx.writeBuffer().then((buffer: BlobPart) => {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'employee_data.xlsx';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
    });
  }

  readExcelFile(): void {
    if (this.submitting) return;
    if (!this.file) {
      this.alert = 'Please choose an .xlsx file first.';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        // Date cells come through as Excel serial numbers; parseSpreadsheetDate converts them.
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
        this.importRows(rows);
      } catch {
        this.alert = 'The file could not be read. Please fill in the template downloaded from this page.';
      }
    };
    reader.readAsArrayBuffer(this.file);
  }

  /** Checks every row, uploads the valid ones in one request, and lists why the rest were skipped. */
  private importRows(rows: Record<string, unknown>[]): void {
    this.alert = '';
    this.rowErrors = [];
    const employees: any[] = [];

    rows.forEach((row, index) => {
      // Spreadsheet row number: data starts on row 2, under the header.
      const rowNumber = index + 2;
      if (COLUMNS.every((column) => this.text(row[column]) === '')) return;
      const result = this.buildEmployee(row);
      if (typeof result === 'string') {
        this.rowErrors.push(`Row ${rowNumber}: ${result}`);
      } else {
        employees.push(result);
      }
    });

    if (employees.length === 0) {
      this.alert = this.rowErrors.length
        ? 'No employees were added. Fix the rows below and upload again.'
        : 'The sheet has no employee rows.';
      return;
    }

    this.submitting = true;
    this.buttonText = 'Submitting...';
    this.employeeService.addBulkEmployee(employees)
      .pipe(finalize(() => {
        this.submitting = false;
        this.buttonText = 'Submit';
      }))
      .subscribe({
        next: () => {
          const skipped = this.rowErrors.length;
          const detail = skipped > 0
            ? `${employees.length} employee(s) added. ${skipped} row(s) skipped; see the list below.`
            : `${employees.length} employee(s) added successfully.`;
          this.messageService.add({ severity: 'success', summary: 'Success', detail, key: 'tl', life: 4000 });
          this.fileName = '';
          // Stay open when rows were skipped, so HR can read why.
          if (skipped === 0) {
            setTimeout(() => this.close.emit(), 2000);
          }
        },
        error: (err: any) => {
          const detail = err?.error?.message || 'Failed to add employees. Please check the file and try again.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'tl', life: 5000 });
        }
      });
  }

  /** The create payload for one row, or why the row can't be imported. */
  private buildEmployee(row: Record<string, unknown>): any | string {
    const problems: string[] = [];
    const value = (column: string) => this.text(row[column]);

    const missing = REQUIRED_COLUMNS.filter((column) => value(column) === '');
    if (missing.length) problems.push(`missing ${missing.join(', ')}`);

    ['Email', 'Work Email'].forEach((column) => {
      if (value(column) && !EMAIL_PATTERN.test(value(column))) problems.push(`${column} "${value(column)}" is not a valid email`);
    });

    const lookup = (column: string, items: any[]) => {
      const id = findIdByName(items, value(column));
      if (value(column) && id === undefined) problems.push(`${column} "${value(column)}" not found`);
      return id;
    };
    const departmentId = lookup('Department', this.departments);
    const levelId = lookup('Level', this.levels);
    const jobTypeId = lookup('Employment Type', this.employmentTypes);

    const status = value('Status').toUpperCase();
    if (status && !IMPORT_STATUSES.includes(status)) problems.push(`Status "${value('Status')}" must be Joining or Active`);

    const date = (column: string) => {
      if (value(column) === '') return '';
      const parsed = parseSpreadsheetDate(row[column]);
      if (!parsed) {
        problems.push(`${column} "${value(column)}" is not a date`);
        return '';
      }
      return formatDate(parsed, "yyyy-MM-dd'T'HH:mm:ss", 'en-US');
    };
    const employementStartDate = date('Employment Start Date');
    const employmentEndDate = date('Employment End Date');
    const probationStartDate = date('Probation Start Date');
    const probationEndDate = date('Probation End Date');
    const appraisalDueDate = date('Appraisal Due Date');

    if (problems.length) return problems.join('; ');

    // Same field names as the single-employee create. No id: this only creates, it never updates.
    return {
      firstName: value('First Name'),
      lastName: value('Last Name'),
      email: value('Email'),
      workEmail: value('Work Email'),
      jobTitle: value('Job Title'),
      departmentId,
      levelId,
      jobTypeId,
      supervisor: value('Supervisor'),
      employeeStatus: status,
      employementStartDate,
      employmentEndDate,
      onProbation: value('On Probation').toLowerCase() === 'yes',
      probationStartDate,
      probationEndDate,
      appraisalDueDate,
    };
  }

  /** A cell as trimmed text; numbers and dates included, so a numeric cell can't crash string methods. */
  private text(cell: unknown): string {
    return cell === null || cell === undefined ? '' : String(cell).trim();
  }
}
