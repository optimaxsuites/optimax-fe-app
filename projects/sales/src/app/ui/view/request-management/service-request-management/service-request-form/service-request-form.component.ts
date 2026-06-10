// src/app/ui/view/service-request-management/service-request-form/service-request-form.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ServiceRequestService } from '../../../../service/procurement-request-management/service-request-management/service-request.service';
import { ServiceType, RateType, DurationUnit, LocationType, ServiceTypeLabels, RateTypeLabels, DurationUnitLabels, LocationTypeLabels, ServiceMilestone } from '../../../../domain/procurement-request/service-requests/service-requests.dto';

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './service-request-form.component.html',
  styleUrls: ['./service-request-form.component.scss']
})
export class ServiceRequestFormComponent implements OnInit, OnDestroy {
  
  serviceForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  isEditMode = false;
  requestId: string = '';
  currentStep = 1;
  readonly totalSteps = 3;
  readonly stepLabels = ['Service Basics', 'Execution Details', 'Review & Submit'];
  
  // Options for dropdowns
  serviceTypes = Object.entries(ServiceTypeLabels).map(([value, label]) => ({ value, label }));
  rateTypes = Object.entries(RateTypeLabels).map(([value, label]) => ({ value, label }));
  durationUnits = Object.entries(DurationUnitLabels).map(([value, label]) => ({ value, label }));
  locationTypes = Object.entries(LocationTypeLabels).map(([value, label]) => ({ value, label }));
  
  // Dynamic fields
  deliverables: string[] = [];
  newDeliverable: string = '';
  requiredSkills: string[] = [];
  newSkill: string = '';
  
  // Milestones (for milestone-based pricing)
  milestones: ServiceMilestone[] = [];
  showMilestoneForm = false;
  editingMilestone: ServiceMilestone | null = null;
  
  // File attachments
  selectedFiles: File[] = [];
  filePreviewUrls: string[] = [];
  
  // Customer info
  customerBudget = 100000;
  customerId = 'CUST-001';
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private serviceRequestService: ServiceRequestService
  ) {
    this.serviceForm = this.fb.group({
      serviceType: ['', Validators.required],
      serviceName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
      scopeOfWork: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]],
      estimatedDuration: [1, [Validators.required, Validators.min(1), Validators.max(365)]],
      durationUnit: ['DAYS', Validators.required],
      rateType: ['FIXED_PRICE', Validators.required],
      rateAmount: ['', [Validators.required, Validators.min(0.01)]],
      estimatedTotal: [{ value: 0, disabled: true }],
      currency: ['NGN', Validators.required],
      requiredStaffCount: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
      locationType: ['REMOTE', Validators.required],
      serviceLocation: [''],
      specialInstructions: ['', Validators.maxLength(1000)],
      startDate: [''],
      completionDate: ['']
    });
  }

  ngOnInit(): void {
    this.requestId = this.route.snapshot.paramMap.get('id') || '';
    this.isEditMode = !!this.requestId;
    
    this.setupFormListeners();
    
    if (this.isEditMode) {
      this.loadServiceRequest();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormListeners(): void {
    // Calculate estimated total when rate amount or duration changes
    this.serviceForm.get('rateType')?.valueChanges.subscribe(() => {
      this.calculateEstimatedTotal();
    });
    
    this.serviceForm.get('rateAmount')?.valueChanges.subscribe(() => {
      this.calculateEstimatedTotal();
    });
    
    this.serviceForm.get('estimatedDuration')?.valueChanges.subscribe(() => {
      this.calculateEstimatedTotal();
    });
    
    // Toggle milestone section based on rate type
    this.serviceForm.get('rateType')?.valueChanges.subscribe(rateType => {
      if (rateType === 'MILESTONE_BASED') {
        if (this.milestones.length === 0) {
          this.addDefaultMilestones();
        }
      }
    });
  }

  private calculateEstimatedTotal(): void {
    const rateType = this.serviceForm.get('rateType')?.value;
    const rateAmount = this.serviceForm.get('rateAmount')?.value || 0;
    const duration = this.serviceForm.get('estimatedDuration')?.value || 1;
    
    let total = 0;
    
    if (rateType === 'FIXED_PRICE') {
      total = rateAmount;
    } else if (rateType === 'HOURLY' || rateType === 'DAILY' || rateType === 'WEEKLY' || rateType === 'MONTHLY') {
      total = rateAmount * duration;
    } else if (rateType === 'MILESTONE_BASED') {
      total = this.milestones.reduce((sum, m) => sum + m.paymentAmount, 0);
    }
    
    this.serviceForm.patchValue({ estimatedTotal: total }, { emitEvent: false });
  }

  private loadServiceRequest(): void {
    this.isLoading = true;
    this.serviceRequestService.getServiceRequestById(this.requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (request) => {
          if (request) {
            this.populateForm(request);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading service request:', error);
          this.isLoading = false;
          alert('Failed to load service request. Please try again.');
          this.router.navigate(['/admin/sales/commerce/service-requests']);
        }
      });
  }

  private populateForm(request: any): void {
    this.serviceForm.patchValue({
      serviceType: request.serviceType,
      serviceName: request.serviceName,
      description: request.description,
      scopeOfWork: request.scopeOfWork,
      estimatedDuration: request.estimatedDuration,
      durationUnit: request.durationUnit,
      rateType: request.rateType,
      rateAmount: request.rateAmount,
      currency: request.currency,
      requiredStaffCount: request.requiredStaffCount,
      locationType: request.locationType,
      serviceLocation: request.serviceLocation,
      specialInstructions: request.specialInstructions,
      startDate: request.startDate ? this.formatDateForInput(request.startDate) : '',
      completionDate: request.completionDate ? this.formatDateForInput(request.completionDate) : ''
    });
    
    this.deliverables = request.deliverables || [];
    this.requiredSkills = request.requiredSkills || [];
    this.milestones = request.milestones || [];
    
    this.calculateEstimatedTotal();
  }

  private formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  // Deliverables Management
  addDeliverable(): void {
    if (this.newDeliverable.trim()) {
      this.deliverables.push(this.newDeliverable.trim());
      this.newDeliverable = '';
    }
  }

  removeDeliverable(index: number): void {
    this.deliverables.splice(index, 1);
  }

  // Skills Management
  addSkill(): void {
    if (this.newSkill.trim()) {
      this.requiredSkills.push(this.newSkill.trim());
      this.newSkill = '';
    }
  }

  removeSkill(index: number): void {
    this.requiredSkills.splice(index, 1);
  }

  // Milestone Management
  private addDefaultMilestones(): void {
    this.milestones = [
      {
        id: this.generateId(),
        name: 'Project Kickoff',
        description: 'Initial meeting and requirements gathering',
        percentageComplete: 0,
        dueDate: new Date(),
        paymentAmount: 0,
        status: 'PENDING'
      },
      {
        id: this.generateId(),
        name: 'First Draft/Deliverable',
        description: 'Initial delivery of first milestone',
        percentageComplete: 0,
        dueDate: new Date(),
        paymentAmount: 0,
        status: 'PENDING'
      },
      {
        id: this.generateId(),
        name: 'Final Delivery',
        description: 'Complete project delivery',
        percentageComplete: 0,
        dueDate: new Date(),
        paymentAmount: 0,
        status: 'PENDING'
      }
    ];
    this.calculateEstimatedTotal();
  }

  addMilestone(): void {
    const newMilestone: ServiceMilestone = {
      id: this.generateId(),
      name: '',
      description: '',
      percentageComplete: 0,
      dueDate: new Date(),
      paymentAmount: 0,
      status: 'PENDING'
    };
    this.milestones.push(newMilestone);
    this.editingMilestone = newMilestone;
    this.showMilestoneForm = true;
  }

  editMilestone(milestone: ServiceMilestone): void {
    this.editingMilestone = { ...milestone };
    this.showMilestoneForm = true;
  }

  saveMilestone(): void {
    if (this.editingMilestone) {
      const index = this.milestones.findIndex(m => m.id === this.editingMilestone!.id);
      if (index !== -1) {
        this.milestones[index] = { ...this.editingMilestone };
      } else {
        this.milestones.push({ ...this.editingMilestone });
      }
      this.cancelMilestoneForm();
      this.calculateEstimatedTotal();
    }
  }

  cancelMilestoneForm(): void {
    this.showMilestoneForm = false;
    this.editingMilestone = null;
  }

  removeMilestone(index: number): void {
    this.milestones.splice(index, 1);
    this.calculateEstimatedTotal();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // File Upload
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      const maxSize = 10 * 1024 * 1024;
      
      for (const file of files) {
        if (file.size > maxSize) {
          alert(`File ${file.name} exceeds 10MB limit`);
          return;
        }
        this.selectedFiles.push(file);
        
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.filePreviewUrls.push(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          this.filePreviewUrls.push('assets/file-icon.png');
        }
      }
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.filePreviewUrls.splice(index, 1);
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps) {
      return;
    }

    if (step > this.currentStep && !this.canProceedToNextStep()) {
      return;
    }

    this.currentStep = step;
  }

  nextStep(): void {
    if (this.currentStep >= this.totalSteps) {
      return;
    }

    if (!this.canProceedToNextStep()) {
      return;
    }

    this.currentStep += 1;
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
    }
  }

  canProceedToNextStep(): boolean {
    if (this.currentStep === 1) {
      const stepOneFields = ['serviceType', 'serviceName', 'description', 'scopeOfWork', 'rateType', 'rateAmount', 'currency'];
      const isValid = this.areControlsValid(stepOneFields);
      if (!isValid) {
        this.markControlsTouched(stepOneFields);
      }
      return isValid;
    }

    if (this.currentStep === 2) {
      const stepTwoFields = ['locationType', 'requiredStaffCount'];
      const isValid = this.areControlsValid(stepTwoFields);
      if (!isValid) {
        this.markControlsTouched(stepTwoFields);
      }
      return isValid;
    }

    return true;
  }

  private areControlsValid(controlNames: string[]): boolean {
    return controlNames.every((controlName) => {
      const control = this.serviceForm.get(controlName);
      return !!control && control.valid;
    });
  }

  private markControlsTouched(controlNames: string[]): void {
    controlNames.forEach((controlName) => {
      const control = this.serviceForm.get(controlName);
      control?.markAsTouched();
      control?.updateValueAndValidity({ onlySelf: true });
    });
  }

  // Form Submission
  onSubmit(): void {
    if (this.serviceForm.invalid) {
      Object.keys(this.serviceForm.controls).forEach(key => {
        const control = this.serviceForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    if (this.serviceForm.get('rateType')?.value === 'MILESTONE_BASED') {
      const totalFromMilestones = this.milestones.reduce((sum, m) => sum + m.paymentAmount, 0);
      if (totalFromMilestones === 0) {
        alert('Please add milestones with payment amounts');
        return;
      }
    }

    this.isSubmitting = true;
    
    const formValue = this.serviceForm.getRawValue();
    const requestData = {
      customerId: this.customerId,
      customerName: 'John Doe Enterprises',
      serviceType: formValue.serviceType,
      serviceName: formValue.serviceName,
      description: formValue.description,
      scopeOfWork: formValue.scopeOfWork,
      deliverables: this.deliverables,
      estimatedDuration: formValue.estimatedDuration,
      durationUnit: formValue.durationUnit,
      rateType: formValue.rateType,
      rateAmount: formValue.rateAmount,
      estimatedTotal: formValue.estimatedTotal,
      currency: formValue.currency,
      requiredSkills: this.requiredSkills,
      requiredStaffCount: formValue.requiredStaffCount,
      locationType: formValue.locationType,
      serviceLocation: formValue.serviceLocation,
      specialInstructions: formValue.specialInstructions,
      startDate: formValue.startDate ? new Date(formValue.startDate) : undefined,
      completionDate: formValue.completionDate ? new Date(formValue.completionDate) : undefined,
      milestones: formValue.rateType === 'MILESTONE_BASED' ? this.milestones : undefined
    };

    let requestObservable;
    
    if (this.isEditMode) {
      requestObservable = this.serviceRequestService.updateServiceRequest(this.requestId, requestData);
    } else {
      requestObservable = this.serviceRequestService.createServiceRequest(requestData);
    }
    
    requestObservable.subscribe({
      next: (response) => {
        this.isSubmitting = false;
        alert(this.isEditMode ? 'Service request updated successfully!' : 'Service request created successfully!');
        if (this.isEditMode) {
          this.router.navigate(['/admin/sales/commerce/service-requests', response.id]);
        } else {
          this.router.navigate(['/admin/sales/commerce/service-requests']);
        }
      },
      error: (error) => {
        console.error('Error saving service request:', error);
        this.isSubmitting = false;
        alert('Failed to save service request. Please try again.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/sales/commerce/service-requests']);
  }

  // Helper methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.serviceForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.serviceForm.get(fieldName);
    if (!field) return '';
    
    if (field.hasError('required')) {
      return 'This field is required';
    }
    if (field.hasError('minlength')) {
      const error = field.errors?.['minlength'];
      return `Minimum ${error.requiredLength} characters required`;
    }
    if (field.hasError('maxlength')) {
      const error = field.errors?.['maxlength'];
      return `Maximum ${error.requiredLength} characters allowed`;
    }
    if (field.hasError('min')) {
      return 'Value must be greater than 0';
    }
    return '';
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getRateTypeIcon(rateType: string): string {
    const icons: Record<string, string> = {
      'FIXED_PRICE': '💰',
      'HOURLY': '⏰',
      'DAILY': '📅',
      'WEEKLY': '📆',
      'MONTHLY': '📊',
      'MILESTONE_BASED': '🎯'
    };
    return icons[rateType] || '💰';
  }

  getRateTypeDescription(rateType: string): string {
    const descriptions: Record<string, string> = {
      'FIXED_PRICE': 'One-time fixed payment for the entire project',
      'HOURLY': 'Pay per hour of work',
      'DAILY': 'Pay per day of work',
      'WEEKLY': 'Pay per week of work',
      'MONTHLY': 'Pay per month of work',
      'MILESTONE_BASED': 'Pay when specific milestones are completed'
    };
    return descriptions[rateType] || '';
  }

  getServiceTypeLabel(value: string): string {
  const types: Record<string, string> = {
    'CONSULTING': 'Consulting',
    'DEVELOPMENT': 'Development',
    'DESIGN': 'Design',
    'MARKETING': 'Marketing',
    'ACCOUNTING': 'Accounting',
    'LEGAL': 'Legal',
    'IT_SUPPORT': 'IT Support',
    'CLEANING': 'Cleaning',
    'MAINTENANCE': 'Maintenance',
    'TRAINING': 'Training',
    'LOGISTICS': 'Logistics',
    'OTHER': 'Other'
  };
  return types[value] || value;
}

getRateTypeLabel(value: string): string {
  const types: Record<string, string> = {
    'FIXED_PRICE': 'Fixed Price',
    'HOURLY': 'Hourly',
    'DAILY': 'Daily',
    'WEEKLY': 'Weekly',
    'MONTHLY': 'Monthly',
    'MILESTONE_BASED': 'Milestone Based'
  };
  return types[value] || value;
}
}