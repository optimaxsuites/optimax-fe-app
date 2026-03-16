import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import * as XLSX from 'xlsx';
// mammoth ships its own d.ts; webpack uses the 'browser' field for browser-safe module resolution
import * as mammoth from 'mammoth';
import { PdfParsingService } from '../../../services/pdf-parsing.service';

interface Transaction {
  id: string;
  date: Date;
  description: string;
  reference?: string;
  type: 'Income' | 'Expense' | 'Transfer';
  account: string;
  debit?: number;
  credit?: number;
  balance: number;
  status: 'Posted' | 'Draft' | 'Needs Review' | 'Flagged';
}

// Bank Statement Upload Interfaces
interface UploadedStatement {
  fileName: string;
  uploadDate: Date;
  rawData: any[];
  mappedData: StatementRow[];
  mapping: FieldMapping;
  totalRows: number;
  validRows: number;
  errorRows: number;
}

interface StatementRow {
  rowNumber: number;
  date: string | Date;
  description: string;
  amount: number;
  balance?: number;
  reference?: string;
  debitCredit: 'debit' | 'credit';
  selected: boolean;
  ignored: boolean;
  hasError: boolean;
  errorMessage?: string;
  isDuplicate: boolean;
  warningMessage?: string;
}

interface FieldMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  debitColumn?: string;
  creditColumn?: string;
  balanceColumn?: string;
  referenceColumn?: string;
  debitCreditColumn?: string;
}

interface ColumnOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-general-transactions',
  templateUrl: './general-transactions.component.html',
  styleUrls: ['./general-transactions.component.scss']
})
export class GeneralTransactionsComponent implements OnInit {

  // Date Filters
  fromDate: string = '';
  toDate: string = '';
  activePreset: string = 'thisMonth';
  currentCalendarDate: Date = new Date();

  // Calendar View Data
  calendarDays: number[] = [];
  calendarEmpties: number[] = [];

  // Modal State
  showModal: boolean = false;
  modalType: 'income' | 'expense' = 'income';

  // Bank Statement Upload State
  showUploadModal: boolean = false;
  showPreviewModal: boolean = false;
  showMappingModal: boolean = false;
  showConfirmImportModal: boolean = false;
  isProcessingFile: boolean = false;
  uploadProgress: number = 0;

  // Upload Data
  selectedFile: File | null = null;
  currentStatement: UploadedStatement | null = null;
  availableColumns: ColumnOption[] = [];
  fieldMapping: FieldMapping = {
    dateColumn: '',
    descriptionColumn: '',
    amountColumn: '',
    debitColumn: '',
    creditColumn: '',
    balanceColumn: '',
    referenceColumn: '',
    debitCreditColumn: ''
  };

  // ── File Preview State ──────────────────────────────────────────
  /** Holds the Uint8Array for PDF rendering via ng2-pdf-viewer */
  pdfSrc: Uint8Array | null = null;
  /** Raw HTML extracted from DOCX via mammoth */
  docxHtml: string = '';
  /** true after a file has been parsed and a preview is available */
  showFilePreview: boolean = false;
  /** Detected file category */
  fileType: 'pdf' | 'excel' | 'csv' | 'docx' | null = null;
  // ────────────────────────────────────────────────────────────────

  transactions: Transaction[] = [
    {
      id: 'tx_1',
      date: new Date('2026-02-02'),
      description: 'POS Sale - Daily Total',
      reference: 'POS-001',
      type: 'Income',
      account: 'Bank - GTB',
      credit: 120000,
      balance: 540000,
      status: 'Posted'
    },
    {
      id: 'tx_2',
      date: new Date('2026-02-02'),
      description: 'Fuel for Generator',
      type: 'Expense',
      account: 'Transport',
      debit: 10000,
      balance: 530000,
      status: 'Needs Review'
    },
    {
      id: 'tx_3',
      date: new Date('2026-02-01'),
      description: 'Transfer to Petty Cash',
      type: 'Transfer',
      account: 'Cash -> Bank',
      credit: 50000,
      balance: 520000,
      status: 'Posted'
    },
    {
      id: 'tx_4',
      date: new Date('2026-01-31'),
      description: 'Monthly Internet Bill',
      reference: 'INV-999',
      type: 'Expense',
      account: 'Utilities',
      debit: 25000,
      balance: 470000,
      status: 'Draft'
    }
  ];

  presets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'custom', label: 'Custom' }
  ];

  constructor(
    private messageService: MessageService,
    private pdfParsingService: PdfParsingService
  ) { }

  ngOnInit(): void {
    this.initDateFilters();
    this.generateCalendar();
  }

  initDateFilters() {
    const now = new Date();
    this.toDate = now.toISOString().split('T')[0];
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = firstDay.toISOString().split('T')[0];
  }

  // --- Calendar Logic ---
  generateCalendar() {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    this.calendarEmpties = Array.from({ length: firstDay }, (_, i) => i);
  }

  changeCalendarMonth(delta: number) {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + delta);
    this.currentCalendarDate = new Date(this.currentCalendarDate);
    this.generateCalendar();
  }

  selectCalendarDay(day: number) {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const clickedDate = new Date(year, month, day, 12, 0, 0, 0);
    const dateStr = clickedDate.toISOString().split('T')[0];

    if (this.activePreset !== 'custom' || this.fromDate !== this.toDate) {
      this.fromDate = dateStr;
      this.toDate = dateStr;
      this.activePreset = 'custom';
    } else {
      if (dateStr < this.fromDate) {
        this.toDate = this.fromDate;
        this.fromDate = dateStr;
      } else {
        this.toDate = dateStr;
      }
    }
    this.reloadTransactions();
  }

  isDateSelected(day: number): boolean {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const checkDate = new Date(year, month, day, 12, 0, 0, 0);
    const checkDateStr = checkDate.toISOString().split('T')[0];
    return checkDateStr >= this.fromDate && checkDateStr <= this.toDate;
  }

  // --- Filter Actions ---
  onDateRangeChange() {
    this.activePreset = 'custom';
    this.reloadTransactions();
  }

  applyPreset(presetId: string) {
    this.activePreset = presetId;
    const now = new Date();

    switch (presetId) {
      case 'today':
        this.fromDate = now.toISOString().split('T')[0];
        this.toDate = now.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        this.fromDate = yest.toISOString().split('T')[0];
        this.toDate = yest.toISOString().split('T')[0];
        break;
      case 'thisMonth':
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        this.fromDate = first.toISOString().split('T')[0];
        this.toDate = now.toISOString().split('T')[0];
        break;
    }
    this.reloadTransactions();
  }

  reloadTransactions() {
    console.log('Fetching transactions for', this.fromDate, 'to', this.toDate);
  }

  // --- Styling Helpers ---
  getTypeColor(type: string): string {
    switch (type) {
      case 'Income': return 'text-customGreen border-customGreen bg-green-50';
      case 'Expense': return 'text-red-500 border-red-500 bg-red-50';
      case 'Transfer': return 'text-blue-500 border-blue-500 bg-blue-50';
      default: return 'text-gray-500';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Posted': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Needs Review': return 'bg-blue-100 text-blue-800';
      case 'Flagged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // --- Modal Actions ---
  openAddModal(type: 'income' | 'expense') {
    this.modalType = type;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  // ========== BANK STATEMENT UPLOAD METHODS ==========

  openUploadModal() {
    this.showUploadModal = true;
    this.resetUploadState();
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.resetUploadState();
  }

  onFileSelected(event: any) {
    const file = event.target?.files?.[0] || event.files?.[0];
    if (file) this.validateAndProcessFile(file);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.validateAndProcessFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  validateAndProcessFile(file: File) {
    const validExtensions = /\.(xlsx|xls|csv|pdf|docx|doc)$/i;
    const maxSize = 10 * 1024 * 1024; // 10 MB

    if (!validExtensions.test(file.name)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File Type',
        detail: 'Please upload Excel (.xlsx, .xls), CSV, PDF, or Word (.docx) files only',
        life: 5000
      });
      return;
    }

    if (file.size > maxSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'File Too Large',
        detail: 'File size must be less than 10MB',
        life: 5000
      });
      return;
    }

    this.selectedFile = file;
    this.processFile(file);
  }

  // ── Core file processor – reads as ArrayBuffer then routes by type ──
  processFile(file: File) {
    this.isProcessingFile = true;
    this.uploadProgress = 0;
    this.showFilePreview = false;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    const reader = new FileReader();
    reader.onloadstart = () => { this.uploadProgress = 10; };
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        this.uploadProgress = Math.round((e.loaded / e.total) * 80);
      }
    };

    reader.onload = async (e) => {
      this.uploadProgress = 90;
      const arrayBuffer = e.target?.result as ArrayBuffer;
      console.log('File loaded into ArrayBuffer, size:', arrayBuffer.byteLength);

      try {
        if (ext === 'csv') {
          this.fileType = 'csv';
          await this.parseWithSheetJS(arrayBuffer, 'csv');
        } else if (ext === 'xlsx' || ext === 'xls') {
          this.fileType = 'excel';
          await this.parseWithSheetJS(arrayBuffer, 'excel');
        } else if (ext === 'pdf') {
          this.fileType = 'pdf';
          await this.parseWithPdfJs(arrayBuffer);
        } else if (ext === 'docx' || ext === 'doc') {
          this.fileType = 'docx';
          await this.parseWithMammoth(arrayBuffer);
        }
        this.uploadProgress = 100;
      } catch (err: any) {
        this.isProcessingFile = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Parse Error',
          detail: err?.message ?? 'Could not read the file. Please check the format.',
          life: 5000
        });
      }
    };

    reader.onerror = () => {
      this.isProcessingFile = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Read Error',
        detail: 'Could not read the file. Please try again.',
        life: 5000
      });
    };

    reader.readAsArrayBuffer(file);
  }

  // ── SheetJS parser – handles CSV, XLSX, XLS ──────────────────────
  private async parseWithSheetJS(buffer: ArrayBuffer, type: 'csv' | 'excel') {
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, {
      type: 'array',
      cellDates: true,
      dateNF: 'yyyy-mm-dd'
    });

    // Use the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      console.warn('SheetJS: No sheets found in workbook.');
      this.buildStatementFromRawData([]);
      return;
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      console.warn('SheetJS: Worksheet not found:', sheetName);
      this.buildStatementFromRawData([]);
      return;
    }

    // Try to get headers from first row, but if it's very sparse, check next few rows
    let rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd',
      defval: ''
    });

    if (rawData.length === 0) {
      // Fallback: search for a row that looks like a header (contains 'date', 'amount', etc)
      const fullRange: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const headerRowIndex = fullRange.findIndex(row => 
        row.some(cell => /date|desc|amount|narr|ref/i.test(String(cell)))
      );
      
      if (headerRowIndex >= 0) {
        rawData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          dateNF: 'yyyy-mm-dd',
          defval: '',
          range: headerRowIndex
        });
      }
    }

    if (rawData.length === 0) {
      console.warn('SheetJS: No rows found even after fallback. Creating empty state.');
      rawData = []; // Allow proceeding to manual entry
    }

    console.log('SheetJS rawData extract:', rawData.slice(0, 2));
    this.buildStatementFromRawData(rawData);
  }

  // ── Mammoth parser – handles DOCX ────────────────────────────────
  private async parseWithMammoth(buffer: ArrayBuffer) {
    // Generate HTML for the visual preview
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
    this.docxHtml = htmlResult.value;

    // Extract plain text to attempt row parsing
    const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
    const lines = textResult.value
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    if (lines.length < 2) {
      // Can't auto-detect columns – show preview only so user can manually map
      this.showFilePreview = true;
      this.isProcessingFile = false;
      this.uploadProgress = 100;
      this.messageService.add({
        severity: 'warn',
        summary: 'Manual mapping needed',
        detail: 'Word document detected. Review the preview and map columns manually.',
        life: 5000
      });
      return;
    }

    // Treat first non-empty line as header, rest as data
    const headers = lines[0].split(/\t|  +/).map((h: string) => h.trim()).filter(Boolean);

    if (headers.length < 2) {
      // Fallback: single "Description" column with each line as a row
      const rawData = lines.slice(1).map((line: string) => ({ Description: line }));
      this.buildStatementFromRawData(rawData);
    } else {
      const rawData = lines.slice(1).map((line: string) => {
        const cells = line.split(/\t|  +/).map((c: string) => c.trim());
        const row: any = {};
        headers.forEach((h: string, i: number) => { row[h] = cells[i] ?? ''; });
        return row;
      });
      this.buildStatementFromRawData(rawData);
    }

    this.showFilePreview = true;
  }

  // ── pdf.js text extraction ────────────────────────────────────────
  private async parseWithPdfJs(buffer: ArrayBuffer) {
    // Store a Uint8Array copy for the <pdf-viewer> display
    this.pdfSrc = new Uint8Array(buffer.slice(0));
    this.showFilePreview = true;

    try {
      this.isProcessingFile = true;
      this.uploadProgress = 50;

      const rawData = await this.pdfParsingService.extractTableData(buffer);
      
      if (rawData.length === 0) {
        console.warn('PDF: No rows extracted by PdfParsingService.');
        this.buildStatementFromRawData([]);
        return;
      }

      console.log('PDF: Extracted rows count:', rawData.length);
      this.uploadProgress = 100;
      this.buildStatementFromRawData(rawData);
      
    } catch (pdfErr: any) {
      console.warn('PDF text extraction failed, showing visual preview only.', pdfErr);
      this.isProcessingFile = false;
      this.uploadProgress = 100;
      this.messageService.add({
        severity: 'error',
        summary: 'PDF Parsing Failed',
        detail: pdfErr?.message || 'Failed to extract data from PDF.',
        life: 5000
      });
      this.buildStatementFromRawData([]);
    }
  }

  /** Manual transition for cases where auto-parse didn't trigger buildStatementFromRawData */
  proceedToMappingManual() {
    console.log('Manual proceed requested. currentStatement:', !!this.currentStatement, 'file:', !!this.selectedFile);
    if (!this.currentStatement && this.selectedFile) {
      this.buildStatementFromRawData([]);
    } else if (this.currentStatement) {
      // If it exists but modal is still open, force close it
      this.showUploadModal = false;
      if (this.needsMappingConfirmation()) {
        this.showMappingModal = true;
      } else {
        this.showPreviewModal = true;
      }
    }
  }

  // ── Shared post-parse builder ─────────────────────────────────────
  private buildStatementFromRawData(rawData: any[]) {
    // If rawData is empty, we just skip columns but still create the statement object
    if (rawData.length > 0) {
      // Extract columns
      this.availableColumns = Object.keys(rawData[0]).map(key => ({
        value: key,
        label: key
      }));
    } else {
      this.availableColumns = [];
    }

    // Auto-detect field mapping
    this.autoDetectMapping(rawData);

    const mappedData = rawData.length > 0 ? this.mapDataToRows(rawData) : [];

    this.currentStatement = {
      fileName: this.selectedFile?.name ?? 'Unknown',
      uploadDate: new Date(),
      rawData,
      mappedData,
      mapping: { ...this.fieldMapping },
      totalRows: mappedData.length,
      validRows: mappedData.filter(r => !r.hasError).length,
      errorRows: mappedData.filter(r => r.hasError).length
    };

    this.isProcessingFile = false;
    this.showFilePreview = true;
    this.showUploadModal = false;

    if (this.needsMappingConfirmation()) {
      this.showMappingModal = true;
    } else {
      this.showPreviewModal = true;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'File Parsed',
      detail: `${this.currentStatement.totalRows} rows found · ${this.currentStatement.validRows} valid · ${this.currentStatement.errorRows} errors`,
      life: 4000
    });
  }

  // Auto-detect field mapping
  autoDetectMapping(data: any[]) {
    if (data.length === 0) return;
    const keys = Object.keys(data[0]);
    keys.forEach(key => {
      const lowerKey = key.toLowerCase();
      // Date patterns
      if (lowerKey.includes('date') || lowerKey.includes('value date') || lowerKey.includes('trans date') || lowerKey.includes('post date')) {
        this.fieldMapping.dateColumn = this.fieldMapping.dateColumn || key;
      }
      // Description patterns
      if (lowerKey.includes('desc') || lowerKey.includes('narr') || lowerKey.includes('detail') || lowerKey.includes('particular') || lowerKey.includes('remarks') || lowerKey.includes('memo')) {
        this.fieldMapping.descriptionColumn = this.fieldMapping.descriptionColumn || key;
      }
      // Amount patterns
      if (lowerKey.includes('amount') || lowerKey.includes('value') || lowerKey.includes('amt') || lowerKey.includes('sum')) {
        this.fieldMapping.amountColumn = this.fieldMapping.amountColumn || key;
      }
      // Reference patterns
      if (lowerKey.includes('ref') || lowerKey.includes('reference') || lowerKey.includes('cheque') || lowerKey.includes('check') || lowerKey.includes('id') || lowerKey.includes('no.')) {
        this.fieldMapping.referenceColumn = this.fieldMapping.referenceColumn || key;
      }
      // Debit patterns
      if (lowerKey === 'debit' || lowerKey.includes('dr') || lowerKey.includes('withdrawal') || lowerKey.includes('outflow')) {
        this.fieldMapping.debitColumn = this.fieldMapping.debitColumn || key;
      }
      // Credit patterns
      if (lowerKey === 'credit' || lowerKey.includes('cr') || lowerKey.includes('deposit') || lowerKey.includes('inflow')) {
        this.fieldMapping.creditColumn = this.fieldMapping.creditColumn || key;
      }
      // Balance patterns
      if (lowerKey.includes('balance') || lowerKey.includes('bal')) {
        this.fieldMapping.balanceColumn = this.fieldMapping.balanceColumn || key;
      }
      // Debit/Credit Type Indicator patterns
      if (lowerKey.includes('type') || lowerKey.includes('indicator') || (lowerKey.includes('dr') && lowerKey.includes('cr'))) {
        this.fieldMapping.debitCreditColumn = this.fieldMapping.debitCreditColumn || key;
      }
    });
  }

  needsMappingConfirmation(): boolean {
    return !this.fieldMapping.dateColumn || !this.fieldMapping.descriptionColumn || !this.fieldMapping.amountColumn;
  }

  mapDataToRows(rawData: any[]): StatementRow[] {
    return rawData.map((row, index) => {
      let amount = 0;
      let debitCredit: 'debit' | 'credit' = 'credit';

      // Advanced logic for mapped columns
      const debVal = this.fieldMapping.debitColumn ? this.parseAmount(row[this.fieldMapping.debitColumn]) : 0;
      const creVal = this.fieldMapping.creditColumn ? this.parseAmount(row[this.fieldMapping.creditColumn]) : 0;

      if (debVal > 0) {
        amount = debVal;
        debitCredit = 'debit';
      } else if (creVal > 0) {
        amount = creVal;
        debitCredit = 'credit';
      } else {
        // Fallback to single amount column
        amount = this.parseAmount(row[this.fieldMapping.amountColumn]);
        debitCredit = this.parseDebitCredit(row[this.fieldMapping.debitCreditColumn || '']);
      }

      const mappedRow: StatementRow = {
        rowNumber: index + 1,
        date: row[this.fieldMapping.dateColumn] || '',
        description: row[this.fieldMapping.descriptionColumn] || '',
        amount: amount,
        balance: this.fieldMapping.balanceColumn ? this.parseAmount(row[this.fieldMapping.balanceColumn]) : undefined,
        reference: this.fieldMapping.referenceColumn ? row[this.fieldMapping.referenceColumn] : '',
        debitCredit: debitCredit,
        selected: true,
        ignored: false,
        hasError: false,
        errorMessage: '',
        isDuplicate: false,
        warningMessage: ''
      };
      this.validateRow(mappedRow);
      return mappedRow;
    });
  }

  parseAmount(value: any): number {
    if (typeof value === 'number') return Math.abs(value);
    if (!value) return 0;
    const cleaned = String(value).replace(/[,\s₦$€£]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  }

  parseDebitCredit(value: any): 'debit' | 'credit' {
    if (!value) return 'credit';
    const str = String(value).toLowerCase();
    if (str.includes('debit') || str.includes('dr') || str.includes('withdrawal') || str.includes('outflow')) return 'debit';
    if (str.includes('credit') || str.includes('cr') || str.includes('deposit') || str.includes('inflow')) return 'credit';
    return 'credit';
  }

  validateRow(row: StatementRow) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.date) {
      errors.push('Missing date');
    } else {
      const dateObj = new Date(row.date as string);
      if (isNaN(dateObj.getTime())) {
        errors.push('Invalid date format');
      } else if (dateObj > new Date()) {
        warnings.push('Future date');
      }
    }

    if (!row.amount || row.amount === 0) {
      errors.push('Invalid or missing amount');
    }

    if (!row.description || row.description.trim() === '') {
      warnings.push('Missing description');
    }

    const isDup = this.transactions.some(t =>
      t.description === row.description &&
      Math.abs((t.credit || t.debit || 0) - row.amount) < 0.01 &&
      new Date(t.date).toDateString() === new Date(row.date as string).toDateString()
    );

    if (isDup) {
      row.isDuplicate = true;
      warnings.push('Possible duplicate');
    }

    if (errors.length > 0) {
      row.hasError = true;
      row.errorMessage = errors.join(', ');
      row.selected = false;
    }

    if (warnings.length > 0) {
      row.warningMessage = warnings.join(', ');
    }
  }

  // Mapping Modal Actions
  saveMappingAndPreview() {
    if (this.currentStatement) {
      this.currentStatement.mappedData = this.mapDataToRows(this.currentStatement.rawData);
      this.currentStatement.mapping = { ...this.fieldMapping };
      this.currentStatement.validRows = this.currentStatement.mappedData.filter(r => !r.hasError).length;
      this.currentStatement.errorRows = this.currentStatement.mappedData.filter(r => r.hasError).length;
      this.showMappingModal = false;
      this.showPreviewModal = true;
    }
  }

  closeMappingModal() {
    this.showMappingModal = false;
  }

  // Preview Modal Actions
  toggleRowSelection(row: StatementRow) {
    row.selected = !row.selected;
  }

  toggleAllRows() {
    if (!this.currentStatement) return;
    const allSelected = this.currentStatement.mappedData.every(r => r.selected || r.ignored || r.hasError);
    this.currentStatement.mappedData.forEach(row => {
      if (!row.ignored && !row.hasError) {
        row.selected = !allSelected;
      }
    });
  }

  ignoreRow(row: StatementRow) {
    row.ignored = true;
    row.selected = false;
  }

  getSelectedCount(): number {
    return this.currentStatement?.mappedData.filter(r => r.selected && !r.ignored).length || 0;
  }

  proceedToImport() {
    if (this.getSelectedCount() === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Rows Selected',
        detail: 'Please select at least one valid row to import',
        life: 3000
      });
      return;
    }
    this.showPreviewModal = false;
    this.showConfirmImportModal = true;
  }

  closePreviewModal() {
    this.showPreviewModal = false;
  }

  confirmImport() {
    if (!this.currentStatement) return;

    const selectedRows = this.currentStatement.mappedData.filter(r => r.selected && !r.ignored);

    this.messageService.add({
      severity: 'info',
      summary: 'Processing Import',
      detail: `Importing ${selectedRows.length} transactions...`,
      life: 2000
    });

    setTimeout(() => {
      let lastBalance = this.transactions.length > 0 ? this.transactions[0].balance : 500000;

      selectedRows.forEach(row => {
        const newTransaction: Transaction = {
          id: 'tx_import_' + Date.now() + '_' + Math.random(),
          date: new Date(row.date as string),
          description: row.description,
          reference: row.reference,
          type: row.debitCredit === 'credit' ? 'Income' : 'Expense',
          account: 'Bank - Imported',
          debit: row.debitCredit === 'debit' ? row.amount : undefined,
          credit: row.debitCredit === 'credit' ? row.amount : undefined,
          balance: row.debitCredit === 'credit' ? lastBalance + row.amount : lastBalance - row.amount,
          status: row.isDuplicate ? 'Needs Review' : 'Posted'
        };

        lastBalance = newTransaction.balance;
        this.transactions.unshift(newTransaction);
      });

      this.showConfirmImportModal = false;
      this.resetUploadState();

      this.messageService.add({
        severity: 'success',
        summary: 'Import Successful',
        detail: `${selectedRows.length} transactions imported and added to the ledger`,
        life: 5000
      });
    }, 1200);
  }

  cancelImport() {
    this.showConfirmImportModal = false;
    this.showPreviewModal = true;
  }

  resetUploadState() {
    this.selectedFile = null;
    this.currentStatement = null;
    this.isProcessingFile = false;
    this.uploadProgress = 0;
    this.availableColumns = [];
    this.pdfSrc = null;
    this.docxHtml = '';
    this.showFilePreview = false;
    this.fileType = null;
    this.fieldMapping = {
      dateColumn: '',
      descriptionColumn: '',
      amountColumn: '',
      referenceColumn: '',
      debitCreditColumn: ''
    };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  }
}
