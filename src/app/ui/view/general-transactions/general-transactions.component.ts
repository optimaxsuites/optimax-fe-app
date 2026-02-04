import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

interface Transaction {
  id: string;
  date: Date;
  description: string;
  reference?: string;
  type: 'Income' | 'Expense' | 'Transfer';
  account: string; // e.g., 'Bank - GTB', 'Cash', 'Transport'
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
  calendarEmpties: number[] = []; // empty slots before 1st of month

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
    referenceColumn: '',
    debitCreditColumn: ''
  };

  // Sample Data
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

  constructor(private messageService: MessageService) { }

  ngOnInit(): void {
    this.initDateFilters();
    this.generateCalendar();
  }

  initDateFilters() {
    // Default to This Month
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

    this.calendarDays = Array.from({length: daysInMonth}, (_, i) => i + 1);
    this.calendarEmpties = Array.from({length: firstDay}, (_, i) => i);
  }

  changeCalendarMonth(delta: number) {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + delta);
    this.currentCalendarDate = new Date(this.currentCalendarDate); // trigger reactivity likely not needed for object mutation but good practice
    this.generateCalendar();
  }

  selectCalendarDay(day: number) {
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    // Use local time construction to avoid timezone shifts when converting to string
    // Construct date at noon to be safe from partial day offsets
    const clickedDate = new Date(year, month, day, 12, 0, 0, 0);
    const dateStr = clickedDate.toISOString().split('T')[0];

    // If currently not custom or we have a range selected (start != end), reset to single day (start new range)
    if (this.activePreset !== 'custom' || this.fromDate !== this.toDate) {
      this.fromDate = dateStr;
      this.toDate = dateStr;
      this.activePreset = 'custom';
    } else {
      // We have a single day selected. This click defines the range endpoint.
      if (dateStr < this.fromDate) {
        this.toDate = this.fromDate; // Old start becomes end
        this.fromDate = dateStr;     // New click becomes start
      } else {
        this.toDate = dateStr;       // New click becomes end
      }
    }
    this.reloadTransactions();
  }
  
  isDateSelected(day: number): boolean {
    // Check if within range
    const year = this.currentCalendarDate.getFullYear();
    const month = this.currentCalendarDate.getMonth();
    const checkDate = new Date(year, month, day, 12, 0, 0, 0);
    const checkDateStr = checkDate.toISOString().split('T')[0];
    
    // Only highlight if using custom or if the checkDate matches the single date logic of other presets
    if (this.activePreset === 'custom') {
      return checkDateStr >= this.fromDate && checkDateStr <= this.toDate;
    } else {
      // For other presets, maybe highlight if it falls inside? 
      // User request implies manual selection, so relying on custom preset is safer for 'highlighting' logic 
      // that corresponds to the click action.
      // However, seeing "This Month" visually on calendar is nice too.
      return checkDateStr >= this.fromDate && checkDateStr <= this.toDate;
    }
  }

  // --- Filter Actions ---
  onDateRangeChange() {
    this.activePreset = 'custom';
    this.reloadTransactions();
  }

  applyPreset(presetId: string) {
    this.activePreset = presetId;
    const now = new Date();
    
    switch(presetId) {
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
      // ... match other cases as needed
    }
    this.reloadTransactions();
  }

  reloadTransactions() {
    // Simulate data fetch
    console.log('Fetching transactions for', this.fromDate, 'to', this.toDate);
  }

  // --- Styling Helpers ---
  getTypeColor(type: string): string {
    switch(type) {
      case 'Income': return 'text-customGreen border-customGreen bg-green-50';
      case 'Expense': return 'text-red-500 border-red-500 bg-red-50';
      case 'Transfer': return 'text-blue-500 border-blue-500 bg-blue-50';
      default: return 'text-gray-500';
    }
  }

  getStatusColor(status: string): string {
    switch(status) {
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

  // Open Upload Modal
  openUploadModal() {
    this.showUploadModal = true;
    this.selectedFile = null;
    this.resetUploadState();
  }

  // Close Upload Modal
  closeUploadModal() {
    this.showUploadModal = false;
    this.resetUploadState();
  }

  // File Selection Handler
  onFileSelected(event: any) {
    const file = event.target?.files?.[0] || event.files?.[0];
    if (file) {
      this.validateAndProcessFile(file);
    }
  }

  // File Drop Handler
  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.validateAndProcessFile(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  // Validate File
  validateAndProcessFile(file: File) {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/pdf'
    ];
    
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv|pdf)$/i)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File Type',
        detail: 'Please upload Excel (.xlsx, .xls), CSV, or PDF files only',
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

  // Process File
  processFile(file: File) {
    this.isProcessingFile = true;
    this.uploadProgress = 0;

    // Simulate file processing
    const progressInterval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 100) {
        clearInterval(progressInterval);
        this.parseFileData(file);
      }
    }, 100);
  }

  // Parse File Data (Mock implementation - in real app, use a library like SheetJS)
  parseFileData(file: File) {
    setTimeout(() => {
      // Mock parsed data - in reality, you'd use SheetJS or similar
      const mockRawData = [
        { Date: '2026-02-01', Description: 'POS Payment', Amount: '50000', Reference: 'REF001', Type: 'Credit' },
        { Date: '2026-02-02', Description: 'Salary Payment', Amount: '150000', Reference: 'SAL202', Type: 'Debit'  },
        { Date: '2026-02-03', Description: 'Client Transfer', Amount: '75000', Reference: 'CLI789', Type: 'Credit' },
        { Date: '2026-02-03', Description: 'Office Rent', Amount: '25000', Reference: '', Type: 'Debit' },
        { Date: 'Invalid', Description: 'Bad Entry', Amount: 'ABC', Reference: '', Type: 'Credit' } // Error row
      ];

      // Extract column names
      if (mockRawData.length > 0) {
        this.availableColumns = Object.keys(mockRawData[0]).map(key => ({
          value: key,
          label: key
        }));
      }

      // Auto-detect mapping
      this.autoDetectMapping(mockRawData);

      const mappedData = this.mapDataToRows(mockRawData);

      this.currentStatement = {
        fileName: file.name,
        uploadDate: new Date(),
        rawData: mockRawData,
        mappedData: mappedData,
        mapping: this.fieldMapping,
        totalRows: mappedData.length,
        validRows: mappedData.filter(r => !r.hasError).length,
        errorRows: mappedData.filter(r => r.hasError).length
      };

      this.isProcessingFile = false;
      this.closeUploadModal();
      
      // Show mapping modal if auto-detection uncertain
      if (this.needsMappingConfirmation()) {
        this.showMappingModal = true;
      } else {
        // Go straight to preview
        this.showPreviewModal = true;
      }

      this.messageService.add({
        severity: 'success',
        summary: 'File Uploaded',
        detail: `${this.currentStatement.totalRows} rows imported successfully`,
        life: 3000
      });
    }, 1000);
  }

  // Auto-detect field mapping
  autoDetectMapping(data: any[]) {
    if (data.length === 0) return;

    const firstRow = data[0];
    const keys = Object.keys(firstRow);

    // Simple keyword matching for auto-detection
    keys.forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('date')) this.fieldMapping.dateColumn = key;
      if (lowerKey.includes('desc') || lowerKey.includes('narr') || lowerKey.includes('detail')) this.fieldMapping.descriptionColumn = key;
      if (lowerKey.includes('amount') || lowerKey.includes('value')) this.fieldMapping.amountColumn = key;
      if (lowerKey.includes('ref') || lowerKey.includes('reference')) this.fieldMapping.referenceColumn = key;
      if (lowerKey.includes('type') || lowerKey.includes('debit') || lowerKey.includes('credit')) this.fieldMapping.debitCreditColumn = key;
    });
  }

  // Check if mapping needs user confirmation
  needsMappingConfirmation(): boolean {
   return !this.fieldMapping.dateColumn || !this.fieldMapping.descriptionColumn || !this.fieldMapping.amountColumn;
  }

  // Map raw data to StatementRow format
  mapDataToRows(rawData: any[]): StatementRow[] {
    return rawData.map((row, index) => {
      const mappedRow: StatementRow = {
        rowNumber: index + 1,
        date: row[this.fieldMapping.dateColumn] || '',
        description: row[this.fieldMapping.descriptionColumn] || '',
        amount: this.parseAmount(row[this.fieldMapping.amountColumn]),
        reference: this.fieldMapping.referenceColumn ? row[this.fieldMapping.referenceColumn] : '',
        debitCredit: this.parseDebitCredit(row[this.fieldMapping.debitCreditColumn || '']),
        selected: true,
        ignored: false,
        hasError: false,
        errorMessage: '',
        isDuplicate: false,
        warningMessage: ''
      };

      // Validate row
      this.validateRow(mappedRow);

      return mappedRow;
    });
  }

  // Parse amount from string
  parseAmount(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Remove commas and parse
    const cleaned = String(value).replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Parse debit/credit indicator
  parseDebitCredit(value: any): 'debit' | 'credit' {
    if (!value) return 'credit'; // default
    const str = String(value).toLowerCase();
    if (str.includes('debit') || str.includes('dr')) return 'debit';
    if (str.includes('credit') || str.includes('cr')) return 'credit';
    return 'credit';
  }

  // Validate individual row
  validateRow(row: StatementRow) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Date validation
    if (!row.date) {
      errors.push('Missing date');
    } else {
      const dateObj = new Date(row.date);
      if (isNaN(dateObj.getTime())) {
        errors.push('Invalid date format');
      } else if (dateObj > new Date()) {
        warnings.push('Future date');
      }
    }

    // Amount validation
    if (!row.amount || row.amount === 0) {
      errors.push('Invalid or missing amount');
    }

    // Description validation
    if (!row.description || row.description.trim() === '') {
      warnings.push('Missing description');
    }

    // Check for duplicates (simple check against existing transactions)
    const isDup = this.transactions.some(t => 
      t.description === row.description && 
      Math.abs(t.credit || t.debit || 0 - row.amount) < 0.01 &&
      new Date(t.date).toDateString() === new Date(row.date).toDateString()
    );

    if (isDup) {
      row.isDuplicate = true;
      warnings.push('Possible duplicate');
    }

    if (errors.length > 0) {
      row.hasError = true;
      row.errorMessage = errors.join(', ');
    }

    if (warnings.length > 0) {
      row.warningMessage = warnings.join(', ');
    }
  }

  // Mapping Modal Actions
  saveMappingAndPreview() {
    if (this.currentStatement) {
      // Re-map data with new mapping
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
    const allSelected = this.currentStatement.mappedData.every(r => r.selected || r.ignored);
    this.currentStatement.mappedData.forEach(row => {
      if (!row.ignored) {
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
    const selectedCount = this.getSelectedCount();
    if (selectedCount === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Rows Selected',
        detail: 'Please select at least one row to import',
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

  // Confirm Import Modal Actions
  confirmImport() {
    if (!this.currentStatement) return;

    const selectedRows = this.currentStatement.mappedData.filter(r => r.selected && !r.ignored);

    this.messageService.add({
      severity: 'info',
      summary: 'Processing Import',
      detail: `Importing ${selectedRows.length} transactions...`,
      life: 2000
    });

    // Simulate import processing
    setTimeout(() => {
      // Convert to transactions and add to list
      let lastBalance = this.transactions.length > 0 ? this.transactions[0].balance : 500000;

      selectedRows.forEach(row => {
        const newTransaction: Transaction = {
          id: 'tx_import_' + Date.now() + '_' + Math.random(),
          date: new Date(row.date),
          description: row.description,
          reference: row.reference,
          type: row.debitCredit === 'credit' ? 'Income' : 'Expense',
          account: 'Bank - Imported',
          debit: row.debitCredit === 'debit' ? row.amount : undefined,
          credit: row.debitCredit === 'credit' ? row.amount : undefined,
          balance: row.debitCredit === 'credit' ? lastBalance + row.amount : lastBalance - row.amount,
          status: row.hasError ? 'Needs Review' : 'Posted'
        };

        lastBalance = newTransaction.balance;
        this.transactions.unshift(newTransaction);
      });

      this.showConfirmImportModal = false;
      this.resetUploadState();

      this.messageService.add({
        severity: 'success',
        summary: 'Import Successful',
        detail: `${selectedRows.length} transactions imported successfully`,
        life: 5000
      });
    }, 1500);
  }

  cancelImport() {
    this.showConfirmImportModal = false;
    this.showPreviewModal = true;
  }

  // Reset upload state
  resetUploadState() {
    this.selectedFile = null;
    this.currentStatement = null;
    this.isProcessingFile = false;
    this.uploadProgress = 0;
    this.availableColumns = [];
    this.fieldMapping = {
      dateColumn: '',
      descriptionColumn: '',
      amountColumn: '',
      referenceColumn: '',
      debitCreditColumn: ''
    };
  }

  // Helper: Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  }
}
