import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ExpenseService } from './expense.service';
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export interface ImportResult {
  total: number;
  success: number;
  errors: number;
  errorMessages: string[];
}

export interface ParsedExpenseRow {
  name: string;
  description: string;
  amount: number;
  currency: string;
  eventDate: string;
  merchant: string;
  category: string;
  paidBy: string;
  receiptReference: string;
  rowNumber: number;
  isValid: boolean;
  validationErrors: string[];
}

@Injectable({ providedIn: 'root' })
export class ExpenseImportService {

  // Required CSV headers (case-insensitive)
  private readonly REQUIRED_HEADERS = ['name', 'amount', 'eventdate', 'merchant', 'category'];

  // Sample template CSV content
  readonly TEMPLATE_CSV = `name,description,amount,currency,eventDate,merchant,category,paidBy,receiptReference
Office Supplies,Monthly stationery purchase,15000,NGN,2024-03-15,Staples Nigeria,Office Supplies,COMPANY,REC-001
Team Lunch,Quarterly team lunch,45000,NGN,2024-03-20,Chicken Republic,Meals & Entertainment,EMPLOYEE,REC-002
Software License,Annual Figma subscription,120000,NGN,2024-03-01,Figma Inc,Software & Tools,COMPANY,REC-003`;

  constructor(
    private expenseService: ExpenseService,
    private messageService: MessageService
  ) {}

  async parseFile(file: File): Promise<ParsedExpenseRow[]> {
    const ext = file.name.toLowerCase().split('.').pop();

    if (ext === 'csv') {
      return this.parseCSV(await file.text());
    } else if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcel(file);
    }

    throw new Error(`Unsupported file type: .${ext}`);
  }

  private parseCSV(content: string): ParsedExpenseRow[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV file is empty or missing data rows');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));

    this.validateHeaders(headers);

    return lines.slice(1).map((line, idx) => {
      const values = this.parseCSVLine(line);
      return this.mapRowToExpense(headers, values, idx + 2);
    });
  }

  private async parseExcel(file: File): Promise<ParsedExpenseRow[]> {
    // Dynamic import of SheetJS — avoids bundle bloat if not installed
    let XLSX: any;
    try {
      XLSX = await import('xlsx');
    } catch {
      throw new Error('Excel support requires the "xlsx" package. Run: npm install xlsx');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

          if (rows.length < 2) {
            reject(new Error('Excel file is empty or missing data rows'));
            return;
          }

          const headers = (rows[0] as string[]).map(h => (h || '').toLowerCase().trim().replace(/\s+/g, ''));
          this.validateHeaders(headers);

          const parsed = rows.slice(1)
            .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
            .map((row, idx) => this.mapRowToExpense(headers, row.map(String), idx + 2));

          resolve(parsed);
        } catch (err: any) {
          reject(new Error('Failed to parse Excel file: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private validateHeaders(headers: string[]): void {
    const missing = this.REQUIRED_HEADERS.filter(
      req => !headers.some(h => h === req || h === req.replace('date', '') + 'date')
    );
    if (missing.length > 0) {
      throw new Error(`Missing required columns: ${missing.join(', ')}. Check your file headers.`);
    }
  }

  private mapRowToExpense(headers: string[], values: string[], rowNumber: number): ParsedExpenseRow {
    const get = (key: string): string => {
      const idx = headers.findIndex(h => h === key || h === key.replace('date', '') + 'date');
      return (values[idx] || '').trim();
    };

    const amountRaw = get('amount').replace(/[^0-9.]/g, '');
    const amount = parseFloat(amountRaw);

    const row: ParsedExpenseRow = {
      rowNumber,
      name: get('name'),
      description: get('description'),
      amount: isNaN(amount) ? 0 : amount,
      currency: get('currency') || 'NGN',
      eventDate: this.normaliseDate(get('eventdate') || get('date')),
      merchant: get('merchant'),
      category: get('category'),
      paidBy: (get('paidby') || 'COMPANY').toUpperCase(),
      receiptReference: get('receiptreference') || get('receipt') || '',
      isValid: true,
      validationErrors: []
    };

    // Validation
    if (!row.name) row.validationErrors.push('Name is required');
    if (!row.amount || row.amount <= 0) row.validationErrors.push('Amount must be a positive number');
    if (!row.eventDate) row.validationErrors.push('Date is required or invalid');
    if (!row.merchant) row.validationErrors.push('Merchant is required');
    if (!row.category) row.validationErrors.push('Category is required');
    if (!['COMPANY', 'EMPLOYEE'].includes(row.paidBy)) {
      row.paidBy = 'COMPANY';
    }

    row.isValid = row.validationErrors.length === 0;
    return row;
  }

  private normaliseDate(raw: string): string {
    if (!raw) return '';
    // Handle dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd, dd-mm-yyyy
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // ISO yyyy-mm-dd
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // dd/mm/yyyy
      /^(\d{2})-(\d{2})-(\d{4})$/, // dd-mm-yyyy
    ];

    for (const fmt of formats) {
      const m = raw.match(fmt);
      if (m) {
        // ISO format — return as-is
        if (raw.match(/^\d{4}-\d{2}-\d{2}$/)) return raw;
        // dd/mm/yyyy → yyyy-mm-dd
        return `${m[3]}-${m[2]}-${m[1]}`;
      }
    }

    // Fallback: try JS Date parsing
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return '';
  }

  /** Parse CSV line respecting quoted commas */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /** Generate and download the template CSV */
  downloadTemplate(): void {
    const blob = new Blob([this.TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}