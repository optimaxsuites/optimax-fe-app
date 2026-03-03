// loan-application.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LoanApplication, LoanApplicationFormData } from './loan.types';
import { LoanStorageService } from './loan-storage.service';

@Injectable({
  providedIn: 'root'
})
export class LoanApplicationService {
  
  constructor(private storageService: LoanStorageService) {}

  // Submit a new loan application
  submitLoanApplication(formData: LoanApplicationFormData): Observable<LoanApplication> {
    const submittedAt = new Date().toISOString();

    const newApplication: LoanApplication = {
      id: this.generateId(),
      employeeId: 'EMP-123', // Should come from auth
      fullName: 'Eseose Odion', // Should come from auth
      department: 'IT', // Should come from auth
      loanAmount: formData.loanAmount,
      paymentMode: formData.paymentMode,
      status: 'PENDING',
      submittedAt,
      dateSubmitted: formData.submissionDate || submittedAt.split('T')[0],
      purpose: formData.loanPurpose === 'other' ? formData.otherPurpose || 'Other' : formData.loanPurpose,
      repaymentPeriod: formData.repaymentPeriod,
      monthlyRepayment: formData.monthlyRepaymentAmount,
      acknowledgment: formData.acknowledgment,
      interestRate: 0,
      currentBalance: formData.loanAmount,
      totalPaid: 0,
      statusHistory: [{
        status: 'PENDING',
        date: new Date().toISOString(),
        changedBy: 'Employee',
        notes: 'Loan application submitted'
      }],
      repaymentSchedule: this.generateRepaymentSchedule(
        formData.loanAmount, 
        formData.repaymentPeriod, 
        0,
        formData.paymentMode
      ),
      paymentHistory: [],
      supportingDocuments: formData.supportingDocuments || []
    };
    
    this.storageService.saveApplication(newApplication);
    return of(newApplication);
  }

  // Get all applications
  getAllApplications(): Observable<LoanApplication[]> {
    return of(this.storageService.getAllApplications());
  }

  // Get application by ID
  getApplicationById(id: string): Observable<LoanApplication | undefined> {
    return of(this.storageService.getApplicationById(id));
  }

  // Get applications by employee ID
  getApplicationsByEmployeeId(employeeId: string): Observable<LoanApplication[]> {
    return of(this.storageService.getApplicationsByEmployeeId(employeeId));
  }

  // Get real-time observable
  getApplicationsObservable(): Observable<LoanApplication[]> {
    return this.storageService.getApplicationsObservable();
  }

  private generateId(): string {
    const timestampPart = Date.now().toString(36).toUpperCase().slice(-5);
    const randomPart = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `LN-${timestampPart}${randomPart}`;
  }

  private generateRepaymentSchedule(
    loanAmount: number, 
    months: number, 
    interestRate: number,
    paymentMode?: 'monthly' | 'one_off'
  ): any[] {
    if (paymentMode === 'one_off') {
      return [{
        monthNumber: 1,
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        principal: loanAmount,
        interest: 0,
        totalPayment: loanAmount,
        remainingBalance: 0,
        status: 'PENDING'
      }];
    }

    const schedule = [];
    const monthlyInterestRate = interestRate / 100 / 12;
    const monthlyPayment = loanAmount * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) / 
      (Math.pow(1 + monthlyInterestRate, months) - 1);
    
    let remainingBalance = loanAmount;
    
    for (let i = 1; i <= months; i++) {
      const interest = remainingBalance * monthlyInterestRate;
      const principal = monthlyPayment - interest;
      remainingBalance -= principal;
      
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      
      schedule.push({
        monthNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        principal: parseFloat(principal.toFixed(2)),
        interest: parseFloat(interest.toFixed(2)),
        totalPayment: parseFloat(monthlyPayment.toFixed(2)),
        remainingBalance: parseFloat(remainingBalance.toFixed(2)),
        status: 'PENDING'
      });
    }
    
    return schedule;
  }
}