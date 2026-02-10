import { Loan } from './../loan.model';
import { Component, Input, OnInit } from '@angular/core';
import { LoanService, LoanApplication, StatusChange } from '../../../service/loan/loan.service';

@Component({
  selector: 'app-status-tracking',
  templateUrl: './status-tracking.component.html',
  styleUrls: ['./status-tracking.component.scss']
})
export class StatusTrackingComponent implements OnInit {
  @Input() loan!: LoanApplication;
  @Input() canChangeStatus: boolean = false;
  
  statusHistory: StatusChange[] = [];
  statusOptions = [
    { value: 'PENDING', label: 'Pending', color: '#d4b400' },
    { value: 'APPROVED', label: 'Approved', color: '#2EB270' },
    { value: 'REJECTED', label: 'Rejected', color: '#FF0000' },
    { value: 'ACTIVE', label: 'Active', color: '#2E6276' },
    { value: 'COMPLETED', label: 'Completed', color: '#2EB270' }
  ];
  
  ngOnInit() {
    this.loadStatusHistory();
  }
  
  loadStatusHistory(): void {
    if (this.loan.statusHistory && this.loan.statusHistory.length > 0) {
      this.statusHistory = [...this.loan.statusHistory].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    } else {
      // Create initial status history
      this.statusHistory = [{
        status: 'SUBMITTED',
        date: this.loan.dateSubmitted,
        notes: 'Loan application submitted'
      }];
    }
  }
  
  getStatusColor(status: string): string {
    const statusOption = this.statusOptions.find(s => s.value === status);
    return statusOption ? statusOption.color : '#495057';
  }
  
  getStatusLabel(status: string): string {
    const statusOption = this.statusOptions.find(s => s.value === status);
    return statusOption ? statusOption.label : status;
  }
  
  // For admin to change status
  changeStatus(newStatus: string): void {
    if (confirm(`Change status to ${newStatus}?`)) {
      const statusChange: StatusChange = {
        status: newStatus,
        date: new Date().toISOString().split('T')[0],
        changedBy: 'Admin',
        notes: `Status changed from ${this.loan.status} to ${newStatus}`
      };
      
      // In real app, you would call a service method
      console.log('Status change requested:', statusChange);
      
      // Add to local history for display
      this.statusHistory.unshift(statusChange);
      this.loan.status = newStatus as any;
    }
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}