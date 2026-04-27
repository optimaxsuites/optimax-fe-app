import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  HotelserviceService, 
  Guest, 
  AdditionalDetail, 
  PaymentMethod, 
  BookingStatus 
} from '../../../hospitality/hotelservice.service';

interface CartItem extends AdditionalDetail {
  quantity: number;
}

@Component({
  selector: 'app-service-checkout',
  templateUrl: './service-checkout.component.html',
})
export class ServiceCheckoutComponent implements OnInit {
  step = 1;
  uuid = '';
  loading = false;
  submitting = false;

  // Step 1: Guest
  guests: Guest[] = [];
  filteredGuests: Guest[] = [];
  selectedGuest: Guest | null = null;
  guestSearchQuery = '';
  showNewGuestForm = false;
  isGuestSkipped = false;
  guestForm!: FormGroup;

  // Step 2: Services
  availableServices: AdditionalDetail[] = [];
  filteredServices: AdditionalDetail[] = [];
  serviceSearchQuery = '';
  cart: CartItem[] = [];

  // Step 3: Payment
  paymentForm!: FormGroup;
  batchPayments: any[] = [];
  paymentMethods: PaymentMethod[] = [];

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(
    public hotelService: HotelserviceService,
    private fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.paymentMethods = this.hotelService.getPaymentMethods();
    this.initForms();
    this.loadInitialData();
  }

  initForms(): void {
    this.guestForm = this.fb.group({
      title: ['Mr', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      idNumber: [''],
      gender: ['Male'],
      country: ['Nigeria'],
    });

    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
      paymentMethod: ['CASH', Validators.required],
      reference: [''],
      notes: [''],
    });
  }

  loadInitialData(): void {
    this.loading = true;
    forkJoin({
      guests: this.hotelService.getGuests().pipe(catchError(() => of([]))),
      services: this.hotelService.getAdditionalDetails().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (res) => {
        this.guests = res.guests;
        this.filteredGuests = res.guests;
        this.availableServices = res.services;
        this.filteredServices = res.services;
        this.loading = false;
      },
      error: () => {
        this.showToastMessage('Failed to load data', 'error');
        this.loading = false;
      },
    });
  }

  // Navigation
  goToStep(n: number): void {
    if (n === 2 && !this.selectedGuest && !this.isGuestSkipped) {
      this.showToastMessage('Please select a guest or skip', 'error');
      return;
    }
    if (n === 3 && this.cart.length === 0) {
      this.showToastMessage('Please select at least one service', 'error');
      return;
    }
    this.step = n;
    if (this.step === 3) {
      this.paymentForm.patchValue({ amount: this.balanceDue });
    }
  }

  // Guest Logic
  filterGuests(): void {
    const q = this.guestSearchQuery.toLowerCase();
    this.filteredGuests = this.guests.filter(g =>
      g.firstName.toLowerCase().includes(q) ||
      g.lastName.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.phone.includes(q)
    );
  }

  selectGuest(g: Guest): void {
    this.selectedGuest = g;
    this.isGuestSkipped = false;
    this.showNewGuestForm = false;
    this.goToStep(2);
  }

  skipGuest(): void {
    this.selectedGuest = null;
    this.isGuestSkipped = true;
    this.goToStep(2);
  }

  createGuest(): void {
    if (this.guestForm.invalid) return;
    this.loading = true;
    this.hotelService.createGuest(this.guestForm.value).subscribe({
      next: (created) => {
        this.guests.push(created);
        this.selectGuest(created);
        this.showToastMessage('Guest created successfully', 'success');
        this.loading = false;
      },
      error: () => {
        this.showToastMessage('Failed to create guest', 'error');
        this.loading = false;
      },
    });
  }

  // Service Logic
  filterServices(): void {
    const q = this.serviceSearchQuery.toLowerCase();
    this.filteredServices = this.availableServices.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    );
  }

  addToCart(service: AdditionalDetail): void {
    const existing = this.cart.find(item => item.id === service.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({ ...service, quantity: 1 });
    }
    this.showToastMessage(`${service.name} added to cart`, 'success');
  }

  removeFromCart(serviceId: any): void {
    this.cart = this.cart.filter(item => item.id !== serviceId);
  }

  updateQuantity(serviceId: any, delta: number): void {
    const item = this.cart.find(i => i.id === serviceId);
    if (item) {
      item.quantity = Math.max(1, item.quantity + delta);
    }
  }

  isInCart(serviceId: any): boolean {
    return this.cart.some(i => i.id === serviceId);
  }

  get grandTotal(): number {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  // Payment Logic
  addToBatch(): void {
    if (this.paymentForm.invalid) return;
    const val = this.paymentForm.getRawValue();
    this.batchPayments.push({ ...val });
    this.paymentForm.patchValue({ amount: this.balanceDue, reference: '', notes: '' });
  }

  removeBatchPayment(idx: number): void {
    this.batchPayments.splice(idx, 1);
  }

  get totalPaid(): number {
    return this.batchPayments.reduce((sum, p) => sum + p.amount, 0);
  }

  get balanceDue(): number {
    return Math.max(0, this.grandTotal - this.totalPaid);
  }

  // Submission
  submitCheckout(): void {
    if (this.totalPaid < this.grandTotal && !confirm('Total paid is less than grand total. Proceed?')) {
      return;
    }

    this.submitting = true;
    const serviceDetails = this.cart.map(item => `${item.name} x${item.quantity} (₦${item.price})`).join(', ');
    const guestName = this.selectedGuest ? `${this.selectedGuest.firstName} ${this.selectedGuest.lastName}` : 'Walk-in';
    const note = `Service Sale to ${guestName}: ${serviceDetails}`;

    const paymentCalls = this.batchPayments.map(p => 
      this.hotelService.createPayment({
        bookingId: 0, // standalone
        amountPaid: p.amount,
        method: p.paymentMethod,
        status: 'COMPLETED',
        paidOn: this.hotelService.formatDate(new Date()),
        reference: p.reference || '',
        note: p.notes ? `${p.notes} | ${note}` : note
      })
    );

    if (paymentCalls.length === 0) {
       this.showToastMessage('Please add at least one payment', 'error');
       this.submitting = false;
       return;
    }

    forkJoin(paymentCalls).subscribe({
      next: () => {
        this.showToastMessage('Service sale completed successfully!', 'success');
        setTimeout(() => this.router.navigate(['user/hospitality/bookings', this.uuid]), 1500);
      },
      error: () => {
        this.showToastMessage('Failed to record payments', 'error');
        this.submitting = false;
      }
    });
  }

  // UI Helpers
  showToastMessage(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3500);
  }
}
