import { Injectable } from '@angular/core';
import { environment } from '../shared-component/environments/environment';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { EmployeePayroll } from '../domain/payroll.dto';
import { DatePipe } from '@angular/common';

export type MappingType = 'dynamic' | 'static';

export interface BankExportColumn {
  header: string;
  type: MappingType;
  field?: PayrollExportField;
  staticValue?: string; // For values like "SALARY" or "001"
  dateFormat?: string;  // e.g., 'ddMMyyyy' or 'yyyy-MM-dd'
}

export type PayrollExportField =
  | 'employeeName'
  | 'accountNumber'
  | 'bankCode'      // 3-digit CBN bank code, e.g. "058"
  | 'bankSortCode'  // 9-digit NIBSS sort code, e.g. "058152052"
  | 'bankName'
  | 'amount'
  | 'narration'
  | 'reference'
  | 'email'
  | 'phone'
  | 'paymentDate';

export interface BankExportTemplate {
  id: number;
  name: string;
  delimiter: ',' | ';' | '\t';
  includeHeader: boolean;
  columns: BankExportColumn[];
}

@Injectable({
  providedIn: 'root'
})
export class PayrollService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private datePipe: DatePipe) {}

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error("An error occurred:", error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, body was: ${JSON.stringify(error.error)}`
      );
    }
    return throwError(() => error);
  }

  // --- General Settings ---
  getGeneralSettings(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/generalSettingss`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  // --- Employee Payroll ---
  getEmployeePayrolls(page = 1, size = 200): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/employeePayrolls`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  getEmployeePayrollBonuses(filters: any = {}): Observable<any> {
    const params = {
      page: filters.page ?? 1,
      size: filters.size ?? 200,
      ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.createdById ? { createdById: filters.createdById } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.verdict ? { verdict: filters.verdict } : {}),
      ...(filters.applied !== undefined && filters.applied !== null ? { applied: filters.applied } : {})
    };
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/employeePayrollBonuss`, { params })
      .pipe(catchError(this.handleError));
  }

  getEmployeePayrollDeductions(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/employeePayrollDeductionss`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  getDeductionDetails(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/deductionDetails`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  // --- Tax Configurations ---
  getTaxConfigs(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/taxConfigs`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  getTaxBands(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/taxBands`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  getTaxReliefs(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/taxReliefs`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  // --- Pension, NHF, Health, Employer Statutory ---
  getPensionConfigs(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/pensionConfigs`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  getNhfConfigs(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/nhfConfigs`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  getHealthInsuranceConfigs(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/healthInsuranceConfigs`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  getEmployerStatutoryConfigs(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/employerStatutorys`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  // --- Payroll Generation ---
  generatePayroll(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/payroll/generate`, payload)
      .pipe(catchError(this.handleError));
  }

  getPayrollGenerationResponses(page = 1, size = 200): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/payrollGenerationResponses`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  // ---------------- POST Endpoints ----------------
  postGeneralSettings(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/generalSettingss`, payload)
      .pipe(catchError(this.handleError));
  }

  postTaxConfig(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/taxConfigs`, payload)
      .pipe(catchError(this.handleError));
  }

  postPensionConfig(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/pensionConfigs`, payload)
      .pipe(catchError(this.handleError));
  }

  postNhfConfig(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/nhfConfigs`, payload)
      .pipe(catchError(this.handleError));
  }

  postHealthInsuranceConfig(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/healthInsuranceConfigs`, payload)
      .pipe(catchError(this.handleError));
  }

  postEmployerStatutory(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/employerStatutorys`, payload)
      .pipe(catchError(this.handleError));
  }

  postTaxBand(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/taxBands`, payload)
      .pipe(catchError(this.handleError));
  }

  postTaxRelief(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/taxReliefs`, payload)
      .pipe(catchError(this.handleError));
  }

  postEmployeePayroll(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/employeePayrolls`, payload)
      .pipe(catchError(this.handleError));
  }

  postEmployeePayrollBonus(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/employeePayrollBonuss`, payload)
      .pipe(catchError(this.handleError));
  }

  updateEmployeePayrollBonus(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/x/api/v2/hr/employeePayrollBonuss/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  postEmployeePayrollDeduction(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/employeePayrollDeductionss`, payload)
      .pipe(catchError(this.handleError));
  }

  postDeductionDetail(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/hr/deductionDetails`, payload)
      .pipe(catchError(this.handleError))
  }

  postGeneratePayroll(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/hr/payroll/generate`, payload)
      .pipe(catchError(this.handleError));
  }

  approvePayroll(id: number, payload: any): Observable<any> {
     return this.http.post(`${this.baseUrl}/x/api/v2/workflow/approvalInstances/${id}/approve`, payload)
      .pipe(catchError(this.handleError));
  }

  rejectPayroll(id: number, payload: any): Observable<any> {
     return this.http.post(`${this.baseUrl}/x/api/v2/workflow/approvalInstances/${id}/reject`, payload)
      .pipe(catchError(this.handleError));
  }

  getApprovalDocumentUrl(fileName: string): string {
    return `${this.baseUrl}/x/api/v2/workflow/approvalInstances/documents/${encodeURIComponent(fileName)}`;
  }


generateCSV(employees: EmployeePayroll[], template: BankExportTemplate): string {
  const rows = employees.map(emp => {
    const row: any = {};
    template.columns.forEach(col => {
      // Use the new resolve logic that handles static vs dynamic
      row[col.header] = this.resolveField(emp, col);
    });
    return row;
  });

  const headers = template.includeHeader ? template.columns.map(c => c.header) : [];
  const csvRows = rows.map(r => 
    template.columns.map(c => r[c.header]).join(template.delimiter)
  );

  return template.includeHeader 
    ? [headers.join(template.delimiter), ...csvRows].join('\n') 
    : csvRows.join('\n');
}

private resolveField(emp: EmployeePayroll, col: BankExportColumn): string | number {
  // Handle Static Values (e.g., Reference or Fixed Codes)
  if (col.type === 'static') {
    return col.staticValue ?? '';
  }

  // Handle Dynamic Fields
  switch (col.field) {
    case 'employeeName': 
      return `${emp.employee.firstName} ${emp.employee.lastName}`;
    case 'accountNumber': 
      return emp.employee.accountNumber;
    case 'bankName':
      return emp.employee.bankName;
    case 'bankCode':
      return this.resolveBankCode((emp.employee as any).bankCode || emp.employee.bankName || '', false);
    case 'bankSortCode':
      return this.resolveBankCode((emp.employee as any).bankSortCode || emp.employee.bankName || '', true);
    case 'amount': 
      return emp.netPayable;
    case 'narration': 
      return `Salary ${emp.month}/${emp.year}`;
    case 'email': 
      return emp.employee.email;
    case 'phone': 
      return emp.employee.phone;
    case 'paymentDate': {
      const date = this.arrayToDate(emp.generatedAt);
      if (!date) return '';
      // If a custom format exists (e.g., 'ddMMyyyy'), use it. Otherwise, default to ISO.
      return col.dateFormat 
        ? this.datePipe.transform(date, col.dateFormat) || '' 
        : date.toISOString().split('T')[0];
    }
    case 'reference':
      return `PAY${emp.id}`;
    default:
      return '';
  }
}

private readonly BANK_CODES: Record<string, [string, string]> = {
  'access':          ['044', '044150149'],
  'citibank':        ['023', '023150005'],
  'ecobank':         ['050', '050150010'],
  'fidelity':        ['070', '070150003'],
  'first bank':      ['011', '011151003'],
  'fcmb':            ['214', '214150018'],
  'gtbank':          ['058', '058152052'],
  'guaranty trust':  ['058', '058152052'],
  'heritage':        ['030', '030159992'],
  'jaiz':            ['301', '301080020'],
  'keystone':        ['082', '082150017'],
  'polaris':         ['076', '076151006'],
  'skye':            ['076', '076151006'],
  'providus':        ['101', '101004008'],
  'stanbic ibtc':    ['221', '221159522'],
  'standard chart':  ['068', '068150015'],
  'sterling':        ['232', '232150016'],
  'uba':             ['033', '033153807'],
  'united bank':     ['033', '033153807'],
  'union bank':      ['032', '032080474'],
  'unity bank':      ['215', '215154097'],
  'wema':            ['035', '035150103'],
  'zenith':          ['057', '057150013'],
};

private resolveBankCode(nameOrCode: string, returnSortCode: boolean): string {
  // If it looks like it's already a code (numeric, 3 or 9 digits), return as-is
  if (/^\d{3,9}$/.test(nameOrCode.trim())) return nameOrCode.trim();
  const lower = nameOrCode.toLowerCase();
  for (const [key, codes] of Object.entries(this.BANK_CODES)) {
    if (lower.includes(key)) return returnSortCode ? codes[1] : codes[0];
  }
  return '';
}

   getTemplate(): any{
    const data = localStorage.getItem("bankTemplate");
    return data ? JSON.parse(data) : null;
  }

  private arrayToDate(arr: number[] | null | undefined): Date | null {
    if (!arr || !arr.length) return null;

    // backend array: [year, month, day, hour, minute, second, nanoseconds]
    const [year, month, day, hour = 0, minute = 0, second = 0] = arr;

    // JS month is 0-based
    return new Date(year, month - 1, day, hour, minute, second);
  }

}
