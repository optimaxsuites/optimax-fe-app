import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  HotelserviceService,
  Guest,
  Room,
  AdditionalDetail,
  Booking,
  BookingStatus,
  Payment,
  PaymentMethod,
} from '../../../hospitality/hotelservice.service';

interface ServiceItem {
  service: AdditionalDetail;
  quantity: number;
}

@Component({
  selector: 'app-booking-create',
  templateUrl: './booking-create.component.html',
})
export class BookingCreateComponent implements OnInit {
  step = 1; // 1-3

  // Step 1 — Guest
  guests: Guest[] = [];
  selectedGuest: Guest | null = null;
  guestSearchQuery = '';
  filteredGuests: Guest[] = [];
  showNewGuestForm = false;
  guestForm!: FormGroup;
  titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
  genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  countries: string[] = [];

  // Step 2 — Dates + Rooms
  datesForm!: FormGroup;
  availableRooms: Room[] = [];
  selectedRooms: Room[] = [];
  loadingRooms = false;
  roomsLoaded = false;

  // Step 3 — Payment
  paymentForm!: FormGroup;
  paymentMethods: {
    key: PaymentMethod;
    label: string;
    icon: string;
    color: string;
  }[] = [
    {
      key: 'CASH',
      label: 'Cash',
      icon: 'fa-solid fa-money-bill-wave',
      color: 'border-green-500 bg-green-50 text-green-700',
    },
    {
      key: 'CARD',
      label: 'Card',
      icon: 'fa-solid fa-credit-card',
      color: 'border-blue-500 bg-blue-50 text-blue-700',
    },
    {
      key: 'TRANSFER',
      label: 'Transfer',
      icon: 'fa-solid fa-building-columns',
      color: 'border-purple-500 bg-purple-50 text-purple-700',
    },
  ];

  batchPayments: {
    method: PaymentMethod;
    amount: number;
    reference?: string;
    note?: string;
  }[] = [];

  submitting = false;
  uuid = '';

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  constructor(
    private hotelService: HotelserviceService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.uuid =
      this.route.snapshot.paramMap.get('uuid') ||
      this.route.parent?.snapshot.paramMap.get('uuid') ||
      '';
    this.countries = this.hotelService.getCountries();
    this.initForms();
    this.loadGuests();
  }

  initForms(): void {
    this.guestForm = this.fb.group({
      title: ['Mr', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      country: ['Nigeria', Validators.required],
      gender: ['Male', Validators.required],
      idNumber: ['', Validators.required],
    });

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split('T')[0];
    this.datesForm = this.fb.group({
      checkinDate: [today, Validators.required],
      checkoutDate: [tomorrow, Validators.required],
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.required, Validators.min(0)]],
      specialRequests: [''],
    });

    this.paymentForm = this.fb.group({
      paymentMethod: ['CASH', Validators.required],
      depositAmount: [0, [Validators.required, Validators.min(0)]],
      reference: [''],
      notes: [''],
    });
  }

  loadGuests(): void {
    this.hotelService.getGuests().subscribe({
      next: (data) => {
        this.guests = data;
        this.filteredGuests = data;
      },
    });
  }

  filterGuests(): void {
    const q = this.guestSearchQuery.toLowerCase();
    this.filteredGuests = this.guests.filter(
      (g) =>
        g.firstName.toLowerCase().includes(q) ||
        g.lastName.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q),
    );
  }

  selectGuest(guest: Guest): void {
    this.selectedGuest = guest;
    this.showNewGuestForm = false;
  }

  createAndSelectGuest(): void {
    if (this.guestForm.invalid) return;
    this.hotelService.createGuest(this.guestForm.value).subscribe({
      next: (created) => {
        const id = this.hotelService.getId(created);
        this.selectedGuest = { ...created, id };
        this.showNewGuestForm = false;
        this.guests.push(this.selectedGuest);
        this.filteredGuests = [...this.guests];
        this.showToastMessage('Guest created', 'success');
      },
      error: () => this.showToastMessage('Failed to create guest', 'error'),
    });
  }

  loadAvailableRooms(): void {
    const { checkinDate, checkoutDate } = this.datesForm.value;
    if (!checkinDate || !checkoutDate) return;
    this.loadingRooms = true;
    this.roomsLoaded = false;
    this.hotelService.getRoomsAvailable(checkinDate, checkoutDate).subscribe({
      next: (rooms) => {
        this.availableRooms = rooms;
        this.loadingRooms = false;
        this.roomsLoaded = true;
      },
      error: () => {
        this.loadingRooms = false;
        this.roomsLoaded = true;
      },
    });
  }

  toggleRoom(room: Room): void {
    const idx = this.selectedRooms.findIndex((r) => r.id === room.id);
    if (idx >= 0) {
      this.selectedRooms.splice(idx, 1);
    } else {
      this.selectedRooms.push(room);
    }
  }

  isRoomSelected(room: Room): boolean {
    return this.selectedRooms.some((r) => r.id === room.id);
  }

  get roomSubtotal(): number {
    const { checkinDate, checkoutDate } = this.datesForm.value;
    const nights =
      this.hotelService.calculateNights(checkinDate, checkoutDate) || 1;
    return this.selectedRooms.reduce((sum, r) => sum + r.rate * nights, 0);
  }

  get grandTotal(): number {
    return this.roomSubtotal;
  }

  get changeDue(): number {
    const overpaid = this.totalBatchAmount - this.grandTotal;
    return overpaid > 0 ? overpaid : 0;
  }

  get balanceDue(): number {
    return Math.max(0, this.grandTotal - this.totalBatchAmount);
  }

  get nights(): number {
    const { checkinDate, checkoutDate } = this.datesForm.value;
    return this.hotelService.calculateNights(checkinDate, checkoutDate) || 0;
  }

  nextStep(): void {
    if (this.step === 2 && !this.roomsLoaded) {
      this.loadAvailableRooms();
      return;
    }
    this.step++;
  }

  addToBatch(): void {
    const amount = this.paymentForm.get('depositAmount')?.value || 0;
    const method = this.paymentForm.get('paymentMethod')?.value;
    if (amount <= 0 || !method) return;

    this.batchPayments.push({
      method,
      amount,
      reference: this.paymentForm.get('reference')?.value,
      note: this.paymentForm.get('notes')?.value,
    });

    // Reset amount but keep method?
    this.paymentForm.patchValue({ depositAmount: 0 });
  }

  removeFromBatch(index: number): void {
    this.batchPayments.splice(index, 1);
  }

  get totalBatchAmount(): number {
    return this.batchPayments.reduce((sum, p) => sum + p.amount, 0);
  }

  selectMethod(method: PaymentMethod): void {
    this.paymentForm.patchValue({ paymentMethod: method });
  }

  prevStep(): void {
    this.step--;
  }

  canProceedStep1(): boolean {
    return !!this.selectedGuest;
  }

  canProceedStep2(): boolean {
    return this.datesForm.valid && this.selectedRooms.length > 0;
  }

  submitBooking(): void {
    const guestId = this.hotelService.getId(this.selectedGuest);
    if (!guestId) {
      this.showToastMessage('Please select a guest first', 'error');
      return;
    }

    if (this.selectedRooms.length === 0) {
      this.showToastMessage('Please select at least one room', 'error');
      return;
    }

    this.submitting = true;

    const { checkinDate, checkoutDate, adults, children, specialRequests } =
      this.datesForm.value;
    const deposit = this.totalBatchAmount;

    // Ensure room IDs are numbers
    const roomIds = this.selectedRooms.map((r) => Number(r.id));

    console.log('DEBUG: Selected guest ID:', guestId);
    console.log('DEBUG: Selected rooms:', this.selectedRooms);
    console.log('DEBUG: Room IDs (as numbers):', roomIds);

    const booking: Booking = {
      checkinDate,
      checkoutDate,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      specialRequests: specialRequests || '',
      depositAmount: deposit,
      subTotal: this.roomSubtotal,
      total: this.grandTotal,
      balanceAmount: Math.max(0, this.grandTotal - deposit),
      status: 'CONFIRMED' as BookingStatus,
      guest: Number(guestId),
      rooms: roomIds,
      // payment will be created after booking is created
    };

    console.log(
      'DEBUG: Booking object before sending:',
      JSON.stringify(booking, null, 2),
    );

    this.hotelService.createBooking(booking).subscribe({
      next: (created) => {
        console.log(
          'DEBUG: Booking created response:',
          JSON.stringify(created, null, 2),
        );
        // Create line items for payments
        this.processPayments(created);
      },
      error: () => {
        this.submitting = false;
        this.showToastMessage('Failed to create booking', 'error');
      },
    });
  }

  private processPayments(booking: Booking): void {
    const bId = this.hotelService.getId(booking);
    if (!bId) {
      this.onBookingCreated(booking);
      return;
    }

    // Create payment records
    const paymentCalls = this.batchPayments.map((p) =>
      this.hotelService.createPayment({
        bookingId: bId,
        amountPaid: p.amount,
        method: p.method,
        status: 'COMPLETED',
        paidOn: this.hotelService.formatDate(new Date()),
        reference: p.reference || '',
        note: p.note || '',
      }),
    );

    if (paymentCalls.length === 0) {
      this.onBookingCreated(booking);
      return;
    }

    forkJoin(paymentCalls).subscribe({
      next: () => {
        this.hotelService
          .updateBooking(bId, { ...booking, status: 'CONFIRMED' })
          .subscribe({
            next: (confirmed) => this.onBookingCreated(confirmed),
            error: () => this.onBookingCreated(booking),
          });
      },
      error: (err: any) => {
        console.error('Error creating payments:', err);
        this.showToastMessage(
          'Booking created, but payment records failed',
          'error',
        );
        setTimeout(() => this.onBookingCreated(booking), 2000);
      },
    });
  }

  onBookingCreated(booking: any): void {
    this.submitting = false;
    const bId = this.hotelService.getId(booking);
    if (!bId) {
      this.showToastMessage(
        'Booking might not have been recorded correctly',
        'error',
      );
      return;
    }
    this.showToastMessage('Booking created successfully!', 'success');
    setTimeout(
      () => this.router.navigate(['/hospitality', this.uuid, 'bookings', bId]),
      1200,
    );
  }

  goBack(): void {
    this.router.navigate(['/hospitality', this.uuid, 'bookings']);
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }
}
