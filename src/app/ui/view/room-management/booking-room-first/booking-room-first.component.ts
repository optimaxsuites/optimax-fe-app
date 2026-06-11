import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  HotelserviceService,
  Guest,
  Room,
  RoomStatus,
  RoomTypeDTO,
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
  selector: 'app-booking-room-first',
  templateUrl: './booking-room-first.component.html',
  styles: [`
    :host ::ng-deep .p-calendar { width: 100%; display: flex; }
    :host ::ng-deep .p-inputtext { 
        flex: 1;
        width: 100%; 
    }
    :host ::ng-deep .p-datepicker { 
        font-family: inherit; 
        border-radius: 1rem !important; 
        border: 1px solid #e5e7eb !important; 
        padding: 1rem !important;
    }
    :host ::ng-deep .p-calendar .p-button-icon { font-size: 0.75rem; }
  `],
})
export class BookingRoomFirstComponent implements OnInit {
  step = 1; // 1=Rooms, 2=Guest, 3=Dates & Details, 4=Services & Pay

  // Step 1 — Rooms
  allRooms: Room[] = [];
  filteredRooms: Room[] = [];
  roomTypes: RoomTypeDTO[] = [];
  selectedRooms: Room[] = [];
  loading = false;
  filterRoomType = '';
  filterFloor = '';

  // Step 2 — Guest
  guests: Guest[] = [];
  filteredGuests: Guest[] = [];
  selectedGuest: Guest | null = null;
  guestSearchQuery = '';
  showNewGuestForm = false;
  guestForm!: FormGroup;
  titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
  genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  countries: string[] = [];

  // Step 3 — Dates & Details
  datesForm!: FormGroup;

  paymentForm!: FormGroup;
  paymentMethods: { key: PaymentMethod; label: string; icon: string; color: string }[] = [
    { key: 'CASH', label: 'Cash', icon: 'fa-solid fa-money-bill-wave', color: 'border-green-500 bg-green-50 text-green-700' },
    { key: 'CARD', label: 'Card', icon: 'fa-solid fa-credit-card', color: 'border-blue-500 bg-blue-50 text-blue-700' },
    { key: 'TRANSFER', label: 'Transfer', icon: 'fa-solid fa-building-columns', color: 'border-purple-500 bg-purple-50 text-purple-700' },
  ];

  batchPayments: { method: PaymentMethod; amount: number; reference?: string; note?: string }[] = [];

  submitting = false;
  uuid = '';
  isGuestSkipped = false;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  readonly statusConfig: Record<RoomStatus, { label: string; badge: string; ring: string; tile: string; selectable: boolean }> = {
    AVAILABLE:         { label: 'Available',    badge: 'bg-emerald-500 text-white',    ring: '', tile: 'border-emerald-100 bg-white',        selectable: true  },
    OCCUPIED:          { label: 'Occupied',     badge: 'bg-red-500 text-white',        ring: '', tile: 'border-red-100 bg-gray-50',          selectable: false },
    BOOKED:            { label: 'Booked',       badge: 'bg-amber-400 text-white',      ring: '', tile: 'border-amber-100 bg-gray-50',        selectable: false },
    UNDER_MAINTENANCE: { label: 'Maintenance',  badge: 'bg-orange-500 text-white',     ring: '', tile: 'border-orange-100 bg-gray-50',       selectable: false },
    CLEANING:          { label: 'Cleaning',     badge: 'bg-sky-500 text-white',        ring: '', tile: 'border-sky-100 bg-gray-50',          selectable: false },
  };

  constructor(
    private hotelService: HotelserviceService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 
                this.route.parent?.snapshot.paramMap.get('uuid') || '';
    this.countries = this.hotelService.getCountries();
    this.initForms();
    this.loadRooms();
    this.loadGuests();
    this.hotelService.getRoomTypes().subscribe(rt => (this.roomTypes = rt));
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

    // Default dates as Date objects for p-calendar
    const today = new Date();
    const tomorrow = new Date(Date.now() + 86400000);
    this.datesForm = this.fb.group({
      checkinDate: [today, Validators.required],
      checkoutDate: [tomorrow, Validators.required],
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.required, Validators.min(0)]],
      specialRequests: [''],
    });

    // Subscribe to date changes for automatic room reloading
    this.datesForm.valueChanges.subscribe(() => {
      this.onDatesChange();
    });

    this.paymentForm = this.fb.group({
      paymentMethod: ['CASH', Validators.required],
      depositAmount: [0, [Validators.required, Validators.min(0)]],
      reference: [''],
      notes: [''],
    });
  }

  onDatesChange(): void {
    const { checkinDate, checkoutDate } = this.datesForm.value;
    if (checkinDate && checkoutDate) {
      // If we are in step 1, clear selection as availability changed
      if (this.step === 1) {
        this.selectedRooms = []; 
      }
      this.loadRooms();
      
      // Auto-update deposit amount in Step 3 if it hasn't been manually adjusted much?
      // For now, always update it to match the new total if we are in Step 3
      if (this.step === 3 && this.batchPayments.length === 0) {
        this.paymentForm.patchValue({ depositAmount: this.grandTotal });
      }
    }
  }

  loadRooms(): void {
    this.loading = true;
    let { checkinDate, checkoutDate } = this.datesForm.value;
    
    // Ensure we have strings for the API
    const start = typeof checkinDate === 'string' ? checkinDate : this.hotelService.formatDate(checkinDate);
    const end = typeof checkoutDate === 'string' ? checkoutDate : this.hotelService.formatDate(checkoutDate);

    console.log(`DEBUG: BookingRoomFirst — fetching available rooms for ${start} to ${end}`);
    
    this.hotelService.getRoomsAvailable(start, end).subscribe({
      next: (rooms) => {
        console.log('DEBUG: BookingRoomFirst — received available rooms:', rooms?.length);
        this.allRooms = (rooms || []).sort((a, b) => a.roomNumber - b.roomNumber);
        this.applyRoomFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('DEBUG: BookingRoomFirst — ERROR loading available rooms:', err);
        this.hotelService.getRooms().subscribe({
          next: (all) => {
            this.allRooms = (all || []).sort((a, b) => a.roomNumber - b.roomNumber);
            this.applyRoomFilter();
            this.loading = false;
          },
          error: () => {
            this.showToastMessage('Failed to load rooms. Please refresh.', 'error');
            this.loading = false;
          }
        });
      },
    });
  }

  loadGuests(): void {
    this.hotelService.getGuests().subscribe({ next: (g) => { this.guests = g; this.filteredGuests = g; } });
  }


  applyRoomFilter(): void {
    this.filteredRooms = this.allRooms.filter(r => {
      const rTypeId = r.roomType == null ? null : (typeof r.roomType === 'object' ? (r.roomType as any).id : r.roomType);
      const matchType = !this.filterRoomType || (rTypeId != null && String(rTypeId) == String(this.filterRoomType));
      const matchFloor = !this.filterFloor || String(r.floor) == String(this.filterFloor);
      return matchType && matchFloor;
    });
  }

  get uniqueFloors(): number[] {
    return [...new Set(this.allRooms.map(r => r.floor))].sort((a, b) => a - b);
  }

  getRoomTypeName(id: any): string {
    if (id == null) return 'No Type';
    const typeId = typeof id === 'object' ? (id.id || id.bookingId || id.idBooking) : id;
    if (typeId == null) return 'Unknown Type';

    const rt = this.roomTypes.find(t => String(t.id) == String(typeId));
    return rt ? rt.name : `Type #${typeId}`;
  }

  cfg(status: RoomStatus) { return this.statusConfig[status] ?? this.statusConfig['AVAILABLE']; }

  toggleRoom(room: Room): void {
    if (!this.cfg(room.roomStatus).selectable) return;
    const idx = this.selectedRooms.findIndex(r => r.id === room.id);
    idx >= 0 ? this.selectedRooms.splice(idx, 1) : this.selectedRooms.push(room);
  }

  isSelected(room: Room): boolean { return this.selectedRooms.some(r => r.id === room.id); }

  getSelectedRoomNumbers(): string {
    return this.selectedRooms.map(r => '#' + r.roomNumber).join(', ');
  }

  // Guest step
  filterGuests(): void {
    const q = this.guestSearchQuery.toLowerCase();
    this.filteredGuests = this.guests.filter(g =>
      g.firstName.toLowerCase().includes(q) ||
      g.lastName.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q)
    );
  }

  selectGuest(g: Guest): void { 
    this.selectedGuest = g; 
    this.showNewGuestForm = false; 
    this.isGuestSkipped = false;
  }

  skipGuest(): void {
    this.selectedGuest = null;
    this.isGuestSkipped = true;
    this.goToStep(3);
    this.showToastMessage('Guest info skipped (Walk-in)', 'success');
  }

  createAndSelectGuest(): void {
    if (this.guestForm.invalid) return;
    this.hotelService.createGuest(this.guestForm.value).subscribe({
      next: (created) => {
        const id = this.hotelService.getId(created);
        this.selectedGuest = { ...created, id };
        this.guests.push(this.selectedGuest);
        this.filteredGuests = [...this.guests];
        this.showToastMessage('Guest created', 'success');
      },
      error: () => this.showToastMessage('Failed to create guest', 'error'),
    });
  }


  // Totals
  get nights(): number {
    const { checkinDate, checkoutDate } = this.datesForm.value;
    const start = typeof checkinDate === 'string' ? checkinDate : this.hotelService.formatDate(checkinDate);
    const end = typeof checkoutDate === 'string' ? checkoutDate : this.hotelService.formatDate(checkoutDate);
    return this.hotelService.calculateNights(start, end) || 0;
  }
  get roomSubtotal(): number { return this.selectedRooms.reduce((s, r) => s + r.rate * (this.nights || 1), 0); }
  get grandTotal(): number { return this.roomSubtotal; }

  goToStep(n: number): void {
    this.step = n;
    if (this.step === 3) {
      this.paymentForm.patchValue({ depositAmount: this.grandTotal });
    }
  }

  get changeDue(): number {
    const overpaid = this.totalBatchAmount - this.grandTotal;
    return overpaid > 0 ? overpaid : 0;
  }

  get balanceDue(): number {
    return Math.max(0, this.grandTotal - this.totalBatchAmount);
  }

  // Submit
  submitBooking(): void {
    const guestId = this.hotelService.getId(this.selectedGuest);
    if (!guestId) {
      this.showToastMessage('Please select a guest first', 'error');
      return;
    }
    this.submitting = true;
    const { checkinDate, checkoutDate, adults, children, specialRequests } = this.datesForm.value;
    const start = typeof checkinDate === 'string' ? checkinDate : this.hotelService.formatDate(checkinDate);
    const end = typeof checkoutDate === 'string' ? checkoutDate : this.hotelService.formatDate(checkoutDate);
    const deposit = this.totalBatchAmount;

    const booking: Booking = {
      checkinDate: start,
      checkoutDate: end,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      specialRequests: specialRequests || '',
      depositAmount: deposit,
      subTotal: this.roomSubtotal,
      total: this.grandTotal,
      balanceAmount: Math.max(0, this.grandTotal - deposit),
      status: 'CONFIRMED' as BookingStatus,
      guest: Number(guestId),
      rooms: this.selectedRooms.map(r => r.id),
    };

    console.log('DEBUG: Booking payload:', JSON.stringify(booking));

    this.hotelService.createBooking(booking).subscribe({
      next: (created) => {
        this.processDetailsAndPayments(created);
      },
      error: () => { this.submitting = false; this.showToastMessage('Failed to create booking', 'error'); },
    });
  }

  private processDetailsAndPayments(booking: Booking): void {
    const paymentCalls = this.batchPayments.map(p => 
      this.hotelService.createPayment({
        bookingId: booking.id!,
        amountPaid: p.amount,
        method: p.method,
        status: 'COMPLETED',
        paidOn: this.hotelService.formatDate(new Date()),
        reference: p.reference || '',
        note: p.note || ''
      })
    );

    if (paymentCalls.length === 0) {
      this.onCreated(booking);
      return;
    }

    forkJoin(paymentCalls).subscribe({
      next: () => {
        const bId = this.hotelService.getId(booking);
        this.hotelService.updateBooking(bId, { ...booking, status: 'CONFIRMED' }).subscribe({
          next: (confirmed) => this.onCreated(confirmed),
          error: () => this.onCreated(booking)
        });
      },
      error: (err: any) => {
        console.error('Error creating payments:', err);
        this.showToastMessage('Booking created, but payments failed', 'error');
        setTimeout(() => this.onCreated(booking), 2000);
      }
    });
  }

  onCreated(b: any): void {
    this.submitting = false;
    const bId = this.hotelService.getId(b);
    if (!bId) {
      this.showToastMessage('Booking might not have been recorded correctly', 'error');
      return;
    }
    this.showToastMessage('Booking created successfully!', 'success');
    setTimeout(() => this.router.navigate(['user/hospitality/bookings', bId, this.uuid]), 1200);
  }

  addToBatch(): void {
    const amount = this.paymentForm.get('depositAmount')?.value || 0;
    const method = this.paymentForm.get('paymentMethod')?.value;
    if (amount <= 0 || !method) return;

    this.batchPayments.push({
      method,
      amount,
      reference: this.paymentForm.get('reference')?.value,
      note: this.paymentForm.get('notes')?.value
    });

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

  goBack(): void {
    this.router.navigate(['user/hospitality/bookings', this.uuid]);
  }

  showToastMessage(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg; this.toastType = type; this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }

  // Summary counts for legend
  get availableCount(): number { return this.allRooms.filter(r => r.roomStatus === 'AVAILABLE').length; }
  get occupiedCount(): number { return this.allRooms.filter(r => r.roomStatus === 'OCCUPIED').length; }
  get bookedCount(): number { return this.allRooms.filter(r => r.roomStatus === 'BOOKED').length; }
  get maintenanceCount(): number { return this.allRooms.filter(r => r.roomStatus === 'UNDER_MAINTENANCE').length; }
  get cleaningCount(): number { return this.allRooms.filter(r => r.roomStatus === 'CLEANING').length; }
}
