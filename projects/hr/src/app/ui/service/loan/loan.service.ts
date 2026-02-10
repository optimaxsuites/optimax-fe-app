// loan.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface LoanApplication {
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  loanAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  dateSubmitted: string;
  purpose: string;
  repaymentPeriod: number;
  monthlyRepayment: number;
  acknowledgment: boolean;
  
  // New fields for enhanced features
  interestRate: number;
  approvedDate?: string;
  startDate?: string;
  endDate?: string;
  currentBalance: number;
  totalPaid: number;
  overdueDays?: number;
  
  // Status history
  statusHistory: StatusChange[];
  
  // Repayment schedule
  repaymentSchedule: RepaymentScheduleItem[];
  
  // Payment history
  paymentHistory: PaymentRecord[];
}

export interface StatusChange {
  id?: string;
  status: string;
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
  
  constructor() {
    this.loadFromStorage();
  }

  // Submit a new loan application
  submitLoanApplication(formData: any): Observable<LoanApplication> {
    const newApplication: LoanApplication = {
      id: this.generateId(),
      employeeId: this.generateEmployeeId(),
      fullName: 'Current User',
      department: 'Unknown',
      loanAmount: formData.loanAmount,
      status: 'PENDING',
      dateSubmitted: new Date().toISOString().split('T')[0],
      purpose: formData.loanPurpose,
      repaymentPeriod: formData.repaymentPeriod,
      monthlyRepayment: formData.monthlyRepaymentAmount,
      acknowledgment: formData.acknowledgment,
      interestRate: 5.5, // Default interest rate
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
    
    return of(newApplication);
  }

  // Generate repayment schedule
  private generateRepaymentSchedule(loanAmount: number, months: number, interestRate: number): RepaymentScheduleItem[] {
    const schedule: RepaymentScheduleItem[] = [];
    const monthlyInterestRate = interestRate / 100 / 12;
    const today = new Date();
    
    // Calculate monthly payment using amortization formula
    const monthlyPayment = loanAmount * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) / 
      (Math.pow(1 + monthlyInterestRate, months) - 1);
    
    let remainingBalance = loanAmount;
    
    for (let i = 1; i <= months; i++) {
      const interest = remainingBalance * monthlyInterestRate;
      const principal = monthlyPayment - interest;
      remainingBalance -= principal;
      
      // Calculate due date
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

  // SINGLE UPDATED METHOD: Update application status (all statuses)
  updateApplicationStatus(loanId: string, status: 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'PENDING'): Observable<LoanApplication> {
    const application = this.applications.find(app => app.id === loanId);
    if (application) {
      const oldStatus = application.status;
      application.status = status;
      
      // Add to status history
      application.statusHistory.push({
        status: status,
        date: new Date().toISOString().split('T')[0],
        changedBy: 'Admin',
        notes: `Status changed from ${oldStatus} to ${status}`
      });
      
      // Handle special cases for different statuses
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
      return of({...application});
    }
    throw new Error('Application not found');
  }

  // Record a payment
  recordPayment(loanId: string, paymentData: any): Observable<LoanApplication> {
    const application = this.applications.find(app => app.id === loanId);
    if (application) {
      // Add payment to history
      const paymentRecord: PaymentRecord = {
        date: new Date().toISOString().split('T')[0],
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: paymentData.referenceNumber,
        receivedBy: paymentData.receivedBy,
        notes: paymentData.notes
      };
      
      application.paymentHistory.push(paymentRecord);
      
      // Update current balance and total paid
      application.totalPaid += paymentData.amount;
      application.currentBalance -= paymentData.amount;
      
      // Update repayment schedule
      this.updateRepaymentSchedule(application, paymentData.amount);
      
      // Update status if fully paid
      if (application.currentBalance <= 0) {
        this.updateApplicationStatus(loanId, 'COMPLETED');
      } else if (application.status === 'PENDING' || application.status === 'APPROVED') {
        // Change to ACTIVE when first payment is made
        this.updateApplicationStatus(loanId, 'ACTIVE');
      }
      
      this.saveToStorage();
      return of({...application});
    }
    throw new Error('Application not found');
  }

  private updateRepaymentSchedule(application: LoanApplication, paymentAmount: number): void {
    let remainingPayment = paymentAmount;
    
    for (const scheduleItem of application.repaymentSchedule) {
      if (scheduleItem.status === 'PENDING' || scheduleItem.status === 'OVERDUE') {
        if (remainingPayment >= scheduleItem.totalPayment) {
          scheduleItem.status = 'PAID';
          scheduleItem.paymentDate = new Date().toISOString().split('T')[0];
          scheduleItem.paidAmount = scheduleItem.totalPayment;
          remainingPayment -= scheduleItem.totalPayment;
        } else {
          scheduleItem.paidAmount = remainingPayment;
          remainingPayment = 0;
        }
        
        if (remainingPayment <= 0) break;
      }
    }
  }

  // Get all applications for admin
  getAllApplications(): Observable<LoanApplication[]> {
    return of([...this.applications]);
  }

  // Get applications with filters
  getApplications(filters?: any): Observable<LoanApplication[]> {
    let filtered = [...this.applications];
    
    if (filters) {
      if (filters.status) {
        filtered = filtered.filter(app => app.status === filters.status);
      }
      if (filters.department) {
        filtered = filtered.filter(app => app.department === filters.department);
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(app => 
          app.fullName.toLowerCase().includes(term) ||
          app.employeeId.toLowerCase().includes(term)
        );
      }
    }
    
    return of(filtered);
  }

  // Get single application by ID
  getApplicationById(id: string): Observable<LoanApplication | undefined> {
    return of(this.applications.find(app => app.id === id));
  }

  // Private helper methods
  private generateId(): string {
    return 'LN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  private generateEmployeeId(): string {
    return 'EMP-' + Math.floor(100 + Math.random() * 900);
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