import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ── TypeScript interfaces mapped 1:1 from Java DTOs ──────────────────────────

export interface HrExecutiveReport {
  totalPayroll: number;
  totalOutstandingBalance: number;
  totalEmployees: number;
  activeEmployees: number;
  totalCooperativeLoanRecords: number;
  totalAdvanceLoanRecords: number;
  totalOverdueLoanRecords: number;
}

export interface HrWorkforceOverviewRow {
  department: string;
  level: string;
  status: string;
  gender: string;
  headcount: number;
  joins: number;
  exits: number;
  vacancyCount: number;
}

export interface HrWorkforceOverview {
  totalHeadcount: number;
  totalJoins: number;
  totalExits: number;
  totalVacancies: number;
  rows: HrWorkforceOverviewRow[];
}

export interface HrPayrollSummaryRow {
  department: string;
  employeeCount: number;
  grossPay: number;
  netPayable: number;
  totalDeductions: number;
  employerCost: number;
}

export interface HrPayrollSummary {
  totalGrossPay: number;
  totalNetPayable: number;
  totalDeductions: number;
  totalEmployerCost: number;
  rows: HrPayrollSummaryRow[];
}

export interface HrLeaveAttendanceRow {
  leaveType: string;
  status: string;
  requestCount: number;
  totalDays: number;
}

export interface HrLeaveAttendance {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  totalLeaveDays: number;
  rows: HrLeaveAttendanceRow[];
}

export interface HrEmployeeTurnoverRow {
  department: string;
  joins: number;
  exits: number;
  turnoverRate: number;
}

export interface HrEmployeeTurnover {
  totalEmployees: number;
  totalJoins: number;
  totalExits: number;
  turnoverRate: number;
  rows: HrEmployeeTurnoverRow[];
}

export interface HrCompensationEquityRow {
  level: string;
  department: string;
  gender: string;
  employeeCount: number;
  averageNetPayable: number;
  medianApproxNetPayable: number;
}

export interface HrCompensationEquity {
  overallAverageNetPayable: number;
  totalPayrollRecords: number;
  rows: HrCompensationEquityRow[];
}

export interface HrRiskSummary {
  totalEmployees: number;
  activeEmployees: number;
  totalLoanExposure: number;
  totalOverdueLoans: number;
  totalDefaultedLoans: number;
  gracePeriodRequests: number;
}

export interface HrProbationTrackingRow {
  employeeId: number;
  employeeName: string;
  department: string;
  level: string;
  probationEndDate: string;
  probationStatus: string;
}

export interface HrProbationTracking {
  totalOnProbation: number;
  probationDueSoon: number;
  probationOverdue: number;
  rows: HrProbationTrackingRow[];
}

export interface HrStatutoryRemittanceRow {
  id: number;
  nsitfRate: number;
  itfRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface HrStatutoryRemittance {
  totalNsitfRate: number;
  totalItfRate: number;
  totalRecords: number;
  rows: HrStatutoryRemittanceRow[];
}

export interface HrBonusReportRow {
  level: string;
  bonusType: string;
  count: number;
  totalAmount: number;
}

export interface HrBonusReport {
  totalBonuses: number;
  totalBonusAmount: number;
  rows: HrBonusReportRow[];
}

export interface HrOvertimeCostRow {
  level: string;
  overtimeType: string;
  maxHours: number;
  rate: number;
  configuredCost: number;
}

export interface HrOvertimeCost {
  totalConfiguredCost: number;
  totalConfigurations: number;
  rows: HrOvertimeCostRow[];
}

export interface HrVacancyAgingRow {
  id: number;
  jobTitle: string;
  location: string;
  jobType: string;
  daysOpen: number;
  expired: boolean;
}

export interface HrVacancyAging {
  totalVacancies: number;
  expiredVacancies: number;
  averageDaysOpen: number;
  rows: HrVacancyAgingRow[];
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class HrReportingService {
  private readonly baseUrl = 'https://be.optimaxsuites.com';
  private readonly reportsBase = `${this.baseUrl}/x/api/v2/hr/reports`;

  constructor(private readonly http: HttpClient) {}

  getExecutiveReport(): Observable<HrExecutiveReport> {
    return this.http
      .get<HrExecutiveReport>(`${this.reportsBase}/executive`)
      .pipe(catchError(this.handleError));
  }

  getWorkforceOverview(): Observable<HrWorkforceOverview> {
    return this.http
      .get<HrWorkforceOverview>(`${this.reportsBase}/workforce-overview`)
      .pipe(catchError(this.handleError));
  }

  getPayrollSummary(): Observable<HrPayrollSummary> {
    return this.http
      .get<HrPayrollSummary>(`${this.reportsBase}/payroll-summary`)
      .pipe(catchError(this.handleError));
  }

  getLeaveAttendance(): Observable<HrLeaveAttendance> {
    return this.http
      .get<HrLeaveAttendance>(`${this.reportsBase}/leave-attendance`)
      .pipe(catchError(this.handleError));
  }

  getEmployeeTurnover(): Observable<HrEmployeeTurnover> {
    return this.http
      .get<HrEmployeeTurnover>(`${this.reportsBase}/employee-turnover`)
      .pipe(catchError(this.handleError));
  }

  getCompensationEquity(): Observable<HrCompensationEquity> {
    return this.http
      .get<HrCompensationEquity>(`${this.reportsBase}/compensation-equity`)
      .pipe(catchError(this.handleError));
  }

  getHrRisk(): Observable<HrRiskSummary> {
    return this.http
      .get<HrRiskSummary>(`${this.reportsBase}/hr-risk`)
      .pipe(catchError(this.handleError));
  }

  getProbationTracking(): Observable<HrProbationTracking> {
    return this.http
      .get<HrProbationTracking>(`${this.reportsBase}/probation-tracking`)
      .pipe(catchError(this.handleError));
  }

  getStatutoryRemittance(): Observable<HrStatutoryRemittance> {
    return this.http
      .get<HrStatutoryRemittance>(`${this.reportsBase}/statutory-remittance`)
      .pipe(catchError(this.handleError));
  }

  getBonusReport(): Observable<HrBonusReport> {
    return this.http
      .get<HrBonusReport>(`${this.reportsBase}/bonus-report`)
      .pipe(catchError(this.handleError));
  }

  getOvertimeCost(): Observable<HrOvertimeCost> {
    return this.http
      .get<HrOvertimeCost>(`${this.reportsBase}/overtime-cost`)
      .pipe(catchError(this.handleError));
  }

  getVacancyAging(): Observable<HrVacancyAging> {
    return this.http
      .get<HrVacancyAging>(`${this.reportsBase}/vacancy-aging`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('HrReportingService error:', error);
    return throwError(() => error);
  }
}
