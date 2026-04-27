import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Message } from 'primeng/api';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CooperativeLoanPurposeService } from '../../../service/loan/cooperative-loan/cooperative-loan-purpose.service';
import { CreatePurposePayload, LoanPurposeData } from '../../../service/loan/loan-purpose.service';

@Component({
  selector: 'app-cooperative-loan-purpose-management',
  templateUrl: './cooperative-loan-purpose-management.component.html',
  styleUrls: ['./cooperative-loan-purpose-management.component.scss']
})
export class CooperativeLoanPurposeManagementComponent implements OnInit, OnDestroy {
  purposes: LoanPurposeData[] = [];
  filteredPurposes: LoanPurposeData[] = [];
  isLoading = false;
  showPurposeModal = false;
  isEditing = false;
  selectedPurpose: LoanPurposeData | null = null;
  purposeForm!: FormGroup;
  messages: Message[] = [];
  searchTerm = ''; 
  currentUuid = '';
  
  showDeleteModal = false;
  purposeToDelete: LoanPurposeData | null = null;
  isDeleting = false;

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private cooperativeLoanPurposeService: CooperativeLoanPurposeService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.purposeForm = this.createPurposeForm();
  }

  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.loadPurposes();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  createPurposeForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern('^[A-Z0-9-]+$')]],
      description: ['', Validators.maxLength(500)],
      isActive: [true],
      maxLoanAmount: [null, [Validators.min(0)]],
      minLoanAmount: [null, [Validators.min(0)]],
      defaultInterestRate: [null, [Validators.min(0), Validators.max(100)]],
      requiresDocumentation: [false],
      documentationTypes: this.fb.array([])
    });
  }

  get documentationTypes(): FormArray {
    return this.purposeForm.get('documentationTypes') as FormArray;
  }

  getDocControl(index: number): FormControl {
    return this.documentationTypes.at(index) as FormControl;
  }

  getDocIndices(): number[] {
    return Array(this.documentationTypes.length).fill(0).map((_, index) => index);
  }

  addDocumentationType(): void {
    this.documentationTypes.push(this.fb.control('', Validators.required));
  }

  removeDocumentationType(index: number): void {
    this.documentationTypes.removeAt(index);
  }

  get totalPurposesCount(): number {
    return this.purposes.length;
  }

  get activePurposesCount(): number {
    return this.purposes.filter(purpose => purpose.isActive).length;
  }

  get inactivePurposesCount(): number {
    return this.purposes.filter(purpose => !purpose.isActive).length;
  }

  get nameControl(): AbstractControl | null { return this.purposeForm.get('name'); }
  get codeControl(): AbstractControl | null { return this.purposeForm.get('code'); }
  get minLoanAmountControl(): AbstractControl | null { return this.purposeForm.get('minLoanAmount'); }
  get maxLoanAmountControl(): AbstractControl | null { return this.purposeForm.get('maxLoanAmount'); }
  get defaultInterestRateControl(): AbstractControl | null { return this.purposeForm.get('defaultInterestRate'); }
  get requiresDocumentationControl(): AbstractControl | null { return this.purposeForm.get('requiresDocumentation'); }

  getDescriptionDisplay(description: string | undefined): string {
    if (!description) {
      return '—';
    }
    if (description.length > 60) {
      return `${description.substring(0, 60)}...`;
    }
    return description;
  }

  getAmountDisplay(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || amount === 0) {
      return '—';
    }
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  getInterestRateDisplay(rate: number | null | undefined): string {
    if (rate === null || rate === undefined || rate === 0) {
      return '—';
    }
    return `${rate}%`;
  }

  loadPurposes(): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.cooperativeLoanPurposeService.getAllPurposes(false).subscribe({
        next: (purposes: LoanPurposeData[]) => {
          console.log('Loaded purposes from API after refresh:', purposes);
          console.log('Active purposes:', purposes.filter(p => p.isActive));
          console.log('Inactive purposes:', purposes.filter(p => !p.isActive));
          console.log('Count:', purposes.length);
          
          this.purposes = [...purposes];
          this.applyFilter();
          this.isLoading = false;
        },
        error: (error: Error) => {
          console.error('Error loading cooperative purposes:', error);
          this.purposes = [];
          this.filteredPurposes = [];
          this.isLoading = false;
        }
      })
    );
  }

  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredPurposes = [...this.purposes];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredPurposes = this.purposes.filter(purpose =>
      purpose.name.toLowerCase().includes(term) ||
      purpose.code.toLowerCase().includes(term) ||
      (purpose.description && purpose.description.toLowerCase().includes(term))
    );
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.selectedPurpose = null;
    this.purposeForm.reset({
      isActive: true,
      requiresDocumentation: false,
      defaultInterestRate: null,
      maxLoanAmount: null,
      minLoanAmount: null
    });
    while (this.documentationTypes.length) {
      this.documentationTypes.removeAt(0);
    }
    this.showPurposeModal = true;
  }

  openEditModal(purpose: LoanPurposeData): void {
    this.isEditing = true;
    this.selectedPurpose = purpose;
    this.purposeForm.patchValue({
      name: purpose.name,
      code: purpose.code,
      description: purpose.description || '',
      isActive: purpose.isActive,
      maxLoanAmount: purpose.maxLoanAmount || null,
      minLoanAmount: purpose.minLoanAmount || null,
      defaultInterestRate: purpose.defaultInterestRate || null,
      requiresDocumentation: purpose.requiresDocumentation
    });

    while (this.documentationTypes.length) {
      this.documentationTypes.removeAt(0);
    }
    if (purpose.documentationTypes && purpose.documentationTypes.length > 0) {
      purpose.documentationTypes.forEach((docType: string) => {
        this.documentationTypes.push(this.fb.control(docType, Validators.required));
      });
    }

    this.showPurposeModal = true;
  }

  closeModal(): void {
    this.showPurposeModal = false;
    this.selectedPurpose = null;
  }

  closeModalIfOverlay(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  savePurpose(): void {
    if (this.purposeForm.invalid) {
      this.purposeForm.markAllAsTouched();
      this.showMessage('warn', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    const formValue = this.purposeForm.value;
    let formattedCode = formValue.code.toUpperCase().replace(/\s+/g, '-');
    formattedCode = formattedCode.replace(/[^A-Z0-9-]/g, '');
    formattedCode = formattedCode.replace(/-+/g, '-');
    formattedCode = formattedCode.replace(/^-|-$/g, '');

    const payload: CreatePurposePayload = {
      name: formValue.name,
      code: formattedCode,
      description: formValue.description || '',
      isActive: formValue.isActive,
      requiresDocumentation: formValue.requiresDocumentation,
      documentationTypes: formValue.documentationTypes.filter((docType: string) => docType && docType.trim()),
      minLoanAmount: formValue.minLoanAmount || null,
      maxLoanAmount: formValue.maxLoanAmount || null,
      defaultInterestRate: formValue.defaultInterestRate || null
    };

    if (payload.minLoanAmount && payload.maxLoanAmount && payload.minLoanAmount >= payload.maxLoanAmount) {
      this.showMessage('warn', 'Validation Error', 'Minimum loan amount must be less than maximum loan amount');
      return;
    }

    if (!/^[A-Z0-9-]+$/.test(payload.code)) {
      this.showMessage('warn', 'Validation Error', 'Purpose code must contain only uppercase letters, numbers, and dashes (e.g., COOP-103)');
      return;
    }

    this.isLoading = true;

    if (this.isEditing && this.selectedPurpose?.id) {
      if (this.selectedPurpose.code !== payload.code) {
        this.showMessage('error', 'Cannot Change Code', 'Purpose code cannot be changed after creation.');
        this.isLoading = false;
        return;
      }

      this.cooperativeLoanPurposeService.updatePurpose(this.selectedPurpose.id, payload).subscribe({
        next: (updatedPurpose: LoanPurposeData) => {
          this.showMessage('success', 'Success', 'Cooperative loan purpose updated successfully');
          this.closeModal();
          this.loadPurposes();
          this.isLoading = false;
        },
        error: (error: Error) => {
          console.error('Error updating cooperative purpose:', error);
          this.showMessage('error', 'Error', 'Failed to update cooperative loan purpose');
          this.isLoading = false;
        }
      });
      return;
    }

    this.cooperativeLoanPurposeService.getPurposeByCode(payload.code).subscribe({
      next: (existing: LoanPurposeData | null) => {
        if (existing) {
          this.showMessage('warn', 'Duplicate Code', `Purpose code "${payload.code}" already exists.`);
          this.isLoading = false;
          return;
        }

        this.cooperativeLoanPurposeService.createPurpose(payload).subscribe({
          next: (newPurpose: LoanPurposeData) => {
            this.showMessage('success', 'Success', 'Cooperative loan purpose created successfully');
            this.closeModal();
            this.purposes = [...this.purposes, newPurpose];
            this.applyFilter();
            this.isLoading = false;
          },
          error: (error: Error) => {
            console.error('Error creating cooperative purpose:', error);
            this.showMessage('error', 'Error', 'Failed to create cooperative loan purpose');
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.cooperativeLoanPurposeService.createPurpose(payload).subscribe({
          next: (newPurpose: LoanPurposeData) => {
            this.showMessage('success', 'Success', 'Cooperative loan purpose created successfully');
            this.closeModal();
            this.purposes = [...this.purposes, newPurpose];
            this.applyFilter();
            this.isLoading = false;
          },
          error: (error: Error) => {
            console.error('Error creating cooperative purpose:', error);
            this.showMessage('error', 'Error', 'Failed to create cooperative loan purpose');
            this.isLoading = false;
          }
        });
      }
    });
  }

  // CORRECT togglePurposeStatus method for the COMPONENT
  togglePurposeStatus(purpose: LoanPurposeData): void {
    const newStatus = !purpose.isActive;
    const purposeId = purpose.id;
    
    if (!purposeId) {
      this.showMessage('error', 'Error', 'Cannot update status: Purpose ID not found');
      return;
    }
    
    // Save original data for rollback
    const originalPurpose = { ...purpose };
    
    // Optimistic update - update UI immediately
    const indexInPurposes = this.purposes.findIndex(p => p.id === purposeId);
    const indexInFiltered = this.filteredPurposes.findIndex(p => p.id === purposeId);
    
    if (indexInPurposes !== -1) {
      this.purposes[indexInPurposes] = { 
        ...this.purposes[indexInPurposes],
        isActive: newStatus
      };
    }
    
    if (indexInFiltered !== -1) {
      this.filteredPurposes[indexInFiltered] = { 
        ...this.filteredPurposes[indexInFiltered],
        isActive: newStatus
      };
    }
    
    // Trigger change detection
    this.purposes = [...this.purposes];
    this.filteredPurposes = [...this.filteredPurposes];
    
    this.isLoading = true;
    
    // Call the service
    this.cooperativeLoanPurposeService.togglePurposeStatus(purposeId, newStatus).subscribe({
      next: () => {
        this.showMessage('success', 'Success', `Purpose ${newStatus ? 'activated' : 'deactivated'} successfully`);
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.error('Error toggling cooperative purpose status:', error);
        // Revert on error
        if (indexInPurposes !== -1) {
          this.purposes[indexInPurposes] = { ...originalPurpose };
        }
        if (indexInFiltered !== -1) {
          this.filteredPurposes[indexInFiltered] = { ...originalPurpose };
        }
        this.purposes = [...this.purposes];
        this.filteredPurposes = [...this.filteredPurposes];
        this.showMessage('error', 'Error', error.message || 'Failed to update cooperative purpose status');
        this.isLoading = false;
      }
    });
  }

  confirmDelete(purpose: LoanPurposeData): void {
    this.purposeToDelete = purpose;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.purposeToDelete = null;
    this.isDeleting = false;
  }

  deletePurpose(): void {
    if (!this.purposeToDelete?.id) {
      this.showMessage('error', 'Error', 'Cannot delete: Purpose ID not found');
      this.closeDeleteModal();
      return;
    }

    this.isDeleting = true;
    this.cooperativeLoanPurposeService.deletePurpose(this.purposeToDelete.id).subscribe({
      next: () => {
        this.showMessage('success', 'Success', `Purpose "${this.purposeToDelete?.name}" deleted successfully`);
        this.purposes = this.purposes.filter(p => p.id !== this.purposeToDelete?.id);
        this.filteredPurposes = this.filteredPurposes.filter(p => p.id !== this.purposeToDelete?.id);
        this.closeDeleteModal();
      },
      error: (error: Error) => {
        console.error('Error deleting purpose:', error);
        this.showMessage('error', 'Error', error.message || 'Failed to delete cooperative loan purpose');
        this.isDeleting = false;
      }
    });
  }

  private showMessage(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string): void {
    this.messages = [{ severity, summary, detail }];
    setTimeout(() => {
      this.messages = [];
    }, 5000);
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }
}