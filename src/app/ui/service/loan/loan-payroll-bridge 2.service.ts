import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LoanApplication, RepaymentScheduleItem } from './loan.types';
import { CooperativeService } from './cooperative-loan/cooperative.service';
import { CooperativeLoan } from '../../domain/loan/cooperative-loan.dto';
import { EmployeeService } from '../employee.service';
import { LoanService } from './loan.service';

export interface PayrollLoanDeduction {
  loanId: number;
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
    private loanService: LoanService,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService
  ) {}

  async getLoanDeductionsForEmployee(employee: any): Promise<PayrollLoanDeduction[]> {
    try {
      const employeeDetails = await firstValueFrom(
        this.employeeService.getEmployeeById(Number(employee.employeeId || employee.id))
      );
      const activeLoans = await firstValueFrom(this.loanService.listLoanApplications());
      const eligibleAdvanceLoans = activeLoans
        .filter((loan) => this.isLoanEligibleForPayrollDeduction(loan))
        .filter((loan) => this.isLoanOwnedByEmployee(loan, employeeDetails));
      const standardDeductions = eligibleAdvanceLoans
        .map((loan) => this.toDeduction(loan))
        .filter((deduction): deduction is PayrollLoanDeduction => !!deduction);
      const cooperativeLoans: CooperativeLoan[] = this.cooperativeService.getLoansByMember(
        Number(employeeDetails.employeeId || employeeDetails.memberId || employeeDetails.id || 0)
      );
      const cooperativeDeductions: PayrollLoanDeduction[] = [];

      for (const loan of cooperativeLoans) {
        if (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED') {
          continue;
        }

        const repayments = this.cooperativeService.getRepaymentsByLoanId(loan.id);
        const nextRepayment = repayments.find((repayment) => repayment.status === 'PENDING' || repayment.status === 'OVERDUE');
        if (!nextRepayment || nextRepayment.amount <= 0) {
          continue;
        }

        cooperativeDeductions.push({
          loanId: loan.id,
          amount: Number(nextRepayment.amount || 0),
          reason: `Cooperative loan repayment (${loan.loanCode || loan.loanId || loan.id})`,
          dueDate: nextRepayment.dueDate
        });
      }

      return [...standardDeductions, ...cooperativeDeductions];
    } catch (error) {
      console.error('Unable to prepare payroll loan deductions', error);
      return [];
    }
  }

  private toDeduction(loan: LoanApplication): PayrollLoanDeduction | null {
    const nextInstallment = this.getNextOpenInstallment(loan);
    if (!nextInstallment) {
      return null;
    }
    const installmentAmount = Number(nextInstallment.totalAmount || 0);
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

  private buildPayrollReference(loanId: number, period: { month: string; year: number }): string {
      const normalizedMonth = String(period.month || '')
        .toUpperCase()
        .replace(/\s+/g, '-');
      return `PAYROLL-${period.year}-${normalizedMonth}-${loanId}`;
    }
}
