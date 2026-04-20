import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl, AbstractControl } from '@angular/forms';
import { Message } from 'primeng/api';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoanPurposeService, CreatePurposePayload, LoanPurposeData } from '../../../service/loan/loan-purpose.service';
import { Location } from '@angular/common';
import { v4 as uuidV4 } from 'uuid';

@Component({
  selector: 'app-loan-purpose-management',
  templateUrl: './loan-purpose-management.component.html',
  styleUrls: ['./loan-purpose-management.component.scss']
})
export class LoanPurposeManagementComponent implements OnInit, OnDestroy {
  purposes: LoanPurposeData[] = [];
  filteredPurposes: LoanPurposeData[] = [];
  isLoading = false;
  showPurposeModal = false;
  isEditing = false;
  selectedPurpose: LoanPurposeData | null = null;
  purposeForm: FormGroup;
  messages: Message[] = [];
  searchTerm = '';
  
  // Delete modal properties
  showDeleteModal = false;
  purposeToDelete: LoanPurposeData | null = null;
  isDeleting = false;
  
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private loanPurposeService: LoanPurposeService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    this.purposeForm = this.createPurposeForm();
  }

  ngOnInit(): void {
    this.loadPurposes();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  createPurposeForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      code: ['', [
        Validators.required, 
        Validators.maxLength(50), 
        Validators.pattern('^[A-Z0-9-]+$')
      ]],
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
    return Array(this.documentationTypes.length).fill(0).map((_, i) => i);
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
    return this.purposes.filter(p => p.isActive).length;
  }

  get inactivePurposesCount(): number {
    return this.purposes.filter(p => !p.isActive).length;
  }

  get nameControl(): AbstractControl | null { return this.purposeForm.get('name'); }
  get codeControl(): AbstractControl | null { return this.purposeForm.get('code'); }
  get requiresDocumentationControl(): AbstractControl | null { return this.purposeForm.get('requiresDocumentation'); }

  getDescriptionDisplay(description: string | undefined): string {
    if (!description) return '—';
    if (description.length > 60) {
      return description.substring(0, 60) + '...';
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
      this.loanPurposeService.getAllPurposes(false).subscribe({
        next: (purposes: LoanPurposeData[]) => {
          console.log('Purposes loaded successfully:', purposes);
          this.purposes = purposes;
          this.applyFilter();
          this.isLoading = false;
          
          if (purposes.length === 0) {
            this.showMessage('info', 'No Data', 'No loan purposes found. Click "New Purpose" to create one.');
          }
        },
        error: (err: Error) => {
          console.error('Error loading purposes:', err);
          this.showMessage('error', 'Error', err.message || 'Failed to load loan purposes');
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
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredPurposes = this.purposes.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.code.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    }
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
      documentationTypes: formValue.documentationTypes.filter((dt: string) => dt && dt.trim()),
      minLoanAmount: formValue.minLoanAmount || null,
      maxLoanAmount: formValue.maxLoanAmount || null,
      defaultInterestRate: formValue.defaultInterestRate || null
    };

    // Validate min < max if both are provided
    if (payload.minLoanAmount && payload.maxLoanAmount && payload.minLoanAmount >= payload.maxLoanAmount) {
      this.showMessage('warn', 'Validation Error', 'Minimum loan amount must be less than maximum loan amount');
      return;
    }

    // Validate code format
    if (!/^[A-Z0-9-]+$/.test(payload.code)) {
      this.showMessage('warn', 'Validation Error', 'Purpose code must contain only uppercase letters, numbers, and dashes (e.g., MED-103)');
      return;
    }

    this.isLoading = true;

    if (this.isEditing && this.selectedPurpose?.id) {
      if (this.selectedPurpose.code !== payload.code) {
        this.showMessage('error', 'Cannot Change Code', 'Purpose code cannot be changed after creation.');
        this.isLoading = false;
        return;
      }
      
      this.loanPurposeService.updatePurpose(this.selectedPurpose.id, payload).subscribe({
        next: () => {
          this.showMessage('success', 'Success', 'Loan purpose updated successfully');
          this.closeModal();
          this.loadPurposes();
          this.isLoading = false;
        },
        error: (err: Error) => {
          console.error('Error updating purpose:', err);
          this.showMessage('error', 'Error', 'Failed to update loan purpose');
          this.isLoading = false;
        }
      });
    } else {
      this.loanPurposeService.getPurposeByCode(payload.code).subscribe({
        next: (existing: LoanPurposeData | null) => {
          if (existing) {
            this.showMessage('warn', 'Duplicate Code', `Purpose code "${payload.code}" already exists.`);
            this.isLoading = false;
          } else {
            this.loanPurposeService.createPurpose(payload).subscribe({
              next: () => {
                this.showMessage('success', 'Success', 'Loan purpose created successfully');
                this.closeModal();
                this.loadPurposes();
                this.isLoading = false;
              },
              error: (err: Error) => {
                console.error('Error creating purpose:', err);
                this.showMessage('error', 'Error', 'Failed to create loan purpose');
                this.isLoading = false;
              }
            });
          }
        },
        error: () => {
          this.loanPurposeService.createPurpose(payload).subscribe({
            next: () => {
              this.showMessage('success', 'Success', 'Loan purpose created successfully');
              this.closeModal();
              this.loadPurposes();
              this.isLoading = false;
            },
            error: (err: Error) => {
              console.error('Error creating purpose:', err);
              this.showMessage('error', 'Error', 'Failed to create loan purpose');
              this.isLoading = false;
            }
          });
        }
      });
    }
  }

  // Delete functionality
  confirmDelete(purpose: LoanPurposeData): void {
    this.purposeToDelete = purpose;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.purposeToDelete = null;
  }

  deletePurpose(): void {
    if (!this.purposeToDelete?.id) {
      this.showMessage('error', 'Error', 'Invalid purpose ID');
      this.closeDeleteModal();
      return;
    }

    this.isDeleting = true;
    this.loanPurposeService.deletePurpose(this.purposeToDelete.id).subscribe({
      next: () => {
        this.showMessage('success', 'Success', `Purpose "${this.purposeToDelete?.name}" deleted successfully`);
        this.closeDeleteModal();
        this.loadPurposes(); // Reload the list
      },
      error: (err: Error) => {
        console.error('Error deleting purpose:', err);
        this.showMessage('error', 'Error', err.message || 'Failed to delete loan purpose');
        this.isDeleting = false;
      }
    });
  }

  private showMessage(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string): void {
    this.messages = [{ severity, summary, detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
}