import { Injectable } from '@angular/core';
import { environment } from '../shared-component/environments/environment';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { EmployeePayroll } from '../domain/payroll.dto';

export type PayrollExportField =
  | 'employeeName'
  | 'accountNumber'
  | 'bankCode'
  | 'bankName'
  | 'amount'
  | 'narration'
  | 'reference'
  | 'email'
  | 'phone'
  | 'paymentDate';

export interface BankExportColumn {
  header: string;
  field: PayrollExportField;
  staticValue?: string;  // optional fixed value
  format?: string;       // optional formatting
}

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

  constructor(private http: HttpClient) {}

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
  getEmployeePayrolls(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/employeePayrolls`, { params: { page, size } })
      .pipe(catchError(this.handleError));
  }

  getEmployeePayrollBonuses(page = 1, size = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/hr/employeePayrollBonuss`, { params: { page, size } })
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

  getPayrollGenerationResponses(page = 1, size = 10): Observable<any> {
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


  generateCSV(employees: EmployeePayroll[], template: BankExportTemplate): string {
    const rows = employees.map(emp => {
      const row: any = {};
      template.columns.forEach(col => {
        row[col.header] = col.staticValue ?? this.resolveField(emp, col.field);
      });
      return row;
    });

    const headers = template.includeHeader ? template.columns.map(c => c.header) : [];
    const csvRows = rows.map(r => template.columns.map(c => r[c.header]).join(template.delimiter));

    return template.includeHeader ? [headers.join(template.delimiter), ...csvRows].join('\n') : csvRows.join('\n');
  }

  private resolveField(emp: EmployeePayroll, field: PayrollExportField) {
    switch (field) {
      case 'employeeName': return `${emp.employee.firstName} ${emp.employee.lastName}`;
      case 'accountNumber': return emp.employee.accountNumber;
      case 'bankName': return emp.employee.bankName;
      case 'bankCode': return emp.employee.bvn ?? '';
      case 'amount': return emp.netPayable;
      case 'narration': return `Salary ${emp.month}/${emp.year}`;
      case 'email': return emp.employee.email;
      case 'phone': return emp.employee.phone;
      case 'paymentDate': return new Date(emp.generatedAt).toISOString().split('T')[0];
      case 'reference': return `PAY${emp.id}`;
      default: return '';
    }
  }

   getTemplates(): BankExportTemplate[] {
    const data = localStorage.getItem("bankTemplates");
    return data ? JSON.parse(data) : [];
  }

}