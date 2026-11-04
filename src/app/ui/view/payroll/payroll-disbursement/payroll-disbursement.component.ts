import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { PayrollService, BankExportTemplate, BankExportColumn, PayrollExportField } from '../../../service/payroll.service';
import { environment } from '../../../shared-component/environments/environment';
import * as XLSX from 'xlsx';

// Nigerian bank name (lowercase key) → [3-digit CBN code, 9-digit sort code]
const NIGERIAN_BANK_CODES: Record<string, [string, string]> = {
  'access bank':             ['044', '044150149'],
  'access':                  ['044', '044150149'],
  'citibank':                ['023', '023150005'],
  'ecobank':                 ['050', '050150010'],
  'fidelity bank':           ['070', '070150003'],
  'fidelity':                ['070', '070150003'],
  'first bank':              ['011', '011151003'],
  'first bank of nigeria':   ['011', '011151003'],
  'first city monument bank':['214', '214150018'],
  'fcmb':                    ['214', '214150018'],
  'gtbank':                  ['058', '058152052'],
  'guaranty trust bank':     ['058', '058152052'],
  'guaranty trust':          ['058', '058152052'],
  'gt bank':                 ['058', '058152052'],
  'heritage bank':           ['030', '030159992'],
  'jaiz bank':               ['301', '301080020'],
  'keystone bank':           ['082', '082150017'],
  'polaris bank':            ['076', '076151006'],
  'skye bank':               ['076', '076151006'],
  'providus bank':           ['101', '101004008'],
  'providus':                ['101', '101004008'],
  'stanbic ibtc':            ['221', '221159522'],
  'stanbic ibtc bank':       ['221', '221159522'],
  'standard chartered':      ['068', '068150015'],
  'sterling bank':           ['232', '232150016'],
  'sterling':                ['232', '232150016'],
  'suntrust bank':           ['100', '100004040'],
  'uba':                     ['033', '033153807'],
  'united bank for africa':  ['033', '033153807'],
  'union bank':              ['032', '032080474'],
  'union bank of nigeria':   ['032', '032080474'],
  'unity bank':              ['215', '215154097'],
  'wema bank':               ['035', '035150103'],
  'wema':                    ['035', '035150103'],
  'zenith bank':             ['057', '057150013'],
  'zenith':                  ['057', '057150013'],
  'kuda':                    ['090', '090267000'],
  'kuda bank':               ['090', '090267000'],
  'opay':                    ['100', '100004040'],
  'palmpay':                 ['999', '999991232'],
};

@Component({
  selector: 'app-payroll-disbursement',
  templateUrl: './payroll-disbursement.component.html',
  styleUrls: ['./payroll-disbursement.component.scss'],
})
export class PayrollDisbursementComponent implements OnInit, OnDestroy {
  activeTab: 'paystack' | 'gtbank' | 'template' = 'gtbank';
  loading = false;
  runs: any[] = [];
  selectedRunId: number | null = null;
  selectedRun: any = null;
  employees: any[] = [];
  skippedCount = 0;
  exemptedIds = new Set<any>();
  postingToFinance = false;
  financePosted = false;
  toastMsg = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast = false;

  // GTBank / custom template
  templates: BankExportTemplate[] = [];
  selectedTemplateId: number | null = null;
  generatingFile = false;

  // Template builder
  builderTemplate: BankExportTemplate = {
    id: Date.now(), name: '', delimiter: ',', includeHeader: true, columns: []
  };
  readonly fieldOptions: PayrollExportField[] = [
    'employeeName','accountNumber','bankCode','bankSortCode','bankName',
    'amount','narration','reference','email','phone','paymentDate'
  ];
  readonly delimiterOptions = [
    { label: 'Comma (CSV)', value: ',' },
    { label: 'Semicolon', value: ';' },
    { label: 'Tab', value: '\t' },
  ];
  newColHeader = '';
  newColType: 'dynamic' | 'static' = 'dynamic';
  newColField: PayrollExportField = 'employeeName';
  newColStatic = '';

  // GT Bank Bulk Payment template — columns match GT_Bulk_FX_Template.xlsx exactly
  private readonly GTBANK_TEMPLATE: BankExportTemplate = {
    id: 9001, name: 'GTBank Bulk Payment', delimiter: ',', includeHeader: true,
    columns: [
      { header: 'PaymentAmount',    type: 'dynamic', field: 'amount' },
      { header: 'PaymentDate',      type: 'dynamic', field: 'paymentDate', dateFormat: 'dd/MMM/yyyy' },
      { header: 'Reference',        type: 'dynamic', field: 'reference' },
      { header: 'Remark',           type: 'static',  staticValue: 'SALARY PAYMENT' },
      { header: 'VendorCode',       type: 'dynamic', field: 'reference' },
      { header: 'VendorName',       type: 'dynamic', field: 'employeeName' },
      { header: 'VendorAcctNumber', type: 'dynamic', field: 'accountNumber' },
      { header: 'VendorBankSortCode', type: 'dynamic', field: 'bankSortCode' },
    ]
  };

  private subs = new Subscription();
  readonly monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  constructor(
    private payrollService: PayrollService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.loadRuns();
    this.loadTemplates();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ── Getter fixes NG5002: no fat-arrow in template ─────────────────────────
  get builderTemplateLabel(): string {
    const isEditing = this.builderTemplate.columns.length > 0
      && this.templates.some(t => t.id === this.builderTemplate.id);
    return isEditing ? 'Edit' : 'New';
  }

  // ── Payroll runs ──────────────────────────────────────────────────────────
  loadRuns(): void {
    this.loading = true;
    this.subs.add(
      this.payrollService.getPayrollGenerationResponses(1, 200).pipe(catchError(() => of([]))).subscribe({
        next: (res: any) => {
          this.runs = (Array.isArray(res) ? res : (res?.content ?? []))
            .filter((r: any) => {
              const s = (r.payrollApprovalInstance?.status || r.status || '').toUpperCase();
              return s === 'APPROVED' || s === 'COMPLETED' || s === 'PAID';
            })
            .sort((a: any, b: any) => (+b.year - +a.year) || (+b.month - +a.month));
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  selectRun(runId: number): void {
    this.selectedRunId = runId;
    this.selectedRun = this.runs.find(r => r.id === runId) ?? null;
    const all: any[] = this.selectedRun?.employees ?? [];
    this.employees = all.filter(e =>
      (e.employee?.employeeStatus ?? e.employeeStatus ?? 'ACTIVE') === 'ACTIVE'
    );
    this.skippedCount = all.length - this.employees.length;
    this.exemptedIds = new Set();
    this.financePosted = false;
  }

  get includedEmployees(): any[] {
    return this.employees.filter(e => !this.exemptedIds.has(this.empKey(e)));
  }

  empKey(e: any): any { return e.id ?? e.employee?.id; }

  toggleExempt(e: any): void {
    const key = this.empKey(e);
    this.exemptedIds.has(key) ? this.exemptedIds.delete(key) : this.exemptedIds.add(key);
    this.exemptedIds = new Set(this.exemptedIds);
  }

  isExempted(e: any): boolean { return this.exemptedIds.has(this.empKey(e)); }

  runLabel(run: any): string {
    const all: any[] = run.employees ?? [];
    const active = all.filter(e =>
      (e.employee?.employeeStatus ?? e.employeeStatus ?? 'ACTIVE') === 'ACTIVE'
    ).length;
    return `${this.monthNames[(+run.month - 1)]} ${run.year} — ${active} active employees`;
  }

  get totalNet(): number {
    return this.includedEmployees.reduce((s, e) => s + (+(e.netPayable ?? 0)), 0);
  }

  get totalGross(): number {
    return this.includedEmployees.reduce((s, e) => s + (+(e.grossPay ?? 0)), 0);
  }

  get totalDeductions(): number {
    return this.includedEmployees.reduce((s, e) => s + (+(e.totalDeductions ?? 0)), 0);
  }

  fmt(v: number): string {
    return '₦' + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── Paystack ──────────────────────────────────────────────────────────────
  // Not connected yet: there is no transfer endpoint, so nothing here may claim money was sent.
  // Salaries are paid through the bank file (GTBank or a custom template) until the integration exists.

  // ── GTBank XLSX download ──────────────────────────────────────────────────
  downloadGTBank(): void {
    if (!this.includedEmployees.length) { this.showAlert('Select a payroll run first.', 'error'); return; }
    this.generatingFile = true;

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase().replace(/ /g, '/'); // e.g. "22/JUL/2026"

    const headers = [
      'PaymentAmount', 'PaymentDate', 'Reference', 'Remark',
      'VendorCode', 'VendorName', 'VendorAcctNumber', 'VendorBankSortCode'
    ];

    const rows = this.includedEmployees.map((e, i) => {
      const empName = `${e.employee?.firstName ?? ''} ${e.employee?.lastName ?? ''}`.trim();
      const bankName = (e.employee?.bankName ?? '').toLowerCase();
      return [
        e.netPayable ?? 0,
        dateStr,
        `PAY${e.id ?? (Date.now() + i)}`,
        'SALARY PAYMENT',
        `PAY${e.id ?? (Date.now() + i)}`,
        empName,
        e.employee?.accountNumber ?? '',
        this.getBankSortCode(bankName),
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Match GTBank template column widths
    ws['!cols'] = [
      { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 20 },
      { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');

    const month = this.selectedRun ? this.monthNames[(+this.selectedRun.month - 1)] : 'Payroll';
    const year  = this.selectedRun?.year ?? today.getFullYear();
    XLSX.writeFile(wb, `GTBank_Bulk_Payment_${month}_${year}.xlsx`);

    this.generatingFile = false;
    const unroutable = this.unroutableEmployees.length;
    if (unroutable > 0) {
      this.showAlert(`GTBank file downloaded, but ${unroutable} employee${unroutable !== 1 ? 's have' : ' has'} no account number or a bank we can\'t match. Their rows have no sort code: fix or exempt them before uploading.`, 'error');
    } else {
      this.showAlert('GTBank Excel file downloaded. Upload to GTBank Internet Banking → Bulk Payment.', 'success');
    }
  }

  // ── Custom template CSV ───────────────────────────────────────────────────
  downloadCustomTemplate(): void {
    if (!this.selectedTemplateId || !this.includedEmployees.length) {
      this.showAlert('Select a run and a template first.', 'error'); return;
    }
    const tmpl = this.templates.find(t => t.id === this.selectedTemplateId);
    if (!tmpl) return;
    this.generatingFile = true;
    const empDtos = this.includedEmployees.map(e => this.mapToEmployeePayroll(e));
    const csv = this.payrollService.generateCSV(empDtos, tmpl);
    this.downloadFile(csv, `${tmpl.name.replace(/\s+/g, '_')}_payroll.csv`, 'text/csv');
    this.generatingFile = false;
    this.showAlert('File downloaded.', 'success');
  }

  // ── Post payroll disbursement to Finance/Accounting ───────────────────────
  postToFinance(): void {
    if (!this.selectedRun || !this.includedEmployees.length) {
      this.showAlert('Select a payroll run first.', 'error'); return;
    }
    this.postingToFinance = true;
    const token = sessionStorage.getItem('Token') || '';
    const tenantId = sessionStorage.getItem('tenantId') || 'default';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json',
    });

    const month = this.monthNames[(+this.selectedRun.month - 1)];
    const year  = this.selectedRun.year;

    const payload = {
      eventType: 'PAYROLL_DISBURSEMENT',
      sourceModule: 'HR',
      sourceId: this.selectedRun.id,
      amount: this.totalNet,
      description: `Payroll Disbursement — ${month} ${year} (${this.includedEmployees.length} employees)`,
      currency: 'NGN',
      transactionDate: new Date().toISOString().split('T')[0],
      metadata: {
        grossPay:       this.totalGross,
        totalDeductions: this.totalDeductions,
        netPayable:     this.totalNet,
        employeeCount:  this.includedEmployees.length,
        month,
        year,
      }
    };

    this.http.post(
      `${environment.apiBaseUrl}/x/api/v2/accounting/events`,
      payload,
      { headers }
    ).pipe(catchError(err => {
      this.postingToFinance = false;
      this.showAlert('Could not post to finance: ' + (err?.error?.message || err?.status || 'error'), 'error');
      return of(null);
    })).subscribe(res => {
      this.postingToFinance = false;
      if (res !== null) {
        this.financePosted = true;
        this.showAlert(
          `Journal entry posted to Finance — Dr: Salary Expense ₦${this.fmt(this.totalGross)}, Cr: Payroll Payable ₦${this.fmt(this.totalNet)}`,
          'success'
        );
      }
    });
  }

  // ── Bank code helpers ─────────────────────────────────────────────────────
  /**
   * The [CBN code, sort code] for a bank name, or null if it isn't a known bank. Only matches when the
   * name contains a known bank's name, preferring the longest, so a blank or vague name never
   * borrows another bank's codes.
   */
  private lookupBankCodes(bankName: string): [string, string] | null {
    const name = (bankName ?? '').trim().toLowerCase();
    if (!name) return null;
    let best: [string, [string, string]] | null = null;
    for (const [key, codes] of Object.entries(NIGERIAN_BANK_CODES)) {
      if (name.includes(key) && (!best || key.length > best[0].length)) best = [key, codes];
    }
    return best ? best[1] : null;
  }

  getBankSortCode(bankName: string): string {
    return this.lookupBankCodes(bankName)?.[1] ?? '';
  }

  getBankCode(bankName: string): string {
    return this.lookupBankCodes(bankName)?.[0] ?? '';
  }

  /** Included employees the bank file can't pay: no account number, or a bank name we can't match. */
  get unroutableEmployees(): any[] {
    return this.includedEmployees.filter(e =>
      !(e.employee?.accountNumber ?? e.accountNumber) || !this.lookupBankCodes(e.employee?.bankName ?? e.bankName ?? '')
    );
  }

  get unroutableNames(): string {
    return this.unroutableEmployees.map(e => this.employeeName(e)).join(', ');
  }

  employeeName(e: any): string {
    return `${e.employee?.firstName ?? e.firstName ?? ''} ${e.employee?.lastName ?? e.lastName ?? ''}`.trim() || 'Unnamed employee';
  }

  private mapToEmployeePayroll(e: any): any {
    const bankName = (e.employee?.bankName ?? '').toLowerCase();
    return {
      id: e.id,
      netPayable: e.netPayable ?? 0,
      month: e.month,
      year: e.year,
      generatedAt: e.generatedAt,
      employee: {
        firstName:      e.employee?.firstName    ?? e.firstName    ?? '',
        lastName:       e.employee?.lastName     ?? e.lastName     ?? '',
        accountNumber:  e.employee?.accountNumber ?? e.accountNumber ?? '',
        bankName:       e.employee?.bankName     ?? e.bankName     ?? '',
        bankCode:       this.getBankCode(bankName),
        bankSortCode:   this.getBankSortCode(bankName),
        bvn:            e.employee?.bvn          ?? '',
        email:          e.employee?.email        ?? e.email        ?? '',
        phone:          e.employee?.phone        ?? e.phone        ?? '',
      }
    };
  }

  // ── Template builder ──────────────────────────────────────────────────────
  loadTemplates(): void {
    try {
      const saved = JSON.parse(localStorage.getItem('payroll_export_templates') ?? '[]');
      this.templates = Array.isArray(saved) ? saved : [];
    } catch { this.templates = []; }
  }

  saveTemplates(): void {
    localStorage.setItem('payroll_export_templates', JSON.stringify(this.templates));
  }

  addColumn(): void {
    if (!this.newColHeader.trim()) return;
    const col: BankExportColumn = this.newColType === 'static'
      ? { header: this.newColHeader.trim(), type: 'static', staticValue: this.newColStatic }
      : { header: this.newColHeader.trim(), type: 'dynamic', field: this.newColField };
    this.builderTemplate.columns.push(col);
    this.newColHeader = ''; this.newColStatic = '';
  }

  removeColumn(i: number): void { this.builderTemplate.columns.splice(i, 1); }

  saveBuilderTemplate(): void {
    if (!this.builderTemplate.name.trim() || !this.builderTemplate.columns.length) {
      this.showAlert('Provide a template name and at least one column.', 'error'); return;
    }
    const existing = this.templates.findIndex(t => t.id === this.builderTemplate.id);
    if (existing > -1) { this.templates[existing] = { ...this.builderTemplate }; }
    else { this.templates.push({ ...this.builderTemplate }); }
    this.saveTemplates();
    this.showAlert('Template saved.', 'success');
    this.builderTemplate = { id: Date.now(), name: '', delimiter: ',', includeHeader: true, columns: [] };
  }

  deleteTemplate(id: number): void {
    this.templates = this.templates.filter(t => t.id !== id);
    this.saveTemplates();
  }

  loadTemplateForEdit(tmpl: BankExportTemplate): void {
    this.builderTemplate = JSON.parse(JSON.stringify(tmpl));
  }

  private downloadFile(content: string, filename: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  private showAlert(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMsg = msg; this.toastType = type; this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4500);
  }
}
