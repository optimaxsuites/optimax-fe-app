// loan-approval.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LoanApplication, StatusChange } from './loan.types';
import { LoanStorageService } from './loan-storage.service';

@Injectable({
  providedIn: 'root'
})
export class LoanApprovalService {
  
  constructor(private storageService: LoanStorageService) {}

  // Update application status with optional comment
  updateApplicationStatus(
    loanId: string,
    statusOrUpdate: 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'PENDING' | StatusChange
  ): Observable<LoanApplication> {
    const application = this.storageService.getApplicationById(loanId);
    
    if (!application) {
      throw new Error('Application not found');
    }

    const oldStatus = application.status;
    const status = typeof statusOrUpdate === 'string' ? statusOrUpdate : statusOrUpdate.status;
    const notes = typeof statusOrUpdate === 'string' ? undefined : statusOrUpdate.notes;
    const changedBy = typeof statusOrUpdate === 'string' ? 'Admin' : statusOrUpdate.changedBy || 'Admin';
    const date = typeof statusOrUpdate === 'string' ? new Date().toISOString() : statusOrUpdate.date || new Date().toISOString();

    // Update application
    application.status = status;
    
    // Add to status history
    application.statusHistory.push({
      status: status,
      date: date,
      changedBy: changedBy,
      notes: notes || `Status changed from ${oldStatus} to ${status}`
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
    
    // Save changes
    this.storageService.updateApplication(application);
    return of({...application});
  }

  // Approve loan (convenience method)
  approveLoan(loanId: string, notes?: string): Observable<LoanApplication> {
    return this.updateApplicationStatus(loanId, {
      status: 'APPROVED',
      notes: notes || 'Loan approved',
      changedBy: 'Admin',
      date: new Date().toISOString()
    });
  }

  // Reject loan (convenience method)
  rejectLoan(loanId: string, notes: string): Observable<LoanApplication> {
    return this.updateApplicationStatus(loanId, {
      status: 'REJECTED',
      notes: notes || 'Loan rejected',
      changedBy: 'Admin',
      date: new Date().toISOString()
    });
  }

  // Get pending applications
  getPendingApplications(): Observable<LoanApplication[]> {
    const all = this.storageService.getAllApplications();
    const pending = all.filter(app => app.status === 'PENDING');
    return of(pending);
  }
}