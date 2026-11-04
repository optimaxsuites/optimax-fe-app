import { Injectable } from '@angular/core';
import { CooperativeLoan, PaymentHistory } from '../domain/loan/cooperative-loan.dto';
import { AdvanceLoan, AdvanceLoanPaymentHistory } from '../domain/loan/advance-loan.dto';
import { firstValueFrom } from 'rxjs';
import { LoanService } from './loan/loan.service';
import { CooperativeService } from './loan/cooperative-loan/cooperative.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
/** The employee id on a payroll row. Rows nest the employee, so `row.id` is the payroll row's own id. */
function payrollEmployeeId(row: any): any {
  return row?.employee?.id ?? row?.employeeId ?? row?.id;
}

/** Payroll only takes repayments set up as payroll deductions; transfers and cash were already paid. */
function isPayrollDeduction(payment: any): boolean {
  return (payment?.paymentMethod ?? payment?.modeofPayment) === 'PAYROLL_DEDUCTION';
}

@Injectable({
  providedIn: 'root'
})
export class PayrollLoanDeductionService {
  constructor(
    private loanService: LoanService,
    private cooperativeService: CooperativeService
  ) {}

  /**
   * Fetches and applies both advance and cooperative loan deductions to payroll records for a given month and year.
   * @param payrollRecords Array of payroll records (employeesPayroll)
   * @param month Payroll month (number, 1-12)
   * @param year Payroll year
   * @returns Observable of updated payroll records with loan deductions applied
   */
  getLoanDeductionsForPayroll(payrollRecords: any[], month: number, year: number) {
    return forkJoin({
      advanceLoans: this.loanService.getAllAdvanceLoans(),
      cooperativeLoans: this.cooperativeService.getLoans()
    }).pipe(
      map(({ advanceLoans, cooperativeLoans }) => {
        return payrollRecords.map(employee => {
          // Advance Loan Deductions
          const employeeAdvanceLoans = (advanceLoans || []).filter((loan: AdvanceLoan) =>
            String(loan.employee?.id) === String(payrollEmployeeId(employee)) && loan.status === 'ACTIVE'
          );
          let advanceLoanDeduction = 0;
          employeeAdvanceLoans.forEach(loan => {
            const payment = (loan.paymentHistory || []).find((ph: AdvanceLoanPaymentHistory) => {
              const paidAt = new Date(ph.paidAt);
              return isPayrollDeduction(ph) && paidAt.getFullYear() === year && paidAt.getMonth() + 1 === month;
            });
            if (payment) {
              advanceLoanDeduction += payment.totalAmount || 0;
            }
          });
          // Cooperative Loan Deductions
          const employeeCoopLoans = (cooperativeLoans || []).filter((loan: CooperativeLoan) => {
            // cooperativeMemberId is string|number, match to employee.id
            return String(loan.cooperativeMemberId) === String(payrollEmployeeId(employee)) && loan.status === 'ACTIVE';
          });
          let coopLoanDeduction = 0;
          employeeCoopLoans.forEach(loan => {
            const payment = (loan.paymentHistory || []).find((ph: PaymentHistory) => {
              const paidAt = new Date(ph.paidAt);
              return isPayrollDeduction(ph) && paidAt.getFullYear() === year && paidAt.getMonth() + 1 === month;
            });
            if (payment && payment.status === 'PENDING') {
              coopLoanDeduction += payment.amount || 0;
            }
          });
          // Add deductions to employee
          if (advanceLoanDeduction > 0) {
            employee.deductions = employee.deductions || [];
            employee.deductions.push({ amount: advanceLoanDeduction, reason: 'Advance Loan Repayment' });
          }
          if (coopLoanDeduction > 0) {
            employee.deductions = employee.deductions || [];
            employee.deductions.push({ amount: coopLoanDeduction, reason: 'Cooperative Loan Repayment' });
          }
          return employee;
        });
      })
    );
  }
    /**
     * Applies advance loan deductions to payroll records.
     * @param payrollRecords Array of payroll records (employeesPayroll)
     * @param loans Array of advance loans
     * @param month Payroll month (number, 1-12)
     * @param year Payroll year
     * @returns Updated payroll records with loan deductions applied
     */
    applyAdvanceLoanDeductions(
      payrollRecords: any[],
      loans: AdvanceLoan[],
      month: number,
      year: number
    ): any[] {
      return payrollRecords.map(employee => {
        // Find loans for this employee
        const employeeLoans = loans.filter(loan =>
          String(loan.employee?.id) === String(payrollEmployeeId(employee)) && loan.status === 'ACTIVE'
        );
        let loanDeduction = 0;
        employeeLoans.forEach(loan => {
          // Find payment for this month/year
          const payment = (loan.paymentHistory || []).find((ph: AdvanceLoanPaymentHistory) => {
            const paidAt = new Date(ph.paidAt);
            return isPayrollDeduction(ph) && paidAt.getFullYear() === year && paidAt.getMonth() + 1 === month;
          });
          if (payment) {
            loanDeduction += payment.totalAmount || 0;
          }
        });
        // Add deduction to employee if any
        if (loanDeduction > 0) {
          employee.deductions = employee.deductions || [];
          employee.deductions.push({ amount: loanDeduction, reason: 'Advance Loan Repayment' });
        }
        return employee;
      });
    }
  /**
   * Returns loan deductions for a single employee for a given month and year.
   * Merges logic from LoanPayrollBridgeService for per-employee calculation.
   */
  async getLoanDeductionsForEmployee(employee: any, month: number, year: number): Promise<{ amount: number; reason: string; dueDate?: string }[]> {
    // Advance Loans
    const advanceLoans = await firstValueFrom(this.loanService.getAllAdvanceLoans());
    const employeeAdvanceLoans = (advanceLoans || []).filter((loan: any) =>
      String(loan.employee?.id) === String(payrollEmployeeId(employee)) && loan.status === 'ACTIVE'
    );
    let advanceDeductions: { amount: number; reason: string; dueDate?: string }[] = [];
    employeeAdvanceLoans.forEach((loan: any) => {
      const payment = (loan.paymentHistory || []).find((ph: any) => {
        const paidAt = new Date(ph.paidAt);
        return isPayrollDeduction(ph) && paidAt.getFullYear() === year && paidAt.getMonth() + 1 === month;
      });
        if (payment) {
          advanceDeductions.push({ amount: payment.totalAmount || 0, reason: 'Advance Loan Repayment', dueDate: payment.paidAt });
        }
    });

    // Cooperative Loans
    const cooperativeLoans = await firstValueFrom(this.cooperativeService.getLoans());
    const employeeCoopLoans = (cooperativeLoans || []).filter((loan: any) =>
      String(loan.cooperativeMemberId) === String(payrollEmployeeId(employee)) && loan.status === 'ACTIVE'
    );
    let coopDeductions: { amount: number; reason: string; dueDate?: string }[] = [];
    employeeCoopLoans.forEach((loan: any) => {
      const payment = (loan.paymentHistory || []).find((ph: any) => {
        const paidAt = new Date(ph.paidAt);
        return isPayrollDeduction(ph) && paidAt.getFullYear() === year && paidAt.getMonth() + 1 === month;
      });
      if (payment && payment.status === 'PENDING') {
        coopDeductions.push({ amount: payment.amount || 0, reason: 'Cooperative Loan Repayment', dueDate: payment.paidAt });
      }
    });

    return [...advanceDeductions, ...coopDeductions];
  }
}
