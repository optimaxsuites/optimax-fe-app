import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LoanRepaymentService } from './loan-repayment.service';
import { LoanStorageService } from './loan-storage.service';
import { LoanApplication, RepaymentScheduleItem } from './loan.types';
import { CooperativeService } from './cooperative-loan/cooperative.service';
import { CooperativeLoan, CooperativeRepayment } from './cooperative-loan/cooperative.types';

export interface PayrollLoanDeduction {
  loanId: string;
  amount: number;
  reason: string;
  dueDate?: string;
}

export interface LoanPayrollPostingResult {
  applied: number;
  skipped: number;
  failed: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LoanPayrollBridgeService {
  constructor(
    private loanStorageService: LoanStorageService,
    private loanRepaymentService: LoanRepaymentService,
    private cooperativeService: CooperativeService
  ) {}

  getLoanDeductionsForEmployee(employee: any): PayrollLoanDeduction[] {
    // Standard loans
    const activeLoans = this.loanStorageService
      .getAllApplications()
      .filter((loan) => this.isLoanEligibleForPayrollDeduction(loan))
      .filter((loan) => this.isLoanOwnedByEmployee(loan, employee));

    const standardDeductions = activeLoans
      .map((loan) => this.toDeduction(loan))
      .filter((deduction): deduction is PayrollLoanDeduction => !!deduction);

    // Cooperative loans
    const cooperativeLoans: CooperativeLoan[] = this.cooperativeService.getLoansByMember(employee.employeeId || employee.memberId || employee.id);
    const cooperativeDeductions: PayrollLoanDeduction[] = [];
    for (const loan of cooperativeLoans) {
      if (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED') continue;
      const repayments = this.cooperativeService.getRepaymentsByLoanId(loan.id);
      const nextRepayment = repayments.find(r => r.status === 'PENDING' || r.status === 'OVERDUE');
      if (!nextRepayment || nextRepayment.amount <= 0) continue;
      cooperativeDeductions.push({
        loanId: loan.id,
        amount: nextRepayment.amount,
        reason: `Cooperative loan repayment (${loan.id})`,
        dueDate: nextRepayment.dueDate
      });
    }

    return [...standardDeductions, ...cooperativeDeductions];
  }

  async postPayrollLoanDeductions(
    payrollRows: any[],
    period: { month: string; year: number }
  ): Promise<LoanPayrollPostingResult> {
    const result: LoanPayrollPostingResult = {
      applied: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    for (const employee of payrollRows || []) {
      const deductions = employee?.loanDeductions || this.getLoanDeductionsForEmployee(employee);

      for (const deduction of deductions) {
        // Standard loan
        const loan = this.loanStorageService.getApplicationById(deduction.loanId);
        if (loan) {
          const referenceNumber = this.buildPayrollReference(deduction.loanId, period);
          const alreadyPosted = (loan.paymentHistory || []).some(
            (item) => item.referenceNumber === referenceNumber
          );
          if (alreadyPosted) {
            result.skipped += 1;
            continue;
          }
          try {
            await firstValueFrom(this.loanRepaymentService.recordPayment(deduction.loanId, {
              amount: deduction.amount,
              paymentMethod: 'PAYROLL_DEDUCTION',
              date: new Date().toISOString(),
              referenceNumber,
              receivedBy: 'Payroll Module',
              notes: `Auto payroll deduction for ${period.month} ${period.year}`
            }));
            result.applied += 1;
          } catch (error) {
            result.failed += 1;
            const message = error instanceof Error ? error.message : 'Unknown payroll posting error';
            result.errors.push(`${deduction.loanId}: ${message}`);
          }
          continue;
        }

        // Cooperative loan
        const coopLoan = this.cooperativeService.getLoanById(deduction.loanId);
        if (coopLoan) {
          const referenceNumber = this.buildPayrollReference(deduction.loanId, period);
          const repayments = this.cooperativeService.getRepaymentsByLoanId(coopLoan.id);
          const alreadyPosted = repayments.some(
            (item) => item.receiptNumber === referenceNumber
          );
          if (alreadyPosted) {
            result.skipped += 1;
            continue;
          }
          try {
            this.cooperativeService.recordRepayment(coopLoan.id, {
              amount: deduction.amount,
              paymentMethod: 'PAYROLL_DEDUCTION',
              paidDate: new Date().toISOString()
            });
            // Optionally: set receiptNumber to referenceNumber if needed
            result.applied += 1;
          } catch (error) {
            result.failed += 1;
            const message = error instanceof Error ? error.message : 'Unknown payroll posting error';
            result.errors.push(`${deduction.loanId}: ${message}`);
          }
        } else {
          result.skipped += 1;
        }
      }
    }

    return result;
  }

  private toDeduction(loan: LoanApplication): PayrollLoanDeduction | null {
    const nextInstallment = this.getNextOpenInstallment(loan);
    if (!nextInstallment) {
      return null;
    }

    const installmentAmount = Number(nextInstallment.totalPayment || 0);
    const remainingBalance = Number(loan.currentBalance || 0);
    const amount = this.roundCurrency(Math.min(installmentAmount, remainingBalance));

    if (amount <= 0) {
      return null;
    }

    return {
      loanId: loan.id,
      amount,
      reason: `Loan repayment (${loan.id})`,
      dueDate: nextInstallment.dueDate
    };
  }

  private getNextOpenInstallment(loan: LoanApplication): RepaymentScheduleItem | undefined {
    return [...(loan.repaymentSchedule || [])]
      .filter((item) => item.status === 'PENDING' || item.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }

  private isLoanEligibleForPayrollDeduction(loan: LoanApplication): boolean {
    return (loan.status === 'ACTIVE' || loan.status === 'APPROVED') && Number(loan.currentBalance || 0) > 0;
  }

  private isLoanOwnedByEmployee(loan: LoanApplication, employee: any): boolean {
    const employeeCodeCandidates = [
      employee?.employeeId,
      employee?.employeeCode,
      employee?.staffId,
      employee?.id
    ]
      .map((value: unknown) => String(value ?? '').trim())
      .filter((value: string) => !!value);

    const loanEmployeeCode = String(loan.employeeId ?? '').trim();
    if (loanEmployeeCode && employeeCodeCandidates.includes(loanEmployeeCode)) {
      return true;
    }

    const employeeNameCandidates = [employee?.fullName, employee?.name]
      .map((value: unknown) => this.normalizeName(String(value ?? '')))
      .filter((value: string) => !!value);

    const loanName = this.normalizeName(loan.fullName || '');
    return !!loanName && employeeNameCandidates.includes(loanName);
  }

  private normalizeName(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private buildPayrollReference(loanId: string, period: { month: string; year: number }): string {
    const normalizedMonth = String(period.month || '')
      .toUpperCase()
      .replace(/\s+/g, '-');
    return `PAYROLL-${period.year}-${normalizedMonth}-${loanId}`;
  }
}
