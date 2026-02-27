import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  HotelserviceService,
  Booking,
  BookingDetail,
  BookingStatus,
  Guest,
  Room,
  Payment,
  PaymentMethod,
} from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-booking-detail',
  templateUrl: './booking-detail.component.html',
})
export class BookingDetailComponent implements OnInit {
  booking: Booking | null = null;
  bookingDetails: BookingDetail[] = [];
  payments: Payment[] = [];
  guest: Guest | null = null;
  rooms: Room[] = [];
  loading = false;

  showPaymentModal = false;
  showCancelModal = false;
  paymentForm!: FormGroup;
  submittingPayment = false;
  submittingStatus = false;

  // Multi-payment: visual method selection
  selectedMethod: PaymentMethod = 'CASH';
  paymentMethods: { key: PaymentMethod; label: string; icon: string; color: string }[] = [
    { key: 'CASH', label: 'Cash', icon: 'fa-solid fa-money-bill-wave', color: 'border-green-500 bg-green-50 text-green-700' },
    { key: 'CARD', label: 'Card', icon: 'fa-solid fa-credit-card', color: 'border-blue-500 bg-blue-50 text-blue-700' },
    { key: 'TRANSFER', label: 'Transfer', icon: 'fa-solid fa-building-columns', color: 'border-purple-500 bg-purple-50 text-purple-700' },
    { key: 'POS', label: 'POS', icon: 'fa-solid fa-cash-register', color: 'border-amber-500 bg-amber-50 text-amber-700' },
    { key: 'ONLINE', label: 'Online', icon: 'fa-solid fa-globe', color: 'border-cyan-500 bg-cyan-50 text-cyan-700' },
  ];

  // Multi-payment / POS-style: local queue
  batchPayments: { method: PaymentMethod; amount: number; reference?: string; note?: string }[] = [];
  
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelserviceService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
      reference: [''],
      notes: [''],
    });
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.loadBooking(id);
  }

  loadBooking(id: number): void {
    this.loading = true;
    
    this.hotelService.getBooking(id).subscribe({
      next: (b) => {
        console.log('DEBUG: Fetched Booking:', JSON.stringify(b));

        // IF guest or rooms are missing, try enrichment
        if (b.guest === null || !b.rooms || b.rooms.length === 0) {
          console.warn('DEBUG: Incomplete booking data, attempting enrichment from list...');
          this.hotelService.getBookings().subscribe({
            next: (list) => {
              const enriched = list.find(x => String(this.hotelService.getId(x)) === String(id));
              if (enriched) {
                console.log('DEBUG: Enriched from list:', JSON.stringify(enriched));
                if (b.guest === null) b.guest = enriched.guest;
                if (!b.rooms || b.rooms.length === 0) b.rooms = enriched.rooms;
              }
              this.finalizeBookingLoad(b);
            },
            error: () => this.finalizeBookingLoad(b)
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
    console.log('DEBUG: Final Booking Data:', JSON.stringify(b));
    this.booking = b;
    this.loading = false;
    this.loadRelated(b);
  }

  loadRelated(booking: Booking): void {
    const bId = this.hotelService.getId(booking);
    console.log('DEBUG: loadRelated — booking:', JSON.stringify(booking), 'bId:', bId);

    if (bId) {
      this.hotelService.getBookingDetails(bId).subscribe({
        next: (d) => (this.bookingDetails = d),
        error: (err) => console.error('DEBUG: Failed to fetch booking details:', err),
      });
      this.hotelService.getPaymentsByBooking(bId).subscribe({
        next: (p) => (this.payments = p),
        error: (err) => console.error('DEBUG: Failed to fetch payments:', err),
      });
    }
    
    // Guest — fetch from API or extract nested object
    const guestData = booking.guest;
    if (guestData != null) {
      // Special check: is it already a full Guest object embedded?
      if (typeof guestData === 'object' && (guestData as Guest).firstName) {
        this.guest = guestData as Guest;
      } else {
        const guestId = this.hotelService.getId(guestData);
        if (guestId) {
          this.hotelService.getGuest(Number(guestId)).subscribe({
            next: (g) => {
              this.guest = g;
              console.log('DEBUG: loadRelated — fetched guest:', JSON.stringify(g));
            },
            error: (err) => console.error('DEBUG: Failed to fetch guest by id', guestId, err),
          });
        }
      }
    }
    
    // Rooms — resolve IDs or full objects
    if (booking.rooms && booking.rooms.length) {
      this.hotelService.getRooms().subscribe({
        next: (allRooms) => {
          const roomIds = booking.rooms.map(rOrId => String(this.hotelService.getId(rOrId)));
          this.rooms = allRooms.filter((r) => roomIds.includes(String(this.hotelService.getId(r))));
          console.log('DEBUG: loadRelated — matched rooms:', this.rooms.length);
        },
        error: (err) => console.error('DEBUG: Failed to fetch rooms list for matching:', err),
      });
    }
  }

  get totalPaid(): number {
    return this.payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  }

  get balanceDue(): number {
    if (!this.booking) return 0;
    return Math.max(0, this.booking.total - this.totalPaid);
  }

  get changeAmount(): number {
    const totalBatch = this.batchPayments.reduce((s, p) => s + p.amount, 0);
    const tenderedInInput = this.paymentForm?.value?.amount || 0;
    const totalTendered = totalBatch + tenderedInInput;
    const remaining = this.balanceDue;
    return Math.max(0, totalTendered - remaining);
  }

  get remainingBalance(): number {
    const totalBatch = this.batchPayments.reduce((s, p) => s + p.amount, 0);
    return Math.max(0, this.balanceDue - totalBatch);
  }

  addToBatch(): void {
    const amount = this.paymentForm.value.amount;
    if (amount <= 0) return;
    
    this.batchPayments.push({
      method: this.selectedMethod,
      amount: amount,
      reference: this.paymentForm.value.reference,
      note: this.paymentForm.value.notes
    });
    
    // Reset amount but keep other info or reset all? 
    // Usually in POS you reset amount to enter next part of split.
    this.paymentForm.patchValue({ amount: 0 });
  }

  removeFromBatch(index: number): void {
    this.batchPayments.splice(index, 1);
  }

  submitBatchPayments(): void {
    if (!this.booking?.id) return;
    
    // If nothing in batch, check if amount in input
    if (this.batchPayments.length === 0 && this.paymentForm.value.amount > 0) {
      this.addPayment(); // Fallback to single payment
      return;
    }

    if (this.batchPayments.length === 0) return;

    this.submittingPayment = true;
    
    // Sequential submission
    const processNext = (index: number) => {
      if (index >= this.batchPayments.length) {
        this.finishBatch();
        return;
      }

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
        error: () => {
          this.showToastMessage('Some payments failed to record', 'error');
          this.finishBatch();
        }
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

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod = method;
  }

  getRoomTypeName(roomTypeId: number): string {
    return this.hotelService.getRoomTypeNameById(roomTypeId);
  }

  getRoomId(room: any): any {
    return this.hotelService.getId(room);
  }

  getMethodStyle(method: string): string {
    const map: Record<string, string> = {
      CASH: 'bg-green-100 text-green-700',
      CARD: 'bg-blue-100 text-blue-700',
      TRANSFER: 'bg-purple-100 text-purple-700',
      POS: 'bg-amber-100 text-amber-700',
      ONLINE: 'bg-cyan-100 text-cyan-700',
    };
    return map[method] || 'bg-gray-100 text-gray-600';
  }

  updateStatus(newStatus: BookingStatus): void {
    if (!this.booking?.id) return;
    this.submittingStatus = true;
    const updated = { ...this.booking, status: newStatus };
    this.hotelService.updateBooking(this.booking.id, updated).subscribe({
      next: (b) => {
        this.booking = b;
        this.submittingStatus = false;
        this.showCancelModal = false;

        if (newStatus === 'CHECKED_OUT') {
          this.createHousekeepingOnCheckout();
          this.showToastMessage('Guest checked out! Housekeeping task created.', 'success');
        } else if (newStatus === 'CHECKED_IN') {
          this.showToastMessage('Guest checked in!', 'success');
        } else {
          this.showToastMessage('Booking cancelled.', 'success');
        }
      },
      error: () => {
        this.submittingStatus = false;
        this.showToastMessage('Action failed', 'error');
      },
    });
  }

  /** Auto-create housekeeping + maintenance on checkout */
  private createHousekeepingOnCheckout(): void {
    if (!this.booking) return;
    const today = this.hotelService.formatDate(new Date());

    for (const roomId of this.booking.rooms) {
      // Set room to CLEANING status
      const room = this.rooms.find((r) => r.id === roomId);
      if (room) {
        const updatedRoom = { ...room, roomStatus: 'CLEANING' as const };
        this.hotelService.updateRoom(room.id, updatedRoom).subscribe();
      }

      // Create maintenance record
      this.hotelService.createMaintenanceRequest({
        tasks: 'CLEANING_REQUIRED',
        reasons: ['Guest checkout'],
        startDate: today,
        notes: `Auto-created on checkout of booking #${this.booking.id}`,
        completed: false,
        priority: 'HIGH',
        dueDate: today,
        completedAt: '',
        room: roomId,
      } as any).subscribe();

      // Create housekeeping record
      this.hotelService.createHousekeepingRecord({
        status: 'PENDING',
        lastCleaned: today,
        notes: `Checkout cleaning for booking #${this.booking.id}`,
        room: roomId,
      }).subscribe();
    }

    this.hotelService.refreshRoomsCache();
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
        this.loadBooking(this.booking!.id!);
        this.hotelService.refreshPaymentsCache();
        this.showToastMessage('Payment recorded successfully', 'success');
      },
      error: () => {
        this.submittingPayment = false;
        this.showToastMessage('Failed to record payment', 'error');
      },
    });
  }

  getStatusColor(status: BookingStatus | undefined): string {
    if (!status) return 'bg-gray-300 text-white';
    const map: Record<string, string> = {
      CONFIRMED: 'bg-customBlue text-white',
      PENDING: 'bg-amber-400 text-white',
      CANCELLED: 'bg-red-500 text-white',
      CHECKED_IN: 'bg-customGreen text-white',
      CHECKED_OUT: 'bg-gray-500 text-white',
      NO_SHOW: 'bg-orange-500 text-white',
    };
    return map[status] ?? 'bg-gray-300 text-white';
  }

  getPaymentStatusColor(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      PENDING: 'bg-amber-100 text-amber-700',
      FAILED: 'bg-red-100 text-red-700',
      REFUNDED: 'bg-gray-100 text-gray-600',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  }

  getNights(): number {
    if (!this.booking) return 0;
    return this.hotelService.calculateNights(this.booking.checkinDate, this.booking.checkoutDate);
  }

  goBack(): void {
    this.router.navigate(['/hospitality/bookings']);
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }
}
