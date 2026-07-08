import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrossBranchAttendanceService } from '../../../../service/attendance/cross-branch-attendance.service';
import { BranchService } from '../../../../service/branch/branch.service';
import { BranchDTO } from '../../../../domain/branch/branch.dto';
import { CrossBranchCheckInRequest } from '../../../../domain/attendance/cross-branch-request.dto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type RequestStep = 'select-branch' | 'approval-type' | 'reason' | 'review' | 'submitted';

@Component({
  selector: 'app-cross-branch-request',
  templateUrl: './cross-branch-request.component.html',
  styleUrl: './cross-branch-request.component.scss'
})
export class CrossBranchRequestComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private crossBranchService = inject(CrossBranchAttendanceService);
  private branchService = inject(BranchService);
  private destroy$ = new Subject<void>();

  currentStep: RequestStep = 'select-branch';
  allBranches: BranchDTO[] = [];
  homeBranch: BranchDTO | null = null;
  selectedBranch: BranchDTO | null = null;
  distanceToBranch: number = 0;
  approvalType: 'PRE_APPROVAL' | 'RETROSPECTIVE' = 'PRE_APPROVAL';
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  submittedRequest: CrossBranchCheckInRequest | null = null;

  requestForm!: FormGroup;
  employeeId: number = 1; // Should come from session
  supervisorId: number = 1; // Should come from employee data

  ngOnInit(): void {
    this.requestForm = this.fb.group({
      selectedBranch: ['', Validators.required],
      approvalType: ['PRE_APPROVAL', Validators.required],
      reason: ['', Validators.required],
      acknowledgment: [false, Validators.requiredTrue]
    });

    this.loadBranches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBranches(): void {
    this.branchService.getAllBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branches) => {
          this.allBranches = branches;
          this.loadEmployeeBranch();
        },
        error: (err) => {
          this.errorMessage = 'Failed to load branches';
          console.error(err);
        }
      });
  }

  loadEmployeeBranch(): void {
    this.branchService.getEmployeePrimaryBranch(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branch) => {
          this.homeBranch = branch;
        },
        error: (err) => {
          console.error('Failed to load primary branch:', err);
        }
      });
  }

  selectBranch(branch: BranchDTO): void {
    if (branch.id === this.homeBranch?.id) {
      this.errorMessage = 'This is your home branch. No cross-branch request needed.';
      return;
    }

    this.selectedBranch = branch;
    this.requestForm.patchValue({ selectedBranch: branch.id });
    this.errorMessage = '';

    // Calculate distance if current location available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.branchService.calculateDistanceToBranch(
          position.coords.latitude,
          position.coords.longitude,
          branch.id
        ).pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (distance) => {
              this.distanceToBranch = distance;
            }
          });
      });
    }

    this.currentStep = 'approval-type';
  }

  selectApprovalType(type: 'PRE_APPROVAL' | 'RETROSPECTIVE'): void {
    this.approvalType = type;
    this.requestForm.patchValue({ approvalType: type });
    this.currentStep = 'reason';
  }

  goToReview(): void {
    if (!this.requestForm.get('reason')?.value) {
      this.errorMessage = 'Please provide a reason for your request';
      return;
    }
    this.currentStep = 'review';
  }

  submitRequest(): void {
    if (!this.selectedBranch || !this.homeBranch) {
      this.errorMessage = 'Branch selection is required';
      return;
    }

    if (!this.requestForm.valid) {
      this.errorMessage = 'Please complete all required fields';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.crossBranchService.requestCrossBranchCheckIn(
      this.employeeId,
      this.selectedBranch.id,
      this.homeBranch.id,
      this.approvalType,
      this.supervisorId
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (request) => {
          this.isSubmitting = false;
          this.submittedRequest = request;
          this.successMessage = `Cross-branch request submitted successfully! (ID: ${request.id})`;
          this.currentStep = 'submitted';
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = 'Failed to submit request. Please try again.';
          console.error(err);
        }
      });
  }

  goBack(): void {
    if (this.currentStep === 'select-branch') return;

    const steps: RequestStep[] = ['select-branch', 'approval-type', 'reason', 'review', 'submitted'];
    const currentIndex = steps.indexOf(this.currentStep);
    if (currentIndex > 0) {
      this.currentStep = steps[currentIndex - 1];
      this.errorMessage = '';
    }
  }

  reset(): void {
    this.currentStep = 'select-branch';
    this.selectedBranch = null;
    this.approvalType = 'PRE_APPROVAL';
    this.requestForm.reset({ approvalType: 'PRE_APPROVAL' });
    this.errorMessage = '';
    this.successMessage = '';
    this.submittedRequest = null;
    this.distanceToBranch = 0;
  }

  getOtherBranches(): BranchDTO[] {
    return this.allBranches.filter(b => b.id !== this.homeBranch?.id);
  }

  isApprovalRequired(): boolean {
    return this.crossBranchService.isApprovalRequired(this.homeBranch?.id || 0, this.selectedBranch?.id || 0);
  }

  getApprovalTypeDescription(type: 'PRE_APPROVAL' | 'RETROSPECTIVE'): string {
    if (type === 'PRE_APPROVAL') {
      return 'Ask for approval before checking in at the other branch';
    }
    return 'Notify supervisor after checking in (for retrospective approval)';
  }

  getDistanceLabel(): string {
    if (this.distanceToBranch === 0) return 'Distance unknown';
    const km = (this.distanceToBranch / 1000).toFixed(1);
    return `${km} km away`;
  }
}
