import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer } from '../../../../domain/sales/sales.dto';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.scss']
})
export class CustomerFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() editId?: string;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  customerForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  isEditMode = false;
  customerId: string = '';

  // UI State
  showPasswordField = false;

  // Make router available to template
  router: Router;
  @ViewChild('dialog') dialogRef?: ElementRef<HTMLDialogElement>;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private salesService: SalesService,
    router: Router
  ) {
    this.router = router;
    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,20}$/)]],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
      taxId: ['', [Validators.maxLength(50)]],
      status: ['ACTIVE', Validators.required],
      notes: ['']
    });
  }

  ngAfterViewInit(): void {
    try {
      if (this.dialogRef?.nativeElement && typeof this.dialogRef.nativeElement.showModal === 'function') {
        this.dialogRef.nativeElement.showModal();
      } else if (this.dialogRef?.nativeElement) {
        this.dialogRef.nativeElement.setAttribute('open', '');
      }
    } catch (e) {
      // ignore
    }
  }

  ngOnInit(): void {
    this.customerId = this.editId || this.route.snapshot.paramMap.get('id') || '';
    this.isEditMode = !!this.customerId;

    if (this.isEditMode) {
      this.loadCustomer();
    }
  }

  ngOnDestroy(): void {
    this.closeDialog();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCustomer(): void {
    this.isLoading = true;
    this.salesService.getCustomerById(this.customerId).subscribe({
      next: (customer: Customer | null) => {
        if (customer) {
          this.populateForm(customer);
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading customer:', error);
        this.isLoading = false;
        alert('Failed to load customer. Please try again.');
      }
    });
  }

  private populateForm(customer: Customer): void {
    this.customerForm.patchValue({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      taxId: customer.taxId || '',
      status: customer.status,
      notes: (customer as any).notes || ''
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      alert('Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;

    const formValue = this.customerForm.value;
    const customerData: Partial<Customer> = {
      name: formValue.name,
      email: formValue.email,
      phone: formValue.phone,
      address: formValue.address,
      taxId: formValue.taxId || '',
      status: formValue.status,
      createdAt: new Date(),
      totalSpent: 0,
      totalOrders: 0
    };

    let request;
    if (this.isEditMode) {
      request = this.salesService.updateCustomer(this.customerId, customerData);
    } else {
      request = this.salesService.createCustomer(customerData);
    }

    request.subscribe({
      next: (response: Customer) => {
        this.isSubmitting = false;
        alert(this.isEditMode ? 'Customer updated successfully!' : 'Customer created successfully!');
        this.closeDialog();
        if (this.saved.observed) {
          this.saved.emit();
        } else {
          this.router.navigate(['/sales/customers', response.id]);
        }
      },
      error: (error: any) => {
        console.error('Error saving customer:', error);
        this.isSubmitting = false;
        alert('Failed to save customer. Please try again.');
      }
    });
  }

  cancel(): void {
    this.closeDialog();
    if (this.cancelled.observed) {
      this.cancelled.emit();
    } else {
      this.router.navigate(['/sales/customers']);
    }
  }

  private closeDialog(): void {
    try {
      if (this.dialogRef?.nativeElement) {
        if (typeof this.dialogRef.nativeElement.close === 'function') {
          this.dialogRef.nativeElement.close();
        } else {
          this.dialogRef.nativeElement.removeAttribute('open');
        }
      }
    } catch (e) {
      // ignore
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.customerForm.get(fieldName);
    return field ? (field.invalid && (field.dirty || field.touched)) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.customerForm.get(fieldName);
    if (!field) return '';

    if (field.hasError('required')) {
      return 'This field is required';
    }
    if (field.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field.hasError('minlength')) {
      const error = field.errors?.['minlength'];
      return `Minimum ${error.requiredLength} characters required`;
    }
    if (field.hasError('maxlength')) {
      const error = field.errors?.['maxlength'];
      return `Maximum ${error.requiredLength} characters allowed`;
    }
    if (field.hasError('pattern')) {
      return 'Please enter a valid phone number';
    }
    return '';
  }
}