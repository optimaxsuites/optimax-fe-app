import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError, tap, switchMap, map } from 'rxjs/operators';
import { LeaveApiService } from '../../../service/leave-api.service';

@Component({
  selector: 'app-leave-policy',
  templateUrl: './leave-policy.component.html',
  styleUrls: ['./leave-policy.component.scss'],
  providers: [MessageService],
})
export class LeavePolicyComponent implements OnInit {
  // UI States
  showAddLeaveTypeForm = false;
  showAllocationMatrix = false;
  showPlanningPolicyModal = false;
  isLoading = false;
  isCreatingLeaveType = false;
  isSavingAllocationMatrix = false; // NEW

  // API Data (all from backend)
  levels: any[] = [];
  leaveTypes: any[] = [];
  allocations: any[] = [];
  employees: any[] = [];
  leaveBalances: any[] = [];
  policy: any = null;

  // Allocation matrix for editing
  allocationMatrix: Map<string, number> = new Map();

  // Track original allocations to detect changes - NEW
  originalAllocationMatrix: Map<string, number> = new Map();

  // Form Models
  newLeaveType = {
    name: '',
    defaultDays: 21,
    code: '',
    description: '',
  };

  editingLeaveTypeId: number | null = null;
  tempEditLeaveType: any = null;

  constructor(
    private messageService: MessageService,
    private apiService: LeaveApiService,
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  // ==================== DATA LOADING ====================

  loadAllData(): void {
    this.isLoading = true;

    forkJoin({
      levels: this.apiService.getLevels().pipe(catchError(() => of([]))),
      leaveTypes: this.apiService
        .getLeaveTypes()
        .pipe(catchError(() => of([]))),
      allocations: this.apiService
        .getLeaveAllocations()
        .pipe(catchError(() => of([]))),
      employees: this.apiService.getEmployees().pipe(catchError(() => of([]))),
      leaveBalances: this.apiService
        .getLeaveBalances()
        .pipe(catchError(() => of([]))),
      policies: this.apiService
        .getLeavePlanPolicies(1, 1)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: (data) => {
        this.levels = data.levels || [];
        this.leaveTypes = data.leaveTypes || [];
        this.allocations = data.allocations || [];
        this.employees = data.employees || [];
        this.leaveBalances = data.leaveBalances || [];
        this.policy =
          data.policies && data.policies.length > 0
            ? data.policies[0]
            : this.createDefaultPolicy();

        this.buildAllocationMatrix();
        this.buildOriginalAllocationMatrix(); // NEW - Track original values
        this.isLoading = false;

        console.log('✅ Data loaded:', {
          levels: this.levels.length,
          leaveTypes: this.leaveTypes.length,
          allocations: this.allocations.length,
          employees: this.employees.length,
          leaveBalances: this.leaveBalances.length,
          policy: this.policy,
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Failed to load data:', err);
        this.showError('Failed to load leave settings');
      },
    });
  }

  createDefaultPolicy(): any {
    return {
      maxDaysPerMonth: 10,
      maxMonthPerYear: 3,
    };
  }

  buildAllocationMatrix(): void {
    this.allocationMatrix.clear();
    this.allocations.forEach((allocation) => {
      const key = `${allocation.levelId}-${allocation.leaveTypeId}`;
      this.allocationMatrix.set(key, allocation.allocatedDays);
    });
  }

  // NEW - Track original allocations
  buildOriginalAllocationMatrix(): void {
    this.originalAllocationMatrix.clear();
    this.allocations.forEach((allocation) => {
      const key = `${allocation.levelId}-${allocation.leaveTypeId}`;
      this.originalAllocationMatrix.set(key, allocation.allocatedDays);
    });
  }

  // ==================== LEAVE TYPE CRUD ====================

  addLeaveType(): void {
    // Validation
    if (!this.newLeaveType.name?.trim()) {
      this.showWarning('Please enter a leave type name');
      return;
    }

    if (!this.newLeaveType.code?.trim()) {
      this.showWarning('Please enter a leave type code');
      return;
    }

    if (this.newLeaveType.defaultDays < 0) {
      this.showWarning('Default days cannot be negative');
      return;
    }

    this.isCreatingLeaveType = true;

    // STEP 1: Create Leave Type
    this.apiService
      .createLeaveType(this.newLeaveType)
      .pipe(
        tap((created) =>
          console.log('✅ Step 1: Created leave type:', created),
        ),

        // STEP 2: Create Allocations for All Levels
        switchMap((createdLeaveType) => {
          const allocationRequests: any[] = this.levels.map((level) =>
            this.apiService
              .createLeaveAllocation({
                levelId: level.id,
                leaveTypeId: createdLeaveType.id,
                allocatedDays: this.newLeaveType.defaultDays,
              })
              .pipe(
                tap(() =>
                  console.log(
                    `✅ Step 2: Created allocation for Level ${level.id}`,
                  ),
                ),
                catchError((err) => {
                  console.error(
                    `❌ Failed allocation for Level ${level.id}:`,
                    err,
                  );
                  return of(null);
                }),
              ),
          );

          return forkJoin(
            allocationRequests.length > 0 ? allocationRequests : [of(null)],
          ).pipe(map(() => createdLeaveType));
        }),

        // STEP 3: Create Employee Leave Balances
        switchMap((createdLeaveType) => {
          console.log('✅ Step 3: Creating employee balances...');

          const balanceRequests: any[] = this.employees.map((employee) => {
            // Check if balance already exists
            const existingBalance = this.leaveBalances.find(
              (lb) =>
                lb.employeeId === String(employee.id) &&
                lb.leaveTypeId === createdLeaveType.id,
            );

            if (existingBalance) {
              console.log(
                `⚠️ Balance already exists for Employee ${employee.id}, skipping...`,
              );
              return of(null);
            }

            // Get employee's level
            const employeeLevelId = employee.level?.id;

            if (!employeeLevelId) {
              console.warn(
                `⚠️ Employee ${employee.id} has no level assigned, skipping...`,
              );
              return of(null);
            }

            // Find allocation for this level and leave type
            const allocation = this.allocations.find(
              (a) =>
                a.levelId === employeeLevelId &&
                a.leaveTypeId === createdLeaveType.id,
            );

            const allocatedDays = allocation
              ? allocation.allocatedDays
              : this.newLeaveType.defaultDays;

            // Create leave balance
            return this.apiService
              .createLeaveBalance({
                employeeId: employee.id,
                leaveTypeId: createdLeaveType.id,
                balance: allocatedDays,
                usedDays: 0,
              })
              .pipe(
                tap(() =>
                  console.log(`✅ Created balance for Employee ${employee.id}`),
                ),
                catchError((err) => {
                  console.error(
                    `❌ Failed to create balance for Employee ${employee.id}:`,
                    err,
                  );
                  return of(null);
                }),
              );
          });

          return forkJoin(
            balanceRequests.length > 0 ? balanceRequests : [of(null)],
          ).pipe(map(() => createdLeaveType));
        }),
      )
      .subscribe({
        next: (createdLeaveType) => {
          this.isCreatingLeaveType = false;
          console.log('🎉 All steps completed successfully!');

          this.showSuccess(
            `Leave type "${createdLeaveType.name}" created successfully! ` +
              `Allocations and employee balances have been set up automatically.`,
          );

          this.resetLeaveTypeForm();
          this.loadAllData();
        },
        error: (err) => {
          this.isCreatingLeaveType = false;
          console.error('❌ Failed to complete leave type creation:', err);
          this.showError('Failed to create leave type');
        },
      });
  }

  startEditLeaveType(leaveType: any): void {
    this.editingLeaveTypeId = leaveType.id;
    this.tempEditLeaveType = { ...leaveType };
  }

  saveLeaveType(): void {
    if (!this.tempEditLeaveType || !this.editingLeaveTypeId) return;

    if (!this.tempEditLeaveType.name?.trim()) {
      this.showWarning('Leave type name is required');
      return;
    }

    if (this.tempEditLeaveType.defaultDays < 0) {
      this.showWarning('Default days cannot be negative');
      return;
    }

    const payload = {
      id: this.editingLeaveTypeId,
      name: this.tempEditLeaveType.name,
      defaultDays: this.tempEditLeaveType.defaultDays,
      code: this.tempEditLeaveType.code,
      description: this.tempEditLeaveType.description,
      payStatus: this.tempEditLeaveType.payStatus || 'PAID',
      effectiveAfter: this.tempEditLeaveType.effectiveAfter || 0,
      allowedInProbation:
        this.tempEditLeaveType.allowedInProbation !== undefined
          ? this.tempEditLeaveType.allowedInProbation
          : true,
      allowedInNoticePeriod:
        this.tempEditLeaveType.allowedInNoticePeriod !== undefined
          ? this.tempEditLeaveType.allowedInNoticePeriod
          : true,
    };

    this.apiService
      .updateLeaveType(this.editingLeaveTypeId, payload)
      .subscribe({
        next: () => {
          this.showSuccess('Leave type updated successfully');
          this.cancelEditLeaveType();
          this.loadAllData();
        },
        error: (err) => {
          console.error('❌ Failed to update:', err);
          this.showError('Failed to update leave type');
        },
      });
  }

  cancelEditLeaveType(): void {
    this.editingLeaveTypeId = null;
    this.tempEditLeaveType = null;
  }

  deleteLeaveType(leaveType: any): void {
    const confirmMessage =
      `Delete "${leaveType.name}"?\n\n` +
      `This will permanently delete:\n` +
      `• All allocations for this leave type\n` +
      `• All employee balances for this leave type\n\n` +
      `This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.isLoading = true;

    const allocationsToDelete = this.allocations.filter(
      (a) => a.leaveTypeId === leaveType.id,
    );
    const balancesToDelete = this.leaveBalances.filter(
      (lb) => lb.leaveTypeId === leaveType.id,
    );

    const balanceDeletions: any[] = balancesToDelete.map((balance) =>
      this.apiService.deleteLeaveBalance(balance.id).pipe(
        tap(() => console.log(`✅ Deleted balance ${balance.id}`)),
        catchError(() => of(null)),
      ),
    );

    const allocationDeletions: any[] = allocationsToDelete.map((allocation) =>
      this.apiService.deleteLeaveAllocation(allocation.id).pipe(
        tap(() => console.log(`✅ Deleted allocation ${allocation.id}`)),
        catchError(() => of(null)),
      ),
    );

    const allDeletions: any[] = [...balanceDeletions, ...allocationDeletions];

    if (allDeletions.length > 0) {
      forkJoin(allDeletions)
        .pipe(
          switchMap(() => {
            console.log('✅ Deleted all children, now deleting leave type...');
            return this.apiService.deleteLeaveType(leaveType.id);
          }),
        )
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.showSuccess(
              `Leave type "${leaveType.name}" and all related records deleted successfully`,
            );
            this.loadAllData();
          },
          error: (err) => {
            this.isLoading = false;
            console.error('❌ Failed to delete:', err);
            this.showError('Failed to delete leave type');
          },
        });
    } else {
      this.apiService.deleteLeaveType(leaveType.id).subscribe({
        next: () => {
          this.isLoading = false;
          this.showSuccess(
            `Leave type "${leaveType.name}" deleted successfully`,
          );
          this.loadAllData();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('❌ Failed to delete:', err);
          this.showError('Failed to delete leave type');
        },
      });
    }
  }

  resetLeaveTypeForm(): void {
    this.newLeaveType = {
      name: '',
      defaultDays: 21,
      code: '',
      description: '',
    };
    this.showAddLeaveTypeForm = false;
  }

  // ==================== ALLOCATION MATRIX ====================

  openAllocationMatrix(): void {
    this.showAllocationMatrix = true;
  }

  closeAllocationMatrix(): void {
    this.showAllocationMatrix = false;
    // Reload to reset any unsaved changes
    this.loadAllData();
  }

  getAllocationForCell(levelId: number, leaveTypeId: number): number {
    const key = `${levelId}-${leaveTypeId}`;
    return this.allocationMatrix.get(key) || 0;
  }

  updateAllocationInMatrix(
    levelId: number,
    leaveTypeId: number,
    event: any,
  ): void {
    const days = parseInt(event.target.value) || 0;

    if (days < 0) {
      this.showWarning('Allocated days cannot be negative');
      return;
    }

    const key = `${levelId}-${leaveTypeId}`;
    this.allocationMatrix.set(key, days);
  }

  // ==================== SAVE ALLOCATION MATRIX (WITH EMPLOYEE BALANCE UPDATE) ====================

  saveAllocationMatrix(): void {
  this.isSavingAllocationMatrix = true;

  console.log('🚀 Starting allocation matrix save...');

  // Step 1: Update the allocations
  const allocationRequests: any[] = [];

  this.allocationMatrix.forEach((days, key) => {
    const [levelId, leaveTypeId] = key.split('-').map(Number);
    const existing = this.allocations.find(
      (a) => a.levelId === levelId && a.leaveTypeId === leaveTypeId,
    );

    if (existing) {
      allocationRequests.push(
        this.apiService.updateLeaveAllocation(existing.id, {
          id: existing.id,
          allocatedDays: days,
          levelId: levelId,
          leaveTypeId: leaveTypeId,
        }).pipe(
          tap(() => console.log(`✅ Updated allocation ${existing.id} to ${days} days`)),
          catchError((err) => {
            console.error('❌ Allocation update failed:', err);
            return of(null);
          })
        )
      );
    } else {
      allocationRequests.push(
        this.apiService.createLeaveAllocation({
          allocatedDays: days,
          levelId: levelId,
          leaveTypeId: leaveTypeId,
        }).pipe(
          tap(() => console.log(`✅ Created allocation: Level ${levelId}, Type ${leaveTypeId}`)),
          catchError((err) => {
            console.error('❌ Allocation creation failed:', err);
            return of(null);
          })
        )
      );
    }
  });

  if (allocationRequests.length === 0) {
    this.isSavingAllocationMatrix = false;
    this.closeAllocationMatrix();
    return;
  }

  // Step 2: Save allocations, then update employee balances
  forkJoin(allocationRequests).subscribe({
    next: () => {
      console.log('✅ All allocations saved! Now updating employee balances...');

      const balanceUpdateRequests: any[] = [];

      this.leaveBalances.forEach((balance) => {
        // FIX: Use balance.employee (numeric ID) instead of balance.employeeId (null)
        const employeeId = balance.employee;

        if (!employeeId) {
          console.warn(`⚠️ Balance ${balance.id} has no employee ID, skipping`);
          return;
        }

        // Find this employee using the numeric ID
        const employee = this.employees.find(emp => emp.id === employeeId);
        
        if (!employee) {
          console.warn(`⚠️ No employee found with ID ${employeeId}`);
          return;
        }

        if (!employee.level) {
          console.warn(`⚠️ Employee ${employee.id} has no level assigned`);
          return;
        }

        // Find the NEW allocation for this employee's level and leave type
        const key = `${employee.level.id}-${balance.leaveTypeId}`;
        const newAllocation = this.allocationMatrix.get(key);

        if (newAllocation === undefined) {
          console.warn(`⚠️ No allocation found for Level ${employee.level.id}, Leave Type ${balance.leaveTypeId}`);
          return;
        }

        // Calculate new balance
        let newBalance: number;

        if (newAllocation > balance.usedDays) {
          newBalance = newAllocation - balance.usedDays;
        } else {
          newBalance = 0;
        }

        console.log(
          `🔄 Employee ${employee.id}: ` +
          `allocation=${newAllocation}, usedDays=${balance.usedDays}, ` +
          `oldBalance=${balance.balance}, newBalance=${newBalance}`
        );

        // FIX: Use balance.employee for employeeId (even though API stores it in employeeId as string)
        const updatePayload = {
          id: balance.id,
          employeeId: String(employeeId), // Convert to string for API
          employee: employeeId,            // Keep numeric ID
          leaveTypeId: balance.leaveTypeId,
          balance: newBalance,
          usedDays: balance.usedDays
        };

        balanceUpdateRequests.push(
          this.apiService.updateLeaveBalance(balance.id, updatePayload).pipe(
            tap(() => console.log(`✅ Updated Employee ${employee.id}: balance ${balance.balance} → ${newBalance}`)),
            catchError((err) => {
              console.error(`❌ Failed to update Employee ${employee.id}:`, err);
              return of(null);
            })
          )
        );
      });

      console.log(`📝 Prepared ${balanceUpdateRequests.length} balance updates`);

      if (balanceUpdateRequests.length > 0) {
        forkJoin(balanceUpdateRequests).subscribe({
          next: () => {
            console.log('🎉 ALL BALANCES UPDATED!');
            this.isSavingAllocationMatrix = false;
            this.showSuccess('Allocation matrix and employee balances updated successfully!');
            this.loadAllData();
            this.closeAllocationMatrix();
          },
          error: (err) => {
            console.error('❌ Balance update failed:', err);
            this.isSavingAllocationMatrix = false;
            this.showError('Failed to update employee balances');
          }
        });
      } else {
        console.log('⚠️ No balance updates prepared');
        this.isSavingAllocationMatrix = false;
        this.showSuccess('Allocation matrix saved!');
        this.loadAllData();
        this.closeAllocationMatrix();
      }
    },
    error: (err) => {
      console.error('❌ Allocation save failed:', err);
      this.isSavingAllocationMatrix = false;
      this.showError('Failed to save allocations');
    }
  });
}

  getTotalForLevel(levelId: number): number {
    let total = 0;
    this.leaveTypes.forEach((leaveType) => {
      const key = `${levelId}-${leaveType.id}`;
      total += this.allocationMatrix.get(key) || 0;
    });
    return total;
  }

  // ==================== PLANNING POLICY ====================

  openPlanningPolicy(): void {
    this.showPlanningPolicyModal = true;
  }

  closePlanningPolicy(): void {
    this.showPlanningPolicyModal = false;
  }

  savePlanningPolicy(): void {
    if (!this.policy) return;

    const payload = {
      maxDaysPerMonth: this.policy.maxDaysPerMonth,
      maxMonthPerYear: this.policy.maxMonthPerYear,
    };

    if (this.policy.id) {
      const updatePayload = {
        id: this.policy.id,
        ...payload,
      };

      this.apiService
        .updateLeavePlanPolicy(this.policy.id, updatePayload)
        .subscribe({
          next: () => {
            this.showSuccess('Planning policy updated');
            this.closePlanningPolicy();
            this.loadAllData();
          },
          error: (err) => {
            console.error('❌ Failed to update policy:', err);
            this.showError('Failed to update planning policy');
          },
        });
    } else {
      this.apiService.createLeavePlanPolicy(payload).subscribe({
        next: () => {
          this.showSuccess('Planning policy created');
          this.closePlanningPolicy();
          this.loadAllData();
        },
        error: (err) => {
          console.error('❌ Failed to create policy:', err);
          this.showError('Failed to create planning policy');
        },
      });
    }
  }

  // ==================== COMPUTED PROPERTIES ====================

  get totalAllocatedDays(): number {
    if (this.levels.length === 0) return 0;
    return this.getTotalForLevel(this.levels[0]?.id);
  }

  // ==================== HELPERS ====================

  showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 5000,
    });
  }

  showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000,
    });
  }

  showWarning(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Warning',
      detail: message,
      life: 3000,
    });
  }
}
