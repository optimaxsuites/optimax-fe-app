// loan-storage.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoanApplication } from './loan.types';

@Injectable({
  providedIn: 'root'
})
export class LoanStorageService {
  private storageKey = 'loanApplications';
  private applications: LoanApplication[] = [];
  private applicationsSubject = new BehaviorSubject<LoanApplication[]>([]);
  
  constructor() {
    this.loadFromStorage();
    this.applicationsSubject.next(this.applications);
  }

  // Observable for real-time updates
  getApplicationsObservable(): Observable<LoanApplication[]> {
    return this.applicationsSubject.asObservable();
  }

  // Get all applications
  getAllApplications(): LoanApplication[] {
    return [...this.applications];
  }

  // Get application by ID
  getApplicationById(id: string): LoanApplication | undefined {
    return this.applications.find(app => app.id === id);
  }

  // Get applications by employee ID
  getApplicationsByEmployeeId(employeeId: string): LoanApplication[] {
    return this.applications.filter(app => app.employeeId === employeeId);
  }

  // Save a new application
  saveApplication(application: LoanApplication): void {
    this.applications.push(application);
    this.saveToStorage();
    this.applicationsSubject.next([...this.applications]);
  }

  // Update existing application
  updateApplication(updatedApp: LoanApplication): void {
    const index = this.applications.findIndex(app => app.id === updatedApp.id);
    if (index !== -1) {
      this.applications[index] = updatedApp;
      this.saveToStorage();
      this.applicationsSubject.next([...this.applications]);
    }
  }

  // Delete application (if needed)
  deleteApplication(id: string): void {
    this.applications = this.applications.filter(app => app.id !== id);
    this.saveToStorage();
    this.applicationsSubject.next([...this.applications]);
  }

  // Initialize with sample data
  initializeSampleData(): void {
    if (this.applications.length === 0) {
      const sampleData = this.createSampleData();
      this.applications = sampleData;
      this.saveToStorage();
      this.applicationsSubject.next([...this.applications]);
    }
  }

  private createSampleData(): LoanApplication[] {
    return [{
      id: 'LN-001',
      employeeId: 'EMP-123',
      fullName: 'Eseose Odion',
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
      repaymentSchedule: [],
      paymentHistory: []
    }];
  }

  private generateId(): string {
    return 'LN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.applications = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored data', e);
        this.applications = [];
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.applications));
  }
}