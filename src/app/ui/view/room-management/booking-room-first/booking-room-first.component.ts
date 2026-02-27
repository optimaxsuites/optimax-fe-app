import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  HotelserviceService,
  Guest,
  Room,
  RoomStatus,
  RoomTypeDTO,
  AdditionalService,
  Booking,
  BookingStatus,
  Payment,
  PaymentMethod,
} from '../../../hospitality/hotelservice.service';

interface ServiceItem {
  service: AdditionalService;
  quantity: number;
}

@Component({
  selector: 'app-booking-room-first',
  templateUrl: './booking-room-first.component.html',
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

  // Step 4 — Services + Payment
  additionalServices: AdditionalService[] = [];
  selectedServices: ServiceItem[] = [];
  paymentForm!: FormGroup;
  paymentMethods: { key: PaymentMethod; label: string; icon: string; color: string }[] = [
    { key: 'CASH', label: 'Cash', icon: 'fa-solid fa-money-bill-wave', color: 'border-green-500 bg-green-50 text-green-700' },
    { key: 'CARD', label: 'Card', icon: 'fa-solid fa-credit-card', color: 'border-blue-500 bg-blue-50 text-blue-700' },
    { key: 'TRANSFER', label: 'Transfer', icon: 'fa-solid fa-building-columns', color: 'border-purple-500 bg-purple-50 text-purple-700' },
  ];

  batchPayments: { method: PaymentMethod; amount: number; reference?: string; note?: string }[] = [];

  submitting = false;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  readonly statusConfig: Record<RoomStatus, { label: string; badge: string; ring: string; tile: string; selectable: boolean }> = {
    AVAILABLE:         { label: 'Available',    badge: 'bg-emerald-500 text-white',    ring: 'ring-emerald-400', tile: 'border-emerald-200 bg-emerald-50/60',   selectable: true  },
    OCCUPIED:          { label: 'Occupied',     badge: 'bg-red-500 text-white',        ring: 'ring-red-400',     tile: 'border-red-100 bg-red-50/40',           selectable: false },
    BOOKED:            { label: 'Booked',       badge: 'bg-amber-400 text-white',      ring: 'ring-amber-400',   tile: 'border-amber-100 bg-amber-50/40',       selectable: false },
    UNDER_MAINTENANCE: { label: 'Maintenance',  badge: 'bg-orange-500 text-white',     ring: 'ring-orange-400',  tile: 'border-orange-100 bg-orange-50/40',     selectable: false },
    CLEANING:          { label: 'Cleaning',     badge: 'bg-sky-500 text-white',        ring: 'ring-sky-400',     tile: 'border-sky-100 bg-sky-50/40',           selectable: false },
  };

  constructor(
    private hotelService: HotelserviceService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.countries = this.hotelService.getCountries();
    this.initForms();
    this.loadRooms();
    this.loadGuests();
    this.loadServices();
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

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
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

  loadRooms(): void {
    this.loading = true;
    console.log('DEBUG: BookingRoomFirst — calling getRooms()...');
    this.hotelService.getRooms().subscribe({
      next: (rooms) => {
        console.log('DEBUG: BookingRoomFirst — received rooms:', rooms?.length, rooms);
        // Sort: AVAILABLE first, then others
        this.allRooms = [...(rooms || [])].sort((a, b) => {
          if (a.roomStatus === 'AVAILABLE' && b.roomStatus !== 'AVAILABLE') return -1;
          if (a.roomStatus !== 'AVAILABLE' && b.roomStatus === 'AVAILABLE') return 1;
          return a.roomNumber - b.roomNumber;
        });
        this.applyRoomFilter();
        console.log('DEBUG: BookingRoomFirst — filteredRooms:', this.filteredRooms.length);
        this.loading = false;
      },
      error: (err) => {
        console.error('DEBUG: BookingRoomFirst — ERROR loading rooms:', err);
        this.showToastMessage('Failed to load rooms. Please refresh.', 'error');
        this.loading = false;
      },
    });
  }

  loadGuests(): void {
    this.hotelService.getGuests().subscribe({ next: (g) => { this.guests = g; this.filteredGuests = g; } });
  }

  loadServices(): void {
    this.hotelService.getAdditionalServices().subscribe({ next: (s) => (this.additionalServices = s) });
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

  selectGuest(g: Guest): void { this.selectedGuest = g; this.showNewGuestForm = false; }

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

  // Service helpers
  getServiceQty(service: AdditionalService): number {
    return this.selectedServices.find(s => s.service.id === service.id)?.quantity ?? 0;
  }

  adjustServiceQty(service: AdditionalService, delta: number): void {
    const idx = this.selectedServices.findIndex(s => s.service.id === service.id);
    if (idx >= 0) {
      this.selectedServices[idx].quantity += delta;
      if (this.selectedServices[idx].quantity <= 0) this.selectedServices.splice(idx, 1);
    } else if (delta > 0) {
      this.selectedServices.push({ service, quantity: 1 });
    }
  }

  // Totals
  get nights(): number {
    const { checkinDate, checkoutDate } = this.datesForm.value;
    return this.hotelService.calculateNights(checkinDate, checkoutDate) || 0;
  }
  get roomSubtotal(): number { return this.selectedRooms.reduce((s, r) => s + r.rate * (this.nights || 1), 0); }
  get serviceSubtotal(): number { return this.selectedServices.reduce((s, i) => s + i.service.price * i.quantity, 0); }
  get grandTotal(): number { return this.roomSubtotal + this.serviceSubtotal; }

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
    const deposit = this.totalBatchAmount;

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
    const checkinDate = this.datesForm.value.checkinDate;
    
    // 1. Create Services (BookingDetails)
    const detailCalls = this.selectedServices.map(item => 
      this.hotelService.createBookingDetail({
        totalPrice: item.service.price * item.quantity,
        dateUsed: checkinDate,
        notes: `x${item.quantity} ${item.service.name}`,
        booking: booking.id!,
        additionalService: item.service.id
      })
    );

    // 2. Create Payments
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

    const allCalls = [...detailCalls, ...paymentCalls];
    if (allCalls.length === 0) {
      this.onCreated(booking);
      return;
    }

    forkJoin(allCalls).subscribe({
      next: () => {
        const bId = this.hotelService.getId(booking);
        this.hotelService.updateBooking(bId, { ...booking, status: 'CONFIRMED' }).subscribe({
          next: (confirmed) => this.onCreated(confirmed),
          error: () => {
            this.showToastMessage('Details saved but failed to confirm booking', 'error');
            this.onCreated(booking);
          }
        });
      },
      error: (err: any) => {
        console.error('Error creating associated records:', err);
        this.showToastMessage('Booking created (Pending), but some details/payments failed', 'error');
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
    setTimeout(() => this.router.navigate(['/hospitality/bookings', bId]), 1200);
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
