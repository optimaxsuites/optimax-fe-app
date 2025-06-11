import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ReimbursementRequest } from '../../domain/expense.data';

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
  // UI State
  showFilter = false;
  showRequestSection = false;
  showForm = false;
  showOtherRequestType = false;
  showRecentRequests = true;
  isDraggingOver = false;
  allChecked = false;
  isDraftMode = false;
  editMode = false;
   editableRequest: any = {};

  // Popups
  showFilePopup = false; 
  showImagePopup = false; 
  popupSource: 'new' | 'recent' = 'new';

  // Preview Data
  previewRequest: ReimbursementRequest | null = null;
  previewImageSrc: string | null = null;

  // File Handling
  selectedFile: File | null = null;
  selectedFileBase64: string | null = null;
  selectedFileType: string | null = null;

  // Data & Filtering
  Math = Math;
  draftData: any;
  fieldErrors: { [key: string]: string } = {};
  selectedStatus: string | null = null;
  selectedDate: Date | null = null;
  selectedCategory: string | null = null;

  

  
    enableEditMode() {
    if (!this.previewRequest) return;
    this.editMode = true;
    this.editableRequest = { ...this.previewRequest };
  }
  
  cancelEdit() {
    this.editMode = false;
    this.editableRequest = {};
  }
  
  saveEdit() {
    if (!this.previewRequest) return;
    
    Object.assign(this.previewRequest, this.editableRequest);
    const idx = this.allRequests.findIndex(r => r.id === this.previewRequest!.id);
    if (idx !== -1) {
      this.allRequests[idx] = { ...this.previewRequest };
      this.saveRequests();
      this.applyFilters();
    }
    this.editMode = false;
    this.editableRequest = {};
  }

  // Table Data
  allRequests: ReimbursementRequest[] = [
   
  ];
  filteredRequests: ReimbursementRequest[] = [...this.allRequests];

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalRequests = this.allRequests.length;
  totalPages = Math.ceil(this.totalRequests / this.pageSize);

  // Form
  reimbursementForm: FormGroup;

  // Static Data
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

  editingRequestId: string | null = null;
  comment: string = '';

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

  ngOnInit(): void {
    this.applyFilters();
  }

  // --Table Data Getters --
  get newRequestTableData() {
    return this.allRequests.filter(r => r.status === 'Pending');
  }
  get recentRequestTableData() {
    return this.filteredRequests;
  }

  // -- File Handling --
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.selectedFileBase64 = null;
    this.selectedFileType = null;
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
    const maxSize = 10 * 1024 * 1024; 

    if (!validTypes.includes(file.type)) {
      this.fieldErrors['receipt'] = 'Invalid file type. Please upload JPG, PNG, or PDF.';
      return;
    }
    if (file.size > maxSize) {
      this.fieldErrors['receipt'] = 'File is too large. Maximum size is 10MB.';
      return;
    }

    this.selectedFile = file;
    this.selectedFileType = file.type;
    this.reimbursementForm.patchValue({ receipt: file });
    this.fieldErrors['receipt'] = '';

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedFileBase64 = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  // --Form & Draft --
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

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.showRecentRequests = !this.showForm;
    this.showFilter = false;
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
    this.selectedFileBase64 = null;
    this.selectedFileType = null;
    this.fieldErrors = {};
    this.isDraftMode = false;
  }

  // -- Request CRUD --
   onSubmit(): void {
    this.fieldErrors = {};
    this.validateAllFields();
  
    if (!this.selectedFile && !this.editingRequestId) {
      this.fieldErrors['receipt'] = 'Receipt is required';
    }
    if (Object.keys(this.fieldErrors).length > 0) {
      this.scrollToFirstError();
      return;
    }
  
    if (this.editingRequestId) {
      const idx = this.allRequests.findIndex(r => r.id === this.editingRequestId);
      if (idx !== -1) {
        this.allRequests[idx] = {
          ...this.allRequests[idx],
          ...this.reimbursementForm.value,
          date: new Date(this.reimbursementForm.value.date),
          status: 'Pending',
          showDropdown: false,
          department: this.reimbursementForm.value.department,
          receiverName: this.reimbursementForm.value.receiverName,
          description: this.reimbursementForm.value.description,
          paymentMethod: this.reimbursementForm.value.paymentMethod,
          accountNumber: this.reimbursementForm.value.accountNumber,
          bankName: this.reimbursementForm.value.bankName
        };
        this.saveRequests();
        this.applyFilters();
      }
      this.editingRequestId = null;
    } else {
      const newRequest: ReimbursementRequest = {
        id: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date(this.reimbursementForm.value.date),
        type: this.reimbursementForm.value.requestType === 'other'
          ? this.reimbursementForm.value.otherRequestType
          : this.requestTypes.find(t => t.value === this.reimbursementForm.value.requestType)?.label || this.reimbursementForm.value.requestType,
        merchant: this.reimbursementForm.value.merchant,
        amount: this.reimbursementForm.value.amount,
        status: 'Pending',
        checked: false,
        category: this.categories.find(c => c.value === this.reimbursementForm.value.category)?.label || this.reimbursementForm.value.category,
        employeeId: this.reimbursementForm.value.employeeId,
        showDropdown: false,
        receiptBase64: this.selectedFileBase64 ?? undefined,
        receiptType: this.selectedFileType ?? undefined,
        receiptName: this.selectedFile?.name,
        department: this.reimbursementForm.value.department,
        receiverName: this.reimbursementForm.value.receiverName,
        description: this.reimbursementForm.value.description,
        paymentMethod: this.reimbursementForm.value.paymentMethod,
        accountNumber: this.reimbursementForm.value.accountNumber,
        bankName: this.reimbursementForm.value.bankName
      };
      this.allRequests.unshift(newRequest);
      this.filteredRequests.unshift(newRequest);
      this.totalRequests = this.allRequests.length;
      this.totalPages = Math.ceil(this.totalRequests / this.pageSize);
      this.saveRequests();
    }
    this.selectedFileBase64 = null;
    this.selectedFileType = null;
  
    // Reset form and UI
    localStorage.removeItem('draftReimbursement');
    this.resetForm();
    this.showForm = false;
    this.showRecentRequests = true;
    alert('Request submitted successfully!');
  }

  // Updated viewRequest and editRequest for popupSource
  viewRequest(req: ReimbursementRequest, source: 'new' | 'recent' = 'new'): void {
    this.previewRequest = req;
    this.showFilePopup = true;
    this.comment = req.comment || '';
    this.popupSource = source;
    this.showImagePopup = false;
    this.previewImageSrc = null;
  }

  editRequest(req: ReimbursementRequest): void {
    if (req.status !== 'Pending') return;
    this.editingRequestId = req.id;
    this.showForm = true;
    this.showRecentRequests = false;

    // Always get the latest from localStorage
    const savedRequests = localStorage.getItem('submittedRequests');
    let requestToEdit = req;
    if (savedRequests) {
      const parsedRequests: ReimbursementRequest[] = JSON.parse(savedRequests);
      const found = parsedRequests.find(r => r.id === req.id);
      if (found) {
        requestToEdit = { ...found, date: new Date(found.date) };
      }
    }

    this.reimbursementForm.patchValue({
      requestType: requestToEdit.type,
      date: requestToEdit.date,
      employeeId: requestToEdit.employeeId,
      department: (requestToEdit as any).department || '',
      merchant: requestToEdit.merchant,
      description: (requestToEdit as any).description || '',
      amount: requestToEdit.amount,
      category: requestToEdit.category,
      paymentMethod: (requestToEdit as any).paymentMethod || '',
      accountNumber: (requestToEdit as any).accountNumber || '',
      bankName: (requestToEdit as any).bankName || '',
      receiverName: (requestToEdit as any).receiverName || '',
      isBusinessExpense: (requestToEdit as any).isBusinessExpense || false,
    });
  }

  deleteRequest(req: ReimbursementRequest): void {
    if (confirm('Are you sure you want to delete this request?')) {
      const index = this.allRequests.findIndex(r => r.id === req.id);
      if (index !== -1) {
        this.allRequests.splice(index, 1);
        this.applyFilters();
        this.saveRequests();
      }
    }
  }

  // -- Request Actions --
  approveRequest(req: ReimbursementRequest): void {
    req.status = 'Approved';
    req.showDropdown = false;
    this.saveRequests();
    this.applyFilters();
  }

   declineRequest(req: ReimbursementRequest): void {
    req.status = 'Rejected';
    req.comment = this.comment; 
    req.showDropdown = false;
    this.saveRequests();
    this.applyFilters();
  }

  toggleDropdown(req: ReimbursementRequest): void {
    this.allRequests.forEach(r => {
      if (r !== req) r.showDropdown = false;
    });
    req.showDropdown = !req.showDropdown;
  }

  toggleAllCheckboxes(): void {
    this.allChecked = !this.allChecked;
    this.filteredRequests.forEach(request => request.checked = this.allChecked);
  }

  // -- Popups & Preview --
  closeFilePopup(): void {
    this.showFilePopup = false;
    this.previewRequest = null;
    this.showImagePopup = false;
    this.previewImageSrc = null;
  }

  openImagePopup(): void {
    if (this.previewRequest && this.previewRequest.receiptType?.startsWith('image/')) {
      this.previewImageSrc = this.previewRequest.receiptBase64 ?? null;
      this.showImagePopup = true;
    }
  }

  closeImagePopup(): void {
    this.showImagePopup = false;
    this.previewImageSrc = null;
  }

  onReceiptClick(): void {
    if (!this.previewRequest) return;
    if (this.previewRequest.receiptType === 'application/pdf') {
      window.open(this.previewRequest.receiptBase64, '_blank');
    } else if (this.previewRequest.receiptType?.startsWith('image/')) {
      this.openImagePopup();
    }
  }

  // -- Filtering --
  filterByStatus(status: string | null): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  filterByDate(date: Date | null): void {
    this.selectedDate = date;
    this.applyFilters();
  }

  filterByCategory(category: string | null): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedStatus = null;
    this.selectedDate = null;
    this.selectedCategory = null;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredRequests = this.allRequests.filter(request => {
      if (this.selectedStatus && request.status !== this.selectedStatus) {
        return false;
      }
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
      if (this.selectedCategory && request.category !== this.selectedCategory) {
        return false;
      }
      return true;
    });

    this.totalRequests = this.filteredRequests.length;
    this.totalPages = Math.ceil(this.totalRequests / this.pageSize);
    this.currentPage = 1;
  }

  // ---- Pagination --
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

  // -- UI Toggles --
  toggleFilter(): void {
    if (!this.showForm) {
      this.showFilter = !this.showFilter;
    }
  }

  toggleRequestSection(): void {
    this.showRequestSection = !this.showRequestSection;
    if (this.showRequestSection) {
      this.showForm = false;
      this.showRecentRequests = false;
    } else {
      this.showRecentRequests = true;
    }
  }

  onRequestTypeChange(type: string): void {
    this.showOtherRequestType = type === 'other';
    if (!this.showOtherRequestType) {
      this.reimbursementForm.get('otherRequestType')?.reset();
    }
  }

  // -- Validation --
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

  // -- Local Storage --
  private loadSavedRequests(): void {
    const savedRequests = localStorage.getItem('submittedRequests');
    if (savedRequests) {
      try {
        const parsedRequests = JSON.parse(savedRequests).map((req: any) => ({
          ...req,
          date: new Date(req.date)
        }));
        this.allRequests = [...this.allRequests, ...parsedRequests];
        this.filteredRequests = [...this.allRequests];
        this.totalRequests = this.allRequests.length;
        this.totalPages = Math.ceil(this.totalRequests / this.pageSize);
      } catch (e) {
        console.error('Failed to parse saved requests', e);
      }
    }
  }

  private saveRequests(): void {
    localStorage.setItem('submittedRequests', JSON.stringify(this.allRequests));
  }
}