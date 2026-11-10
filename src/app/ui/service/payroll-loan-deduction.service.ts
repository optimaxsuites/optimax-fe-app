import { Injectable } from '@angular/core';
import { LoanService } from './loan/loan.service';
import { CooperativeService } from './loan/cooperative-loan/cooperative.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { computePayrollObligations, EmployeeObligations } from './payroll-obligations';

@Injectable({
  providedIn: 'root'
})
export class PayrollLoanDeductionService {
  constructor(
    private loanService: LoanService,
    private cooperativeService: CooperativeService
  ) {}

  /**
   * What each employee owes payroll this month (1–12) for loans and cooperatives, by employee id:
   * every loan's total repayable and balance, the cooperative group, and the exact amount to take.
   * Rules in payroll-obligations.ts. A source that fails to load counts as empty, so one outage
   * doesn't hide the others.
   */
  getPayrollObligations(month: number, year: number): Observable<Map<string, EmployeeObligations>> {
    const safe = <T>(source: Observable<T[]>) => source.pipe(catchError(() => of([] as T[])));
    return forkJoin({
      advanceLoans: safe<any>(this.loanService.getAllAdvanceLoans() as Observable<any[]>),
      cooperativeLoans: safe<any>(this.cooperativeService.getLoans() as Observable<any[]>),
      cooperativeMembers: safe<any>(this.cooperativeService.getMembers() as Observable<any[]>),
      cooperativeMemberships: safe<any>(this.cooperativeService.loadGroupMemberships() as Observable<any[]>),
      cooperativeGroups: safe<any>(this.cooperativeService.loadGroups() as Observable<any[]>),
    }).pipe(map(sources => computePayrollObligations(sources, month, year)));
  }
}
