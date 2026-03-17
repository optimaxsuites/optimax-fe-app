import { Component, Input } from '@angular/core';
import { StatusChange } from '../../../service/loan/loan.types';

@Component({
  selector: 'app-status-tracking',
  templateUrl: './status-tracking.component.html',
  styleUrls: ['./status-tracking.component.scss']
})
export class StatusTrackingComponent {
  @Input() loan: any;
  @Input() statusHistory: StatusChange[] = [];
  @Input() canChangeStatus: boolean = false;
  
  statusOptions = [
    { value: 'PENDING', label: 'Pending', color: '#8f8500' },
    { value: 'APPROVED', label: 'Approved', color: '#b86200' },
    { value: 'REJECTED', label: 'Rejected', color: '#dc3545' },
    { value: 'ACTIVE', label: 'Active', color: '#1e4a8f' },
    { value: 'COMPLETED', label: 'Completed', color: '#1e7e4a' }
  ];

  getStatusColor(status: string): string {
    const statusOption = this.statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.color : '#6c757d';
  }

  getStatusLabel(status: string): string {
    const statusOption = this.statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.label : 'Unknown';
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}