import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  HotelserviceService,
  Booking,
  BookingStatus,
  Guest,
  Room,
  AdditionalDetail,
  ServiceCharge,
  Payment,
  PaymentMethod,
} from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-booking-detail',
  templateUrl: './booking-detail.component.html',
})
export class BookingDetailComponent implements OnInit {
  // ── Core Data ──────────────────────────────────────
  booking: Booking | null = null;
  groupBookings: Booking[] = [];       // All bookings for same guest (sidebar)
  payments: Payment[] = [];
  guest: Guest | null = null;
  rooms: Room[] = [];
  allRooms: Room[] = [];
  loading = false;
  uuid = '';

  // ── Status Modals ──────────────────────────────────
  showPaymentModal = false;
  showCancelModal = false;
  showRefundModal = false;
  showDiscountModal = false;
  paymentForm!: FormGroup;
  refundForm!: FormGroup;
  discountForm!: FormGroup;
  submittingPayment = false;
  submittingStatus = false;

  // ── Payment Methods ────────────────────────────────
  selectedMethod: PaymentMethod = 'CASH';
  paymentMethods: { key: PaymentMethod; label: string; icon: string; color: string }[] = [
    { key: 'CASH',     label: 'Cash',     icon: 'fa-solid fa-money-bill-wave',   color: 'border-green-500 bg-green-50 text-green-700' },
    { key: 'CARD',     label: 'Card',     icon: 'fa-solid fa-credit-card',        color: 'border-blue-500 bg-blue-50 text-blue-700' },
    { key: 'TRANSFER', label: 'Transfer', icon: 'fa-solid fa-building-columns',   color: 'border-purple-500 bg-purple-50 text-purple-700' },
    { key: 'POS',      label: 'POS',      icon: 'fa-solid fa-cash-register',      color: 'border-amber-500 bg-amber-50 text-amber-700' },
    { key: 'ONLINE',   label: 'Online',   icon: 'fa-solid fa-globe',              color: 'border-cyan-500 bg-cyan-50 text-cyan-700' },
  ];

  batchPayments: { method: PaymentMethod; amount: number; reference?: string; note?: string }[] = [];

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  // ── Services ───────────────────────────────────────
  availableServices: AdditionalDetail[] = [];
  appliedServices: ServiceCharge[] = [];
  showServiceSearch = false;           // hidden until "+ Add Service" clicked
  serviceSearchQuery = '';
  addingService = false;

  // ── Extend Stay ────────────────────────────────────
  extendNights: number | null = null;
  extendCustomDate = '';
  showExtendPreview = false;
  submittingExtend = false;

  // ── Notes (local cache only — no endpoint for notes) ──
  notes: { text: string; time: string }[] = [
    { text: 'Guest requested late check-in', time: 'On booking creation' },
  ];
  newNote = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public hotelService: HotelserviceService,
    private fb: FormBuilder,
  ) {}

  // HTML Helpers for User Design
  getSidebarStatusColorHtml(status: string): string {
    if (status === 'CHECKED_IN') return '#2EB270';
    if (status === 'CHECKED_OUT') return '#2E6276';
    if (status === 'CANCELLED') return '#ef4444'; // Red
    if (status === 'PENDING' || status === 'CONFIRMED') return '#1e3a8a'; // Blue
    return '#d1d5db';
  }

  getRoomTypeNameHtml(room: any): string {
    if (!room) return 'Selected Room';
    return this.getRoomTypeName(room.roomType);
  }

  ngOnInit(): void {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
      reference: [''],
      notes: [''],
    });
    this.refundForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
      reason: [''],
    });
    this.discountForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
      reason: [''],
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.uuid =
      this.route.snapshot.paramMap.get('uuid') ||
      this.route.parent?.snapshot.paramMap.get('uuid') || '';
    if (id) this.loadBooking(id);
  }

  // ══════════════════════════════════════════════════════
  //  LOADING
  // ══════════════════════════════════════════════════════

  loadBooking(id: number): void {
    this.loading = true;
    this.hotelService.getBooking(id).subscribe({
      next: (b) => {
        if (!b.guest || !b.rooms || b.rooms.length === 0) {
          this.hotelService.getBookings().subscribe({
            next: (list) => {
              const enriched = list.find((x) => String(this.hotelService.getId(x)) === String(id));
              if (enriched) {
                if (!b.guest) b.guest = enriched.guest;
                if (!b.rooms || b.rooms.length === 0) b.rooms = enriched.rooms;
              }
              this.finalizeBookingLoad(b);
            },
            error: () => this.finalizeBookingLoad(b),
          });
        } else {
          this.finalizeBookingLoad(b);
        }
      },
      error: () => {
        this.showToastMessage('Failed to load booking', 'error');
        this.loading = false;
      },
    });
  }

  private finalizeBookingLoad(b: Booking): void {
    this.booking = b;
    this.loading = false;
    this.loadRelated(b);
    this.loadServices();
    this.loadGroupBookings(b);
  }

  /** Load all bookings for same guest to populate the sidebar */
  private loadGroupBookings(b: Booking): void {
    this.hotelService.getBookings().subscribe({
      next: (all) => {
        const guestId = this.hotelService.getId(b.guest);
        if (!guestId) {
          this.groupBookings = [b];
          return;
        }
        const related = all.filter((bk) => {
          const bgId = this.hotelService.getId(bk.guest);
          return String(bgId) === String(guestId);
        });
        this.groupBookings = related.length > 0 ? related : [b];
      },
      error: () => {
        this.groupBookings = [b];
      },
    });
  }

  loadServices(): void {
    this.hotelService.getAdditionalDetails().subscribe({
      next: (svcs) => (this.availableServices = svcs),
    });
    if (this.booking?.rooms && this.booking.rooms.length > 0) {
      this.hotelService.getServiceCharges().subscribe({
        next: (charges) => {
          const roomIds = this.booking!.rooms.map((r) => this.hotelService.getId(r));
          this.appliedServices = charges.filter((c) =>
            roomIds.includes(this.hotelService.getId(c.room)),
          );
        },
      });
    }
  }

  loadRelated(booking: Booking): void {
    const bId = this.hotelService.getId(booking);
    if (bId) {
      this.hotelService.getPaymentsByBooking(bId).subscribe({
        next: (p) => (this.payments = p),
        error: (err) => console.error('Failed to fetch payments:', err),
      });
    }

    const guestData = booking.guest;
    if (guestData) {
      if (typeof guestData === 'object' && (guestData as Guest).firstName) {
        this.guest = guestData as Guest;
      } else {
        const guestId = Number(this.hotelService.getId(guestData));
        if (!isNaN(guestId) && guestId > 0) {
          this.hotelService.getGuest(guestId).subscribe({
            next: (g) => (this.guest = g),
          });
        }
      }
    }

    if (booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0) {
      this.hotelService.getRooms().subscribe({
        next: (allRooms) => {
          this.allRooms = allRooms;
          const bookingRoomIds = booking.rooms.map((rOrId) =>
            String(this.hotelService.getId(rOrId)),
          );
          this.rooms = allRooms.filter((r) => {
            const rId = String(this.hotelService.getId(r));
            const rNum = String(r.roomNumber);
            return bookingRoomIds.includes(rId) || bookingRoomIds.includes(rNum);
          });
        },
      });
    }
  }

  /** Switch active booking (sidebar card click) */
  switchBooking(b: Booking): void {
    this.booking = b;
    this.rooms = [];
    this.guest = null;
    this.payments = [];
    this.appliedServices = [];
    this.showServiceSearch = false;
    this.serviceSearchQuery = '';
    this.extendNights = null;
    this.extendCustomDate = '';
    this.showExtendPreview = false;
    this.loadRelated(b);
    this.loadServices();
  }

  // ══════════════════════════════════════════════════════
  //  SERVICES
  // ══════════════════════════════════════════════════════

  get filteredAvailableServices(): AdditionalDetail[] {
    const q = this.serviceSearchQuery.toLowerCase().trim();
    if (!q) return this.availableServices;
    return this.availableServices.filter((s) => s.name.toLowerCase().includes(q));
  }

  addService(svc: AdditionalDetail): void {
    if (!this.booking?.rooms || this.booking.rooms.length === 0) {
      this.showToastMessage('No rooms assigned to add services to', 'error');
      return;
    }
    const firstRoomId = this.hotelService.getId(this.booking.rooms[0]);
    const today = this.hotelService.formatDate(new Date());
    const charge: ServiceCharge = {
      description: svc.name,
      amount: svc.price,
      applicableFrom: today,
      applicableTo: today,
      room: firstRoomId,
    };
    this.addingService = true;
    this.hotelService.createServiceCharge(charge).subscribe({
      next: (created) => {
        this.appliedServices.push(created);
        this.addingService = false;
        this.showToastMessage(`${svc.name} added`, 'success');
        this.serviceSearchQuery = '';
        this.showServiceSearch = false;
      },
      error: () => {
        this.addingService = false;
        this.showToastMessage('Failed to add service', 'error');
      },
    });
  }

  removeService(charge: ServiceCharge): void {
    if (!charge.id || this.isServicePaid(charge)) return;
    this.hotelService.deleteServiceCharge(charge.id).subscribe({
      next: () => {
        this.appliedServices = this.appliedServices.filter((s) => s.id !== charge.id);
        this.showToastMessage('Service removed', 'success');
      },
      error: () => this.showToastMessage('Failed to remove service', 'error'),
    });
  }

  isServicePaid(charge: ServiceCharge): boolean {
    return this.payments.some(
      (p) => p.amountPaid === charge.amount && (p.note?.includes(charge.description) || false),
    );
  }

  getServiceIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('laundry')) return 'fa-shirt';
    if (n.includes('food') || n.includes('meal') || n.includes('breakfast') || n.includes('lunch') || n.includes('dinner')) return 'fa-utensils';
    if (n.includes('spa') || n.includes('massage')) return 'fa-spa';
    if (n.includes('transport') || n.includes('taxi')) return 'fa-car';
    if (n.includes('wifi') || n.includes('internet')) return 'fa-wifi';
    if (n.includes('gym')) return 'fa-dumbbell';
    if (n.includes('bar') || n.includes('drink')) return 'fa-martini-glass';
    return 'fa-concierge-bell';
  }

  // ══════════════════════════════════════════════════════
  //  EXTEND STAY
  // ══════════════════════════════════════════════════════

  setExtendNights(n: number): void {
    this.extendNights = n;
    this.extendCustomDate = '';
    this.showExtendPreview = true;
  }

  onCustomDateChange(): void {
    this.extendNights = null;
    this.showExtendPreview = !!this.extendCustomDate;
  }

  get extendedCheckoutDate(): string {
    if (!this.booking) return '';
    const base = new Date(this.booking.checkoutDate);
    if (isNaN(base.getTime())) return '';
    if (this.extendCustomDate) return this.extendCustomDate;
    if (this.extendNights) {
      const d = new Date(base);
      d.setDate(d.getDate() + this.extendNights);
      return this.hotelService.formatDate(d);
    }
    return '';
  }

  get additionalNights(): number {
    if (!this.booking) return 0;
    const newCheckout = this.extendedCheckoutDate;
    if (!newCheckout) return 0;
    return this.hotelService.calculateNights(this.booking.checkoutDate, newCheckout);
  }

  get extensionCost(): number {
    if (!this.rooms.length || !this.additionalNights) return 0;
    const ratePerNight = this.rooms[0]?.rate || 0;
    return ratePerNight * this.additionalNights;
  }

  get newTotal(): number {
    if (!this.booking) return 0;
    return this.booking.total + this.extensionCost;
  }

  applyExtension(): void {
    if (!this.booking?.id || !this.extendedCheckoutDate) return;
    this.submittingExtend = true;
    const updated: Booking = {
      ...this.booking,
      checkoutDate: this.extendedCheckoutDate,
      total: this.newTotal,
      subTotal: (this.booking.subTotal || 0) + this.extensionCost,
      balanceAmount: Math.max(0, this.newTotal - this.totalPaid),
    };
    this.hotelService.updateBooking(this.booking.id, updated).subscribe({
      next: (b) => {
        this.booking = b;
        this.extendNights = null;
        this.extendCustomDate = '';
        this.showExtendPreview = false;
        this.submittingExtend = false;
        // Refresh sidebar
        this.loadGroupBookings(b);
        this.showToastMessage('Stay extended successfully!', 'success');
      },
      error: () => {
        this.submittingExtend = false;
        this.showToastMessage('Failed to extend stay', 'error');
      },
    });
  }

  // ══════════════════════════════════════════════════════
  //  PAYMENT SUMMARY
  // ══════════════════════════════════════════════════════

  get serviceChargesTotal(): number {
    return this.appliedServices.reduce((sum, s) => sum + (s.amount || 0), 0);
  }

  get grandTotal(): number {
    if (!this.booking) return 0;
    return (this.booking.subTotal || 0) + (this.booking.taxes || 0) + this.serviceChargesTotal;
  }

  get totalPaid(): number {
    return this.payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  }

  get balanceDue(): number {
    return Math.max(0, this.grandTotal - this.totalPaid);
  }

  get changeAmount(): number {
    const totalBatch = this.batchPayments.reduce((s, p) => s + p.amount, 0);
    const tenderedInInput = this.paymentForm?.value?.amount || 0;
    const totalTendered = totalBatch + tenderedInInput;
    return Math.max(0, totalTendered - this.balanceDue);
  }

  get remainingBalance(): number {
    const totalBatch = this.batchPayments.reduce((s, p) => s + p.amount, 0);
    return Math.max(0, this.balanceDue - totalBatch);
  }

  // ══════════════════════════════════════════════════════
  //  PAYMENT ACTIONS
  // ══════════════════════════════════════════════════════

  addToBatch(): void {
    const amount = this.paymentForm.value.amount;
    if (amount <= 0) return;
    this.batchPayments.push({
      method: this.selectedMethod,
      amount,
      reference: this.paymentForm.value.reference,
      note: this.paymentForm.value.notes,
    });
    this.paymentForm.patchValue({ amount: 0 });
  }

  removeFromBatch(index: number): void {
    this.batchPayments.splice(index, 1);
  }

  submitBatchPayments(): void {
    if (!this.booking?.id) return;
    if (this.batchPayments.length === 0 && this.paymentForm.value.amount > 0) {
      this.addPayment();
      return;
    }
    if (this.batchPayments.length === 0) return;
    this.submittingPayment = true;
    const processNext = (index: number) => {
      if (index >= this.batchPayments.length) { this.finishBatch(); return; }
      const p = this.batchPayments[index];
      const payment: Payment = {
        bookingId: this.booking!.id!,
        amountPaid: p.amount,
        method: p.method,
        status: 'COMPLETED',
        paidOn: this.hotelService.formatDate(new Date()),
        reference: p.reference || '',
        note: p.note || '',
      };
      this.hotelService.createPayment(payment).subscribe({
        next: () => processNext(index + 1),
        error: () => { this.showToastMessage('Some payments failed', 'error'); this.finishBatch(); },
      });
    };
    processNext(0);
  }

  private finishBatch(): void {
    this.batchPayments = [];
    this.showPaymentModal = false;
    this.paymentForm.reset({ amount: 0, reference: '', notes: '' });
    this.selectedMethod = 'CASH';
    this.submittingPayment = false;
    if (this.booking?.id) {
      this.loadBooking(this.booking.id);
      this.hotelService.refreshPaymentsCache();
    }
    this.showToastMessage('Payments recorded successfully', 'success');
  }

  addPayment(): void {
    if (!this.booking?.id || this.paymentForm.invalid) return;
    this.submittingPayment = true;
    const payment: Payment = {
      bookingId: this.booking.id,
      amountPaid: this.paymentForm.value.amount,
      method: this.selectedMethod,
      status: 'COMPLETED',
      paidOn: this.hotelService.formatDate(new Date()),
      reference: this.paymentForm.value.reference || '',
      note: this.paymentForm.value.notes || '',
    };
    this.hotelService.createPayment(payment).subscribe({
      next: (p) => {
        this.payments.push(p);
        this.showPaymentModal = false;
        this.paymentForm.reset({ amount: 0, reference: '', notes: '' });
        this.selectedMethod = 'CASH';
        this.submittingPayment = false;
        this.hotelService.refreshPaymentsCache();
        this.showToastMessage('Payment recorded', 'success');
      },
      error: () => {
        this.submittingPayment = false;
        this.showToastMessage('Failed to record payment', 'error');
      },
    });
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod = method;
  }

  submitRefund(): void {
    if (!this.booking?.id || this.refundForm.invalid) return;
    const payment: Payment = {
      bookingId: this.booking.id,
      amountPaid: -Math.abs(this.refundForm.value.amount),
      method: this.selectedMethod,
      status: 'REFUNDED',
      paidOn: this.hotelService.formatDate(new Date()),
      note: this.refundForm.value.reason || 'Refund',
    };
    this.hotelService.createPayment(payment).subscribe({
      next: (p) => {
        this.payments.push(p);
        this.showRefundModal = false;
        this.refundForm.reset();
        this.hotelService.refreshPaymentsCache();
        this.showToastMessage('Refund recorded', 'success');
      },
      error: () => this.showToastMessage('Failed to record refund', 'error'),
    });
  }

  applyDiscount(): void {
    if (!this.booking?.id || this.discountForm.invalid) return;
    const discountAmount = Math.abs(this.discountForm.value.amount);
    const updated: Booking = {
      ...this.booking,
      total: Math.max(0, (this.booking.total || 0) - discountAmount),
      subTotal: Math.max(0, (this.booking.subTotal || 0) - discountAmount),
      balanceAmount: Math.max(0, this.balanceDue - discountAmount),
    };
    this.hotelService.updateBooking(this.booking.id, updated).subscribe({
      next: (b) => {
        this.booking = b;
        this.showDiscountModal = false;
        this.discountForm.reset();
        this.showToastMessage('Discount applied', 'success');
      },
      error: () => this.showToastMessage('Failed to apply discount', 'error'),
    });
  }

  // ══════════════════════════════════════════════════════
  //  STATUS
  // ══════════════════════════════════════════════════════

  get isPending(): boolean { return this.booking?.status === 'CONFIRMED'; }
  get isCheckedIn(): boolean { return this.booking?.status === 'CHECKED_IN'; }
  get isCheckedOut(): boolean { return this.booking?.status === 'CHECKED_OUT'; }
  get isCancelled(): boolean { return this.booking?.status === 'CANCELLED'; }

  updateStatus(newStatus: BookingStatus): void {
    if (!this.booking?.id) return;
    this.submittingStatus = true;
    const updated = { ...this.booking, status: newStatus };
    this.hotelService.updateBooking(this.booking.id, updated).subscribe({
      next: (b) => {
        this.booking = b;
        this.loadGroupBookings(b);
        this.submittingStatus = false;
        this.showCancelModal = false;
        if (newStatus === 'CHECKED_OUT') {
          this.createHousekeepingOnCheckout();
          this.showToastMessage('Guest checked out! Housekeeping task created.', 'success');
        } else if (newStatus === 'CHECKED_IN') {
          this.showToastMessage('Guest checked in!', 'success');
        } else {
          this.showToastMessage('Booking updated', 'success');
        }
      },
      error: () => {
        this.submittingStatus = false;
        this.showToastMessage('Action failed', 'error');
      },
    });
  }

  private createHousekeepingOnCheckout(): void {
    if (!this.booking) return;
    const today = this.hotelService.formatDate(new Date());
    for (const roomId of this.booking.rooms) {
      const room = this.rooms.find((r) => r.id === roomId);
      if (room) {
        this.hotelService.updateRoom(room.id, { ...room, roomStatus: 'CLEANING' as const }).subscribe();
      }
      this.hotelService.createMaintenanceRequest({
        tasks: 'CLEANING_REQUIRED', reasons: ['Guest checkout'],
        startDate: today, notes: `Auto-created on checkout of booking #${this.booking.id}`,
        completed: false, priority: 'HIGH', dueDate: today, completedAt: '', room: roomId,
      } as any).subscribe();
      this.hotelService.createHousekeepingRecord({
        status: 'PENDING', lastCleaned: today,
        notes: `Checkout cleaning for booking #${this.booking.id}`, room: roomId,
      }).subscribe();
    }
    this.hotelService.refreshRoomsCache();
  }

  // ══════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════

  getNights(checkin?: string, checkout?: string): number {
    return this.hotelService.calculateNights(
      checkin || this.booking?.checkinDate,
      checkout || this.booking?.checkoutDate,
    );
  }

  getRoomNumber(roomId: number): string {
    const room = this.rooms.find((r) => this.hotelService.getId(r) === roomId);
    return room ? String(room.roomNumber) : String(roomId);
  }

  getRoomTypeName(roomTypeId: number): string {
    return this.hotelService.getRoomTypeNameById(roomTypeId);
  }

  getRoomId(room: any): any {
    return this.hotelService.getId(room);
  }

  getStatusColor(status: BookingStatus | undefined): string {
    if (!status) return 'bg-gray-300 text-white';
    const map: Record<string, string> = {
      CONFIRMED:   'bg-amber-500 text-white',
      CANCELLED:   'bg-red-500 text-white',
      CHECKED_IN:  'bg-customGreen text-white',
      CHECKED_OUT: 'bg-gray-500 text-white',
      NO_SHOW:     'bg-orange-500 text-white',
    };
    return map[status] ?? 'bg-gray-300 text-white';
  }

  getStatusLabel(status: BookingStatus | undefined): string {
    if (!status) return 'Unknown';
    const map: Record<string, string> = {
      CONFIRMED:   'Pending',
      CANCELLED:   'Cancelled',
      CHECKED_IN:  'Checked In',
      CHECKED_OUT: 'Checked Out',
      NO_SHOW:     'No Show',
    };
    return map[status] ?? status;
  }

  getSidebarStatusColor(status: BookingStatus): string {
    const map: Record<string, string> = {
      CONFIRMED:   'bg-amber-100 text-amber-700',
      CANCELLED:   'bg-red-100 text-red-600',
      CHECKED_IN:  'bg-green-100 text-green-700',
      CHECKED_OUT: 'bg-gray-200 text-gray-600',
      NO_SHOW:     'bg-orange-100 text-orange-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }

  getMethodStyle(method: string): string {
    const map: Record<string, string> = {
      CASH:     'bg-green-100 text-green-700',
      CARD:     'bg-blue-100 text-blue-700',
      TRANSFER: 'bg-purple-100 text-purple-700',
      POS:      'bg-amber-100 text-amber-700',
      ONLINE:   'bg-cyan-100 text-cyan-700',
    };
    return map[method] || 'bg-gray-100 text-gray-600';
  }

  getPaymentStatusColor(status: string): string {
    if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-600';
    if (status === 'FAILED') return 'bg-red-100 text-red-600';
    if (status === 'REFUNDED') return 'bg-yellow-100 text-yellow-600';
    return 'bg-gray-100 text-gray-600';
  }

  addNote(): void {
    if (!this.newNote.trim()) return;
    const now = new Date();
    this.notes.push({
      text: this.newNote.trim(),
      time: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' +
            now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    });
    this.newNote = '';
  }

  goBack(): void {
    this.router.navigate(['/hospitality/bookings', this.uuid]);
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }

  navigateToRoomFirst(): void {
    this.router.navigate(['/hospitality/bookings/room-select', this.uuid]);
  }
}
