import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  LeaveRequest,
  LeaveSettings,
  LeaveType,
  Employee,
} from '../../../domain/leave.dto';
import { LeaveServiceService } from '../../../service/leave-service.service';

interface NewLeaveTypeForm {
  typeName: string;
  allocatedDays: number;
  isActive: boolean;
}

interface LeaveTypeWithAllocation {
  id: string;
  typeName: string;
  allocatedDays: number;
  isActive: boolean;
}

@Component({
  selector: 'app-leave-policy',
  templateUrl: './leave-policy.component.html',
  styleUrls: ['./leave-policy.component.scss'],
  providers: [MessageService],
})
export class LeavePolicyComponent implements OnInit {
  // Form states
  showAddForm = false;
  editingLeaveId: string | null = null;
  tempEditDays = 0;
// core data
leaveSettings!: LeaveSettings;
  newLeaveType: NewLeaveTypeForm = {
    typeName: '',
    allocatedDays: 0,
    isActive: true,
  };

  // Static data - replace with service later
  // leaveTypesWithAllocation: LeaveTypeWithAllocation[] = [
  //   { id: '1', typeName: 'Annual Leave', allocatedDays: 21, isActive: true },
  //   { id: '2', typeName: 'Sick Leave', allocatedDays: 10, isActive: true },
  //   { id: '3', typeName: 'Maternity Leave', allocatedDays: 90, isActive: true },
  //   { id: '4', typeName: 'Paternity Leave', allocatedDays: 14, isActive: true },
  //   { id: '5', typeName: 'Study Leave', allocatedDays: 5, isActive: false },
  // ];


  constructor(
    private messageService: MessageService,
    private leaveService: LeaveServiceService,
  ) {}

  ngOnInit(): void {
    // Load from service or localStorage later
    this.leaveSettings = this.leaveService.getLeaveSettings();
    // this.loadLeaveTypes();
  }

  // loadLeaveTypes(): void {
  //   const stored = localStorage.getItem('leaveTypesWithAllocation');
  //   if (stored) {
  //     this.leaveTypesWithAllocation = JSON.parse(stored);
  //   }
  // }

  // Persist to localStorage
  persist(): void {
    try {
      // localStorage.setItem(
      //   'leaveTypesWithAllocation',
      //   JSON.stringify(this.leaveTypesWithAllocation)
      // );
      this.leaveService.updateLeaveSettings(this.leaveSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Calculate total days across all active leave types
  get totalAllocatedDays(): number {
    return this.leaveSettings.leaveTypes
      .filter(lt => lt.isActive)
      .reduce((sum, lt) => sum + lt.allocatedDays, 0);
  }

  // Start editing leave days
  startEditLeaveDays(leaveType: LeaveTypeWithAllocation): void {
    this.editingLeaveId = leaveType.id;
    this.tempEditDays = leaveType.allocatedDays;
  }

  // Save edited leave days
  saveLeaveDays(leaveType: LeaveTypeWithAllocation): void {
    if (this.tempEditDays < 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Input',
        detail: 'Days cannot be negative',
      });
      return;
    }

    leaveType.allocatedDays = this.tempEditDays;
    this.editingLeaveId = null;
    this.persist();

    this.messageService.add({
      severity: 'success',
      summary: 'Updated',
      detail: `${leaveType.typeName} updated to ${this.tempEditDays} days`,
    });
  }

  // Cancel editing
  cancelEditLeaveDays(): void {
    this.editingLeaveId = null;
    this.tempEditDays = 0;
  }

  // Add new leave type
  addLeaveType(): void {
    if (!this.newLeaveType.typeName || !this.newLeaveType.typeName.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Input',
        detail: 'Please enter a leave type name',
      });
      return;
    }

    if (this.newLeaveType.allocatedDays < 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Input',
        detail: 'Allocated days cannot be negative',
      });
      return;
    }

    const newType: LeaveTypeWithAllocation = {
      id: Date.now().toString(),
      typeName: this.newLeaveType.typeName.trim(),
      allocatedDays: this.newLeaveType.allocatedDays,
      isActive: this.newLeaveType.isActive,
    };

    this.leaveSettings.leaveTypes.push(newType);
this.leaveService.updateLeaveTypes([...this.leaveSettings.leaveTypes, newType]);
    // Reset form
    this.newLeaveType = { typeName: '', allocatedDays: 0, isActive: true };
    this.showAddForm = false;

    // this.persist();

    this.messageService.add({
      severity: 'success',
      summary: 'Added',
      detail: 'Leave type added successfully',
    });
  }

  // Toggle leave type active status
  toggleLeaveType(leaveType: LeaveTypeWithAllocation): void {
    leaveType.isActive = !leaveType.isActive;
    this.persist();

    this.messageService.add({
      severity: 'info',
      summary: 'Updated',
      detail: `${leaveType.typeName} is now ${leaveType.isActive ? 'active' : 'inactive'}`,
    });
  }

  // Delete leave type
  deleteLeaveType(id: string): void {
    const leaveType = this.leaveSettings.leaveTypes.find((l) => l.id === id);

    if (!confirm(`Are you sure you want to delete "${leaveType?.typeName}"?`)) {
      return;
    }

    this.leaveSettings.leaveTypes = this.leaveSettings.leaveTypes.filter(
      (l) => l.id !== id
    );

    this.persist();

    this.messageService.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Leave type deleted successfully',
    });
  }

  // Toggle automatic approval
  toggleAutomaticApproval(): void {
    this.leaveSettings.automaticApproval = !this.leaveSettings.automaticApproval;
    localStorage.setItem('automaticApproval', JSON.stringify(this.leaveSettings.automaticApproval));

    this.messageService.add({
      severity: 'info',
      summary: 'Updated',
      detail: `Automatic approval is now ${this.leaveSettings.automaticApproval ? 'enabled' : 'disabled'}`,
    });
  }

  // Reset all employees' leave
  resetAllLeave(): void {
    const year = new Date().getFullYear();

    if (
      !confirm(
        `Reset ALL employees' leave balances for ${year}?`
      )
    ) {
      return;
    }

    // Here you would call your API to reset all employees
    // For now, just show success message
    this.messageService.add({
      severity: 'success',
      summary: 'Reset Complete',
      detail: `All employees' leave balances have been reset!`,
    });
  }
}