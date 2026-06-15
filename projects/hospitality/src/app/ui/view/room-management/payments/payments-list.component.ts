import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  HotelserviceService,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Booking,
} from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-payments-list',
  templateUrl: './payments-list.component.html',
})
export class PaymentsListComponent implements OnInit {
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  bookings: Booking[] = [];
  loading = true;

  // Filters
  searchQuery = '';
  filterMethod: PaymentMethod | '' = '';
  filterStatus: PaymentStatus | '' = '';
  filterFrom = '';
  filterTo = '';

  methods: PaymentMethod[] = [];
  statuses: PaymentStatus[] = [];
  uuid = '';

  // Stats
  get totalCollected(): number {
    return this.payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amountPaid, 0);
  }
  get pendingAmount(): number {
    return this.payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amountPaid, 0);
  }
  get totalPayments(): number { return this.payments.length; }
  get completedCount(): number { return this.payments.filter(p => p.status === 'COMPLETED').length; }
  get pendingCount(): number { return this.payments.filter(p => p.status === 'PENDING').length; }

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(
    private hotelService: HotelserviceService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 
                this.route.parent?.snapshot.paramMap.get('uuid') || '';
    this.methods = this.hotelService.getPaymentMethods();
    this.statuses = this.hotelService.getPaymentStatuses();
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    // Load bookings for reference
    this.hotelService.getBookings().subscribe({
      next: (bookings) => { this.bookings = bookings; },
    });
    this.hotelService.getPayments().subscribe({
      next: (data) => {
        this.payments = data;
        this.filteredPayments = [...data];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showToastMessage('Failed to load payments', 'error');
      },
    });
  }

  applyFilters(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredPayments = this.payments.filter((p) => {
      const matchMethod = !this.filterMethod || p.method === this.filterMethod;
      const matchStatus = !this.filterStatus || p.status === this.filterStatus;
      const matchFrom = !this.filterFrom || p.paidOn >= this.filterFrom;
      const matchTo = !this.filterTo || p.paidOn <= this.filterTo;
      const matchSearch =
        !q ||
        String(p.id).includes(q) ||
        String(p.bookingId).includes(q) ||
        (p.reference || '').toLowerCase().includes(q) ||
        (p.note || '').toLowerCase().includes(q) ||
        this.getGuestNameForBooking(p.bookingId).toLowerCase().includes(q);
      return matchMethod && matchStatus && matchFrom && matchTo && matchSearch;
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterMethod = '';
    this.filterStatus = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.filteredPayments = [...this.payments];
  }

  getGuestNameForBooking(bookingId: number): string {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) return `Booking #${bookingId}`;
    return this.hotelService.resolveGuestName(booking.guest);
  }

  getMethodIcon(method: string): string {
    const map: Record<string, string> = {
      CASH: 'fa-solid fa-money-bill-wave',
      CARD: 'fa-solid fa-credit-card',
      TRANSFER: 'fa-solid fa-building-columns',
      POS: 'fa-solid fa-cash-register',
      ONLINE: 'fa-solid fa-globe',
    };
    return map[method] || 'fa-solid fa-circle-question';
  }

  getMethodColor(method: string): string {
    const map: Record<string, string> = {
      CASH: 'bg-green-100 text-green-700',
      CARD: 'bg-blue-100 text-blue-700',
      TRANSFER: 'bg-purple-100 text-purple-700',
      POS: 'bg-amber-100 text-amber-700',
      ONLINE: 'bg-cyan-100 text-cyan-700',
    };
    return map[method] || 'bg-gray-100 text-gray-600';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      PENDING: 'bg-amber-100 text-amber-700',
      FAILED: 'bg-red-100 text-red-700',
      REFUNDED: 'bg-gray-100 text-gray-600',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  }

  viewBooking(bookingId: number): void {
    this.router.navigate(['/hospitality/bookings', bookingId, this.uuid]);
  }

  private showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3000);
  }
}
