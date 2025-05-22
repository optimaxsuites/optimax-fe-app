import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-reimbursement',
  templateUrl: './reimbursement.component.html',
  styleUrls: ['./reimbursement.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ReimbursementComponent implements OnInit {
  showFilter = false;
  showForm = false;
  showOtherRequestType = false;
  isDraggingOver = false;
  selectedFile: File | null = null;
  Math = Math;
  isDraftMode: boolean = false;
  draftData: any;

  requestTypes = [
    { value: 'travel', label: 'Travel' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'other', label: 'Other' }
  ];

  categories = [
    { value: 'meals', label: 'Meals' },
    { value: 'accomodation', label: 'Accomodation' },
    { value: 'office_supply', label: 'Office Supply' },
    { value: 'software', label: 'Software Subscription' },
    { value: 'other', label: 'Other' }
  ];

  paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'other', label: 'Other' }
  ];

  reimbursementForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.reimbursementForm = this.fb.group({
      requestType: ['', Validators.required],
      otherRequestType: [''],
      date: ['', Validators.required],
      employeeId: ['', Validators.required],
      department: ['', Validators.required],
      merchant: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      currency: ['NGN', Validators.required],
      category: ['', Validators.required],
      paymentMethod: ['', Validators.required],
      accountNumber: ['', [Validators.required, Validators.pattern(/^\d{10,}$/)]],
      bankName: ['', Validators.required],
      receiverName: ['', Validators.required],
      isBusinessExpense: [false],
      receipt: [null] // Removed required validator for draft purposes
    });

    // Load draft if exists
    const draft = localStorage.getItem('draftReimbursement');
    if (draft) {
      this.draftData = JSON.parse(draft);
      this.reimbursementForm.patchValue(this.draftData);
    }
  }

  ngOnInit(): void {}

  toggleFilter() {
    this.showFilter = !this.showFilter;
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.selectedFile = null;
      this.isDraftMode = false;
    }
  }

  onRequestTypeChange(type: string) {
    this.showOtherRequestType = type === 'other';
    if (!this.showOtherRequestType) {
      this.reimbursementForm.get('otherRequestType')?.reset();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  onFileDropped(file: File) {
    this.handleFile(file);
  }

  removeFile() {
    this.selectedFile = null;
    this.reimbursementForm.patchValue({ receipt: null });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
  }

  private handleFile(file: File) {
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        alert('Invalid file type. Please upload JPG, PNG, or PDF.');
        return;
      }
      
      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 10MB.');
        return;
      }
      
      this.selectedFile = file;
      this.reimbursementForm.patchValue({ receipt: file });
      this.isDraggingOver = false;
    }
  }

  saveAsDraft() {
    // Save regardless of form validity
    this.draftData = this.reimbursementForm.value;
    this.isDraftMode = true;
    localStorage.setItem('draftReimbursement', JSON.stringify(this.draftData));
    alert('Draft saved successfully!');
  }

  finishDraft() {
    this.isDraftMode = false;
    if (this.draftData) {
      this.reimbursementForm.patchValue(this.draftData);
    }
  }

  onSubmit() {
    // Manually check receipt if we're submitting (not saving as draft)
    if (!this.selectedFile) {
      alert('Please upload a receipt before submitting');
      return;
    }

    if (this.reimbursementForm.valid) {
      console.log('Submitting:', this.reimbursementForm.value);
      // Clear draft after successful submission
      localStorage.removeItem('draftReimbursement');
      this.reimbursementForm.reset();
      this.selectedFile = null;
      this.showForm = false;
      // Implement actual submission logic here
    } else {
      // Highlight invalid fields
      this.markFormGroupTouched(this.reimbursementForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
    
  recentRequests = [
    { id: 'REQ-2025-0568', date: new Date(2025, 4, 20), type: 'Travel', merchant: 'Uber', amount: 42.50, status: 'Pending' },
    { id: 'REQ-2025-0567', date: new Date(2025, 4, 19), type: 'Meals', merchant: 'Starbucks', amount: 18.75, status: 'Approved' },
    { id: 'REQ-2025-0566', date: new Date(2025, 4, 18), type: 'Office Supplies', merchant: 'Amazon', amount: 129.99, status: 'Rejected' },
   
  ];
  currentPage = 1;
  pageSize = 5;
  totalRequests = 42;
  totalPages = Math.ceil(this.totalRequests / this.pageSize);
  get totalPagesArray() {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  goToPage(page: number) { this.currentPage = page; }
  viewRequest(req: any) { /* Show details logic */ }
  deleteRequest(req: any) { /* Delete logic */ }
  
}