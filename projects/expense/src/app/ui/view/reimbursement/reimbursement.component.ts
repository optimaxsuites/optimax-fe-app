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
  showRequestSection = false;
  showForm = false;
  showOtherRequestType = false;
  isDraggingOver = false;
  selectedFile: File | null = null;
  Math = Math;
  isDraftMode: boolean = false;
  draftData: any;
  fieldErrors: { [key: string]: string } = {};
  showRecentRequests = true;
  allChecked = false;

  // Filter variables
  selectedStatus: string | null = null;
  selectedDate: Date | null = null;
  selectedCategory: string | null = null;

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

  // Main data storage for all requests
  allRequests = [
    { id: 'REQ-2025-0568', date: new Date(2025, 4, 20), type: 'Travel', merchant: 'Uber', amount: 42.50, status: 'Pending', checked: false },
    { id: 'REQ-2025-0567', date: new Date(2025, 4, 19), type: 'Meals', merchant: 'Starbucks', amount: 18.75, status: 'Approved', checked: false },
    { id: 'REQ-2025-0566', date: new Date(2025, 4, 18), type: 'Office Supplies', merchant: 'Amazon', amount: 129.99, status: 'Rejected', checked: false },
  ];
  
  // Filtered requests that will be displayed
  filteredRequests = [...this.allRequests];
  
  currentPage = 1;
  pageSize = 5;
  totalRequests = this.allRequests.length;
  totalPages = Math.ceil(this.totalRequests / this.pageSize);
  
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
      receipt: [null]
    });

    this.loadDraft();
    this.loadSavedRequests(); 
  }

  requestTableData = [
    {
      date: new Date(2025, 4, 30),
      requestType: 'Travel',
      merchant: 'Uber',
      category: 'Transportation',
      amount: 5000,
      employeeId: 'EMP123',
      status: 'Pending',
      showDropdown: false
    }
  ];

  ngOnInit(): void {
    this.applyFilters(); 
  }

  // Load saved requests from localStorage
  private loadSavedRequests(): void {
    const savedRequests = localStorage.getItem('submittedRequests');
    if (savedRequests) {
      try {
        const parsedRequests = JSON.parse(savedRequests);
        this.allRequests = [...this.allRequests, ...parsedRequests];
        this.filteredRequests = [...this.allRequests];
        this.totalRequests = this.allRequests.length;
        this.totalPages = Math.ceil(this.totalRequests / this.pageSize);
      } catch (e) {
        console.error('Failed to parse saved requests', e);
      }
    }
  }

  // Save requests to localStorage
  private saveRequests(): void {
    localStorage.setItem('submittedRequests', JSON.stringify(this.allRequests));
  }

  // Apply all active filters to the requests
  private applyFilters(): void {
    this.filteredRequests = this.allRequests.filter(request => {
    
      if (this.selectedStatus && request.status !== this.selectedStatus) {
        return false;
      }
      
      // Date filter (simple date comparison)
     if (
  this.selectedDate &&
  (
    request.date.getDate() !== this.selectedDate.getDate() ||
    request.date.getMonth() !== this.selectedDate.getMonth() ||
    request.date.getFullYear() !== this.selectedDate.getFullYear()
  )
) {
  return false;
}

      
      // Category filter
      if (this.selectedCategory && request.type !== this.selectedCategory) {
        return false;
      }
      
      return true;
    });
    
    this.totalRequests = this.filteredRequests.length;
    this.totalPages = Math.ceil(this.totalRequests / this.pageSize);
    this.currentPage = 1; 
  }

  // Filter by status
  filterByStatus(status: string | null): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  // Filter by date
  filterByDate(date: Date | null): void {
    this.selectedDate = date;
    this.applyFilters();
  }

  // Filter by category
  filterByCategory(category: string | null): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  // Clear all filters
  clearFilters(): void {
    this.selectedStatus = null;
    this.selectedDate = null;
    this.selectedCategory = null;
    this.applyFilters();
  }

  toggleDropdown(req: any) {
    this.requestTableData.forEach(r => {
      if (r !== req) r.showDropdown = false;
    });
    req.showDropdown = !req.showDropdown;
  }
  
  approveRequest(req: any) {
    req.status = 'Approved';
    req.showDropdown = false;
    this.saveRequests();
  }
  
  declineRequest(req: any) {
    req.status = 'Rejected';
    req.showDropdown = false;
    this.saveRequests();
  }

  private loadDraft(): void {
    const draft = localStorage.getItem('draftReimbursement');
    if (draft) {
      try {
        this.draftData = JSON.parse(draft);
        this.reimbursementForm.patchValue(this.draftData);
        this.isDraftMode = true;
      } catch (e) {
        console.error('Failed to parse draft data', e);
        localStorage.removeItem('draftReimbursement');
      }
    }
  }

  toggleFilter(): void {
    if (!this.showForm) {
      this.showFilter = !this.showFilter;
    }
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.showRecentRequests = !this.showForm;
    this.showFilter = false; // Hide filter when form is open
    
    if (this.showForm && this.isDraftMode) {
      this.reimbursementForm.patchValue(this.draftData);
    }
  }

  cancelForm(): void {
    if (this.reimbursementForm.dirty || this.selectedFile) {
      if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        this.resetForm();
        this.showForm = false;
        this.showRecentRequests = true;
      }
    } else {
      this.showForm = false;
      this.showRecentRequests = true;
    }
  }

  private resetForm(): void {
    this.reimbursementForm.reset({
      currency: 'NGN',
      isBusinessExpense: false
    });
    this.selectedFile = null;
    this.fieldErrors = {};
    this.isDraftMode = false;
  }

  toggleAllCheckboxes(): void {
    this.allChecked = !this.allChecked;
    this.filteredRequests.forEach(request => request.checked = this.allChecked);
  }

  onRequestTypeChange(type: string): void {
    this.showOtherRequestType = type === 'other';
    if (!this.showOtherRequestType) {
      this.reimbursementForm.get('otherRequestType')?.reset();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.reimbursementForm.patchValue({ receipt: null });
    this.fieldErrors['receipt'] = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
  }

  private handleFile(file: File): void {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      this.fieldErrors['receipt'] = 'Invalid file type. Please upload JPG, PNG, or PDF.';
      return;
    }
    
    if (file.size > maxSize) {
      this.fieldErrors['receipt'] = 'File is too large. Maximum size is 10MB.';
      return;
    }
    
    this.selectedFile = file;
    this.reimbursementForm.patchValue({ receipt: file });
    this.fieldErrors['receipt'] = '';
  }

  saveAsDraft(): void {
    if (this.reimbursementForm.invalid) {
      this.validateAllFields();
      return;
    }

    this.draftData = {
      ...this.reimbursementForm.value,
      receiptFileName: this.selectedFile?.name
    };
    
    this.isDraftMode = true;
    localStorage.setItem('draftReimbursement', JSON.stringify(this.draftData));
    alert('Draft saved successfully!');
    this.showForm = false;
    this.showRecentRequests = true;
  }

  onSubmit(): void {
    this.fieldErrors = {};
    this.validateAllFields();
    
    if (!this.selectedFile) {
      this.fieldErrors['receipt'] = 'Receipt is required';
    }

    if (Object.keys(this.fieldErrors).length > 0) {
      this.scrollToFirstError();
      return;
    }

    
    
    // Create new request object
     const newRequest = {
    id: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date(this.reimbursementForm.value.date),
    type: this.reimbursementForm.value.requestType === 'other' 
          ? this.reimbursementForm.value.otherRequestType 
          : this.requestTypes.find(t => t.value === this.reimbursementForm.value.requestType)?.label || this.reimbursementForm.value.requestType,
    merchant: this.reimbursementForm.value.merchant,
    amount: this.reimbursementForm.value.amount,
    status: 'Pending',
    checked: false, category: this.categories.find(c => c.value === this.reimbursementForm.value.category)?.label || this.reimbursementForm.value.category,
    employeeId: this.reimbursementForm.value.employeeId
  };
     
  

    // Add to both allRequests and filteredRequests
    this.allRequests.unshift(newRequest);
    this.filteredRequests.unshift(newRequest);
    this.totalRequests = this.allRequests.length;
    this.totalPages = Math.ceil(this.totalRequests / this.pageSize);

    // Save to localStorage
    this.saveRequests();

    // Reset form and UI
    localStorage.removeItem('draftReimbursement');
    this.resetForm();
    this.showForm = false;
    this.showRecentRequests = true;
    alert('Request submitted successfully!');
  }

  toggleRequestSection() {
    this.showRequestSection = !this.showRequestSection;
    if (this.showRequestSection) {
      this.showForm = false;
      this.showRecentRequests = false;
    } else {
      this.showRecentRequests = true;
    }
  }

  private validateAllFields(): void {
    this.validateField('requestType', 'Request type is required');
    this.validateField('date', 'Date is required');
    this.validateField('employeeId', 'Employee ID is required');
    this.validateField('department', 'Department is required');
    this.validateField('merchant', 'Merchant is required');
    this.validateField('description', 'Description must be at least 10 characters');
    this.validateField('amount', 'Amount must be at least 0.01');
    this.validateField('category', 'Category is required');
    this.validateField('paymentMethod', 'Payment method is required');
    this.validateField('accountNumber', 'Valid account number (10+ digits) is required');
    this.validateField('bankName', 'Bank name is required');
    this.validateField('receiverName', 'Receiver name is required');
  }

  private validateField(fieldName: string, errorMessage: string): void {
    const control = this.reimbursementForm.get(fieldName);
    if (control && control.invalid && control.errors) {
      if (control.errors['required']) {
        this.fieldErrors[fieldName] = errorMessage;
      } else if (control.errors['minlength']) {
        this.fieldErrors[fieldName] = errorMessage;
      } else if (control.errors['min']) {
        this.fieldErrors[fieldName] = errorMessage;
      } else if (control.errors['pattern']) {
        this.fieldErrors[fieldName] = errorMessage;
      }
    }
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstErrorElement = document.querySelector('.invalid');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  get totalPagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }
  
  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }
  
  goToPage(page: number): void {
    this.currentPage = page;
  }
  
  viewRequest(req: any): void {
    console.log('Viewing request:', req);
  }
  
  deleteRequest(req: any): void {
    if (confirm('Are you sure you want to delete this request?')) {
      const index = this.allRequests.findIndex(r => r.id === req.id);
      if (index !== -1) {
        this.allRequests.splice(index, 1);
        this.applyFilters(); 
        this.saveRequests(); 
      }
    }
  }
}