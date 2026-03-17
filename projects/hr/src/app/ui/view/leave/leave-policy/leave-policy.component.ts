import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  LeaveSettings,
  EmployeeLevel,
  LeaveAllocationMatrix,
  LeavePlanningPolicy,
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
  showLevelManagement = false;
  showAllocationMatrix = false;
  showPlanningPolicyModal = false; // NEW
  editingLeaveId: string | null = null;
  tempEditDays = 0;

  // Core data
  leaveSettings!: LeaveSettings;
  employeeLevels: EmployeeLevel[] = [];
  allocationMatrix: LeaveAllocationMatrix | null = null;
  planningPolicy!: LeavePlanningPolicy; // NEW

  // New level form
  newLevel = {
    name: '',
    description: '',
    order: 0,
  };

  newLeaveType: NewLeaveTypeForm = {
    typeName: '',
    allocatedDays: 0,
    isActive: true,
  };

  constructor(
    private messageService: MessageService,
    private leaveService: LeaveServiceService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.leaveSettings = this.leaveService.getLeaveSettings();
    this.employeeLevels = this.leaveService.getEmployeeLevels();
    this.allocationMatrix = this.leaveService.getLeaveAllocationMatrix();
    this.planningPolicy = this.leaveService.getLeavePlanningPolicy(); // NEW
  }

  persist(): void {
    try {
      this.leaveService.updateLeaveSettings(this.leaveSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  get totalAllocatedDays(): number {
    return this.leaveSettings.leaveTypes
      .filter((lt) => lt.isActive)
      .reduce((sum, lt) => sum + lt.allocatedDays, 0);
  }

  // ==================== LEAVE TYPE MANAGEMENT ====================

  startEditLeaveDays(leaveType: LeaveTypeWithAllocation): void {
    this.editingLeaveId = leaveType.id;
    this.tempEditDays = leaveType.allocatedDays;
  }

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

  cancelEditLeaveDays(): void {
    this.editingLeaveId = null;
    this.tempEditDays = 0;
  }

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
    this.leaveService.updateLeaveTypes(this.leaveSettings.leaveTypes);

    if (this.leaveSettings.useLevelBasedAllocation) {
      this.employeeLevels.forEach((level) => {
        this.leaveService.updateSingleAllocation(level.id, newType.id, 0);
      });
      this.loadData();
    }

    this.newLeaveType = { typeName: '', allocatedDays: 0, isActive: true };
    this.showAddForm = false;

    this.messageService.add({
      severity: 'success',
      summary: 'Added',
      detail: 'Leave type added successfully',
    });
  }

  toggleLeaveType(leaveType: LeaveTypeWithAllocation): void {
    leaveType.isActive = !leaveType.isActive;
    this.persist();

    this.messageService.add({
      severity: 'info',
      summary: 'Updated',
      detail: `${leaveType.typeName} is now ${leaveType.isActive ? 'active' : 'inactive'}`,
    });
  }

  deleteLeaveType(id: string): void {
    const leaveType = this.leaveSettings.leaveTypes.find((l) => l.id === id);

    // if (!confirm(`Are you sure you want to delete "${leaveType?.typeName}"?`)) {
    //   return;
    // }

    this.leaveSettings.leaveTypes = this.leaveSettings.leaveTypes.filter(
      (l) => l.id !== id,
    );

    this.persist();

    this.messageService.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Leave type deleted successfully',
    });
  }

  // ==================== SETTINGS TOGGLES ====================

  toggleAutomaticApproval(): void {
    this.leaveSettings.automaticApproval =
      !this.leaveSettings.automaticApproval;
    localStorage.setItem(
      'automaticApproval',
      JSON.stringify(this.leaveSettings.automaticApproval),
    );

    this.messageService.add({
      severity: 'info',
      summary: 'Updated',
      detail: `Automatic approval is now ${this.leaveSettings.automaticApproval ? 'enabled' : 'disabled'}`,
    });
  }

  toggleLevelBasedAllocation(): void {
    this.leaveSettings.useLevelBasedAllocation =
      !this.leaveSettings.useLevelBasedAllocation;
    this.leaveService.updateLeaveSettings(this.leaveSettings);

    if (this.leaveSettings.useLevelBasedAllocation) {
      this.allocationMatrix = this.leaveService.getLeaveAllocationMatrix();
      this.leaveService.syncAllEmployeesWithMatrix();
    }

    this.messageService.add({
      severity: 'info',
      summary: 'Updated',
      detail: `Level-based allocation is now ${this.leaveSettings.useLevelBasedAllocation ? 'enabled' : 'disabled'}`,
    });
  }

  resetAllLeave(): void {
    const year = new Date().getFullYear();

    // if (!confirm(`Reset ALL employees' leave balances for ${year}?`)) {
    //   return;
    // }

    this.messageService.add({
      severity: 'success',
      summary: 'Reset Complete',
      detail: `All employees' leave balances have been reset!`,
    });
  }

  // ==================== LEVEL MANAGEMENT ====================

  openLevelManagement(): void {
    this.showLevelManagement = true;
  }

  closeLevelManagement(): void {
    this.showLevelManagement = false;
  }

  // ==================== ALLOCATION MATRIX ====================

  openAllocationMatrix(): void {
    this.loadData();
    this.showAllocationMatrix = true;
  }

  closeAllocationMatrix(): void {
    this.showAllocationMatrix = false;
  }

  getAllocationForCell(levelId: string, leaveTypeId: string): number {
    return this.leaveService.getAllocationForLevel(levelId, leaveTypeId);
  }

  updateAllocation(levelId: string, leaveTypeId: string, event: any): void {
    const days = parseInt(event.target.value) || 0;

    if (days < 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Input',
        detail: 'Days cannot be negative',
      });
      return;
    }

    this.leaveService.updateSingleAllocation(levelId, leaveTypeId, days);
    this.loadData();
  }

  saveAllocationMatrix(): void {
    this.leaveService.syncAllEmployeesWithMatrix();

    this.messageService.add({
      severity: 'success',
      summary: 'Matrix Saved',
      detail: 'Allocation matrix saved and employees updated',
    });

    this.closeAllocationMatrix();
  }

  getTotalForLevel(levelId: string): number {
    if (!this.allocationMatrix) return 0;

    return this.allocationMatrix.allocations
      .filter((a) => a.levelId === levelId)
      .reduce((sum, a) => sum + a.allocatedDays, 0);
  }

  // ==================== PLANNING POLICY (NEW) ====================

  openPlanningPolicy(): void {
    this.showPlanningPolicyModal = true;
  }

  closePlanningPolicy(): void {
    this.showPlanningPolicyModal = false;
  }

  savePlanningPolicy(): void {
    // Validate
    const calculatedTotal =
      this.planningPolicy.maxDaysPerMonth *
      this.planningPolicy.maxPlanningMonths;

    if (calculatedTotal !== this.planningPolicy.totalAllowedPlannedDays) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Warning',
        detail: `Total days (${this.planningPolicy.totalAllowedPlannedDays}) should equal max days per month (${this.planningPolicy.maxDaysPerMonth}) × months (${this.planningPolicy.maxPlanningMonths}) = ${calculatedTotal}`,
        key: 'tl',
        life: 5000,
      });
    }

    this.leaveService.updateLeavePlanningPolicy(this.planningPolicy);

    this.messageService.add({
      severity: 'success',
      summary: 'Policy Saved',
      detail: 'Leave planning policy updated successfully',
    });

    this.closePlanningPolicy();
  }
}