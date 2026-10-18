import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Message } from 'primeng/api';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { EmployeeService } from '../../../service/employee.service';
import {
  formatAdvancedLoanCode,
  resolveLoanOutstandingBalance,
  resolveLoanTotalPaid,
  resolveLoanTotalRepayableAmount,
  resolveSessionUserId
} from '../../../service/loan/loan-display.util';
import { formatNaira, getLoanStatusClass, getLoanStatusLabel } from '../../../service/loan/loan-format.util';

/** Statuses in which a loan has been disbursed and can have repayments recorded against it. */
const REPAYMENT_STATUSES: ReadonlyArray<LoanApplication['status']> = ['ACTIVE', 'OVERDUE', 'SKIPPED', 'PAUSED', 'DEFAULTED', 'COMPLETED'];

/**
 * The signed-in employee's payment history across their advance loans. Lists loans that have entered
 * repayment and shows the payment records for the selected one (`?loanId=` preselects a loan).
 */
@Component({
  selector: 'app-employee-payment-history-page',
  templateUrl: './employee-payment-history-page.component.html',
  styleUrls: ['./employee-payment-history-page.component.scss']
})
export class EmployeePaymentHistoryPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  isLoading = true;
  messages: Message[] = [];
  loans: LoanApplication[] = [];
  selectedLoanId: number | null = null;

  private employeeId = '';
  private requestedLoanId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private loanApplicationService: LoanApplicationService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.requestedLoanId = Number(this.route.snapshot.queryParamMap.get('loanId')) || null;
    this.resolveEmployeeAndLoadLoans();
  }

  get selectedLoan(): LoanApplication | null {
    return this.loans.find((loan) => loan.id === this.selectedLoanId) || null;
  }

  selectLoan(loan: LoanApplication): void {
    if (loan.id === this.selectedLoanId) {
      return;
    }
    this.selectedLoanId = loan.id;
    // Keep the selection in the URL so refresh/back returns to the same loan.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { loanId: loan.id },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    const loanBase = this.router.url.includes('/admin/hr/') ? '/admin/hr/loan' : '/loan';
    this.router.navigate([loanBase, this.route.snapshot.paramMap.get('uuid') || 'uu'], {
      queryParams: { tab: 'my-loans' }
    });
  }

  getLoanCode(loan: LoanApplication): string {
    return formatAdvancedLoanCode(loan.loanCode || loan.id);
  }

  getTotalRepayable(loan: LoanApplication): number {
    return resolveLoanTotalRepayableAmount(loan);
  }

  getTotalRepaid(loan: LoanApplication): number {
    return resolveLoanTotalPaid(loan);
  }

  getOutstanding(loan: LoanApplication): number {
    return resolveLoanOutstandingBalance(loan);
  }

  formatCurrency(amount: number): string {
    return formatNaira(amount);
  }

  getStatusLabel(status: string): string {
    return getLoanStatusLabel(status);
  }

  getStatusClass(status: string): string {
    return getLoanStatusClass(status);
  }

  trackByLoanId(_: number, loan: LoanApplication): number {
    return loan.id;
  }

  private resolveEmployeeAndLoadLoans(): void {
    const cachedEmployeeId = this.readCachedEmployeeId();
    const userId = resolveSessionUserId();

    if (!userId) {
      this.useEmployeeId(cachedEmployeeId, 'No logged-in user was found in this session. Please sign in again.');
      return;
    }

    this.employeeService.getEmployeeByUserId(userId).pipe(
      map((employee: any) => String(employee?.id || employee?.employeeId || '').trim()),
      catchError(() => of('')),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((employeeId) => {
      this.useEmployeeId(employeeId || cachedEmployeeId, 'No employee record is linked to your user account.');
    });
  }

  private useEmployeeId(employeeId: string, failureDetail: string): void {
    if (!employeeId) {
      this.isLoading = false;
      this.messages = [{ severity: 'warn', summary: 'Employee Not Found', detail: failureDetail }];
      return;
    }

    this.employeeId = employeeId;
    this.loanApplicationService.getApplicationsObservable()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((applications) => {
        // Match on employee id only: names aren't unique, so matching by name could show
        // another employee's loans.
        this.loans = applications
          .filter((loan) => String(loan.employeeId) === this.employeeId)
          .filter((loan) => REPAYMENT_STATUSES.includes(loan.status) || !!loan.disbursedDate)
          .sort((a, b) =>
            new Date(b.disbursedDate || b.requestDate).getTime() - new Date(a.disbursedDate || a.requestDate).getTime()
          );
        this.syncSelection();
        this.isLoading = false;
      });
  }

  private syncSelection(): void {
    const has = (id: number | null) => id !== null && this.loans.some((loan) => loan.id === id);
    if (has(this.selectedLoanId)) {
      return;
    }
    this.selectedLoanId = has(this.requestedLoanId) ? this.requestedLoanId : (this.loans[0]?.id ?? null);
  }

  private readCachedEmployeeId(): string {
    const value = String(sessionStorage.getItem('employeeId') || '').trim();
    return value && value !== 'undefined' && value !== 'null' ? value : '';
  }
}
