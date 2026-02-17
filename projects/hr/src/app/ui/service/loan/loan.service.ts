// loan.service.ts - UPDATED
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';

export interface LoanApplication {
  approvedDate?: string;
  startDate?: string;
  endDate?: string;
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  loanAmount: number;
  paymentMode?: 'monthly' | 'one_off';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  dateSubmitted: string;
  purpose: string;
  repaymentPeriod: number;
  monthlyRepayment: number;
  acknowledgment: boolean;
  interestRate: number;
  currentBalance: number;
  totalPaid: number;
  statusHistory: StatusChange[];
  repaymentSchedule: RepaymentScheduleItem[];
  paymentHistory: PaymentRecord[];
}

export interface StatusChange {
  id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  date: string;
  changedBy?: string;
  notes?: string;
}

export interface RepaymentScheduleItem {
  id?: string;
  monthNumber: number;
  dueDate: string;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'SKIPPED';
  paymentDate?: string;
  paidAmount?: number;
}

export interface PaymentRecord {
  id?: string;
  date: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  receivedBy?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private storageKey = 'loanApplications';
  private applications: LoanApplication[] = [];
  private applicationsSubject = new BehaviorSubject<LoanApplication[]>([]);
  
  constructor() {
    this.loadFromStorage();
    // Initialize with some sample data if empty
    if (this.applications.length === 0) {
      this.initializeSampleData();
    }
    this.applicationsSubject.next(this.applications);
  }

  // Initialize with sample data
  private initializeSampleData(): void {
    const sampleData: LoanApplication[] = [
      {
        id: 'LN-001',
        employeeId: 'EMP-123',
        fullName: 'Jane Doe',
        department: 'IT',
        loanAmount: 50000,
        paymentMode: 'monthly',
        status: 'PENDING',
        dateSubmitted: new Date().toISOString().split('T')[0],
        purpose: 'Medical Emergency',
        repaymentPeriod: 12,
        monthlyRepayment: 4166.67,
        acknowledgment: true,
        interestRate: 5.5,
        currentBalance: 50000,
        totalPaid: 0,
        statusHistory: [{
          status: 'PENDING',
          date: new Date().toISOString().split('T')[0],
          notes: 'Loan application submitted'
        }],
        repaymentSchedule: this.generateRepaymentSchedule(50000, 12, 5.5),
        paymentHistory: []
      }
    ];
    
    this.applications = sampleData;
    this.saveToStorage();
  }

  // Submit a new loan application
  submitLoanApplication(formData: any): Observable<LoanApplication> {
    const newApplication: LoanApplication = {
      id: this.generateId(),
      employeeId: 'EMP-123', // This should come from auth service in real app
      fullName: 'Jane Doe', // This should come from auth service
      department: 'IT', // This should come from auth service
      loanAmount: formData.loanAmount,
      paymentMode: formData.paymentMode,
      status: 'PENDING',
      dateSubmitted: new Date().toISOString().split('T')[0],
      purpose: formData.loanPurpose,
      repaymentPeriod: formData.repaymentPeriod,
      monthlyRepayment: formData.monthlyRepaymentAmount,
      acknowledgment: formData.acknowledgment,
      interestRate: 5.5,
      currentBalance: formData.loanAmount,
      totalPaid: 0,
      statusHistory: [{
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0],
        notes: 'Loan application submitted'
      }],
      repaymentSchedule: this.generateRepaymentSchedule(formData.loanAmount, formData.repaymentPeriod, 5.5),
      paymentHistory: []
    };
    
    this.applications.push(newApplication);
    this.saveToStorage();
    this.applicationsSubject.next([...this.applications]);
    
    return of(newApplication);
  }

  // Get applications as observable for live updates
  getApplicationsObservable(): Observable<LoanApplication[]> {
    return this.applicationsSubject.asObservable();
  }

  // Update application status
  updateApplicationStatus(
    loanId: string,
    statusOrUpdate: 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'PENDING' | StatusChange
  ): Observable<LoanApplication> {
    const application = this.applications.find(app => app.id === loanId);
    if (application) {
      const oldStatus = application.status;
      const status = typeof statusOrUpdate === 'string' ? statusOrUpdate : statusOrUpdate.status;
      const notes = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.notes;
      const changedBy = typeof statusOrUpdate === 'string' ? 'Admin' : statusOrUpdate.changedBy;
      const date = typeof statusOrUpdate === 'string' ? new Date().toISOString().split('T')[0] : statusOrUpdate.date;

      application.status = status;
      
      // Add to status history
      application.statusHistory.push({
        status: status,
        date: date,
        changedBy: changedBy,
        notes: notes ?? `Status changed from ${oldStatus} to ${status}`
      });
      
      // Handle special cases
      switch(status) {
        case 'APPROVED':
          application.approvedDate = new Date().toISOString().split('T')[0];
          application.startDate = new Date().toISOString().split('T')[0];
          break;
        case 'ACTIVE':
          if (!application.startDate) {
            application.startDate = new Date().toISOString().split('T')[0];
          }
          break;
        case 'COMPLETED':
          application.endDate = new Date().toISOString().split('T')[0];
          application.currentBalance = 0;
          break;
        case 'REJECTED':
          application.endDate = new Date().toISOString().split('T')[0];
          break;
      }
      
      this.saveToStorage();
      this.applicationsSubject.next([...this.applications]);
      return of({...application});
    }
    throw new Error('Application not found');
  }

  // Get all applications
  getAllApplications(): Observable<LoanApplication[]> {
    return of([...this.applications]);
  }

  // Get application by ID
  getApplicationById(id: string): Observable<LoanApplication | undefined> {
    return of(this.applications.find(app => app.id === id));
  }

  // Get applications by employee ID
  getApplicationsByEmployeeId(employeeId: string): Observable<LoanApplication[]> {
    const employeeLoans = this.applications.filter(app => app.employeeId === employeeId);
    return of([...employeeLoans]);
  }

  // Private helper methods
  private generateRepaymentSchedule(loanAmount: number, months: number, interestRate: number): RepaymentScheduleItem[] {
    const schedule: RepaymentScheduleItem[] = [];
    const monthlyInterestRate = interestRate / 100 / 12;
    const today = new Date();
    
    const monthlyPayment = loanAmount * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) / 
      (Math.pow(1 + monthlyInterestRate, months) - 1);
    
    let remainingBalance = loanAmount;
    
    for (let i = 1; i <= months; i++) {
      const interest = remainingBalance * monthlyInterestRate;
      const principal = monthlyPayment - interest;
      remainingBalance -= principal;
      
      const dueDate = new Date(today);
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

  private generateId(): string {
    return 'LN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.applications = JSON.parse(stored);
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.applications));
  }
}