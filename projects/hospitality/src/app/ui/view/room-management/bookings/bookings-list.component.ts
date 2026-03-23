import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  HotelserviceService,
  Booking,
  BookingStatus,
  Guest,
  Room,
  RoomTypeDTO,
} from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-bookings-list',
  templateUrl: './bookings-list.component.html',
})
export class BookingsListComponent implements OnInit {
  protected readonly Math = Math;
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  guests: Guest[] = [];
  rooms: Room[] = [];
  roomTypes: RoomTypeDTO[] = [];
  loading = false;
  viewMode: 'table' | 'grid' = 'table';
  showDeleteModal = false;
  selectedBooking: Booking | null = null;

  filterStatus = '';
  filterFrom = '';
  filterTo = '';
  filterGuest = '';
  filterRoom = '';
  searchQuery = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  statuses: BookingStatus[] = [
    'CONFIRMED', 'PENDING', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW',
  ];

  uuid = '';

  constructor(
    private hotelService: HotelserviceService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 
                this.route.parent?.snapshot.paramMap.get('uuid') || '';
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    
    forkJoin({
      guests: this.hotelService.getGuests(),
      roomTypes: this.hotelService.getRoomTypes(),
      rooms: this.hotelService.getRooms(),
      bookings: this.hotelService.getBookings()
    }).subscribe({
      next: (result) => {
        console.log('API FETCH SUCCESS');
        console.log('Bookings:', result.bookings);
        console.log('Guests:', result.guests);
        console.log('Rooms:', result.rooms);
        
        this.guests = result.guests;
        this.roomTypes = result.roomTypes;
        this.rooms = result.rooms;
        this.bookings = result.bookings;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading booking data:', err);
        this.showToastMessage('Failed to load bookings data', 'error');
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();
    this.filteredBookings = (this.bookings || []).filter((b) => {
      const matchStatus = !this.filterStatus || b.status === this.filterStatus;
      
      const bCheckin = b.checkinDate || '';
      const bCheckout = b.checkoutDate || '';
      
      const matchFrom = !this.filterFrom || bCheckin >= this.filterFrom;
      const matchTo = !this.filterTo || bCheckout <= this.filterTo;
      
      const guestName = this.getGuestName(b.guest).toLowerCase();
      const matchGuest = !this.filterGuest || guestName.includes(this.filterGuest.toLowerCase());

      const roomNumbers = this.getRoomNumbers(b.rooms).toLowerCase();
      const matchRoom = !this.filterRoom || roomNumbers.includes(this.filterRoom.toLowerCase());

      // Global search matches against guest name, booking ID, room numbers, status
      const matchSearch = !q || 
        guestName.includes(q) ||
        String(b.id || '').includes(q) ||
        (b.status || '').toLowerCase().includes(q) ||
        roomNumbers.includes(q);

      return matchStatus && matchFrom && matchTo && matchGuest && matchRoom && matchSearch;
    });
    
    this.totalRecords = this.filteredBookings.length;
    this.updatePaginatedBookings();
  }

  updatePaginatedBookings(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedBookings = this.filteredBookings.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePaginatedBookings();
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize) || 1;
  }

  paginatedBookings: Booking[] = [];

  clearFilters(): void {
    this.filterStatus = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.filterGuest = '';
    this.filterRoom = '';
    this.searchQuery = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  getGuestName(guest: Guest | number | string | null | undefined): string {
    if (!guest) return 'Unknown Guest';
    
    // If it's an ID (number or string)
    if (typeof guest === 'number' || typeof guest === 'string') {
      const g = this.guests.find((x) => String(this.hotelService.getId(x)) == String(guest));
      return g ? `${g.firstName} ${g.lastName}` : `Guest #${guest}`;
    }
    
    // If it's a Guest object
    if (typeof guest === 'object') {
      const g = guest as Guest;
      const gId = this.hotelService.getId(g);
      if (g.firstName || g.lastName) {
        return `${g.firstName || ''} ${g.lastName || ''}`.trim();
      }
      // Maybe it has an id but no names loaded yet
      if (gId) {
        const cached = this.guests.find((x) => String(this.hotelService.getId(x)) == String(gId));
        return cached ? `${cached.firstName} ${cached.lastName}` : `Guest #${gId}`;
      }
    }
    
    return 'Unnamed Guest';
  }

  getRoomNumbers(rooms: any[] | null | undefined): string {
    if (!rooms || rooms.length === 0) return 'No Room';
    return rooms.map((rId) => {
      const idToFind = this.hotelService.getId(rId);
      const room = (this.rooms || []).find((r) => String(this.hotelService.getId(r)) == String(idToFind));
      return room ? `#${room.roomNumber}` : `#${idToFind}`;
    }).join(', ');
  }

  getRoomTypeName(rooms: any[] | null | undefined): string {
    if (!rooms || rooms.length === 0) return 'N/A';
    const firstRoom = rooms[0];
    const idToFind = this.hotelService.getId(firstRoom);
    const room = (this.rooms || []).find((r) => String(this.hotelService.getId(r)) == String(idToFind));
    if (!room) return 'Unknown Type';
    return this.hotelService.getRoomTypeNameById(room.roomType);
  }

  getNights(checkin: string, checkout: string): number {
    return this.hotelService.calculateNights(checkin, checkout);
  }

  getStatusClass(status: string): string {
    const s = status.toUpperCase();
    if (s === 'CONFIRMED' || s === 'PAID' || s === 'CHECKED_OUT') return 'bg-emerald-100 text-emerald-600';
    if (s === 'CHECKED_IN' || s === 'IN_PROGRESS') return 'bg-blue-100 text-blue-600';
    if (s === 'PENDING') return 'bg-amber-100 text-amber-600';
    if (s === 'CANCELLED' || s === 'OVERDUE') return 'bg-rose-100 text-rose-600';
    return 'bg-gray-100 text-gray-600';
  }

  getStatusColor(status: string): string {
    const s = status.toUpperCase();
    if (s === 'CONFIRMED' || s === 'PAID' || s === 'CHECKED_OUT') return 'bg-emerald-100 text-emerald-600';
    if (s === 'CHECKED_IN') return 'bg-blue-100 text-blue-600';
    if (s === 'PENDING') return 'bg-amber-100 text-amber-600';
    if (s === 'CANCELLED') return 'bg-rose-100 text-rose-600';
    return 'bg-gray-100 text-gray-600';
  }

  // Summary counts
  get totalCount(): number { return this.bookings.length; }
  get confirmedCount(): number { return this.bookings.filter(b => b.status === 'CONFIRMED').length; }
  get checkedInCount(): number { return this.bookings.filter(b => b.status === 'CHECKED_IN').length; }
  get pendingCount(): number { return this.bookings.filter(b => b.status === 'PENDING').length; }

  viewBooking(booking: Booking): void {
    this.router.navigate(['/hospitality/bookings', booking.id, this.uuid]);
  }

  openEditDrawer(booking: Booking): void {
    // In this simplified version, we just navigate to the detail/edit page
    this.viewBooking(booking);
  }

  confirmDelete(booking: Booking): void {
    this.selectedBooking = booking;
    this.showDeleteModal = true;
  }

  deleteBooking(): void {
    if (!this.selectedBooking?.id) return;
    this.hotelService.deleteBooking(this.selectedBooking.id).subscribe({
      next: () => {
        this.showToastMessage('Booking deleted successfully', 'success');
        this.showDeleteModal = false;
        this.loadAll();
      },
      error: () => this.showToastMessage('Failed to delete booking', 'error')
    });
  }

  createBooking(): void {
    this.router.navigate(['/hospitality/bookings/create', this.uuid]);
  }

  createRoomFirstBooking(): void {
    this.router.navigate(['/hospitality/bookings/room-select', this.uuid]);
  }

  checkIn(booking: Booking, event: Event): void {
    event.stopPropagation();
    if (!booking.id) return;
    const updated = { ...booking, status: 'CHECKED_IN' as BookingStatus };
    this.hotelService.updateBooking(booking.id, updated).subscribe({
      next: () => {
        booking.status = 'CHECKED_IN';
        this.showToastMessage('Guest checked in successfully', 'success');
        this.applyFilters();
      },
      error: () => this.showToastMessage('Check-in failed', 'error'),
    });
  }

  checkOut(booking: Booking, event: Event): void {
    event.stopPropagation();
    if (!booking.id) return;
    const updated = { ...booking, status: 'CHECKED_OUT' as BookingStatus };
    this.hotelService.updateBooking(booking.id, updated).subscribe({
      next: () => {
        booking.status = 'CHECKED_OUT';
        this.showToastMessage('Guest checked out! Housekeeping task created.', 'success');
        this.applyFilters();
        // Auto-create housekeeping on checkout
        this.createHousekeepingOnCheckout(booking);
      },
      error: () => this.showToastMessage('Check-out failed', 'error'),
    });
  }

  /** Auto-create housekeeping + maintenance on checkout */
  private createHousekeepingOnCheckout(booking: Booking): void {
    const today = this.hotelService.formatDate(new Date());
    for (const roomId of booking.rooms) {
      // Set room to CLEANING
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
        notes: `Auto-created on checkout of booking #${booking.id}`,
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
        notes: `Checkout cleaning for booking #${booking.id}`,
        room: roomId,
      }).subscribe();
    }
    this.hotelService.refreshRoomsCache();
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }

  navigateToRoomFirst(): void {
    this.router.navigate(['/user/hospitality', 'bookings', 'room-select', this.uuid]);
  }

  getStats() {
    return {
      total: this.bookings.length,
      confirmed: this.bookings.filter(b => b.status === 'CONFIRMED').length,
      checkedIn: this.bookings.filter(b => b.status === 'CHECKED_IN').length,
      cancelled: this.bookings.filter(b => b.status === 'CANCELLED').length
    };
  }
}
