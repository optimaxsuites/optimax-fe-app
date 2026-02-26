import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  guests: Guest[] = [];
  rooms: Room[] = [];
  roomTypes: RoomTypeDTO[] = [];
  loading = false;

  filterStatus = '';
  filterFrom = '';
  filterTo = '';
  filterGuest = '';
  searchQuery = '';

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  statuses: BookingStatus[] = [
    'CONFIRMED', 'PENDING', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW',
  ];

  constructor(
    private hotelService: HotelserviceService,
    private router: Router
  ) {}

  ngOnInit(): void {
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

      // Global search matches against guest name, booking ID, room numbers, status
      const matchSearch = !q || 
        guestName.includes(q) ||
        String(b.id || '').includes(q) ||
        (b.status || '').toLowerCase().includes(q) ||
        this.getRoomNumbers(b.rooms).toLowerCase().includes(q);

      return matchStatus && matchFrom && matchTo && matchGuest && matchSearch;
    });
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.filterGuest = '';
    this.searchQuery = '';
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

  getStatusColor(status: BookingStatus): string {
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

  // Summary counts
  get totalCount(): number { return this.bookings.length; }
  get confirmedCount(): number { return this.bookings.filter(b => b.status === 'CONFIRMED').length; }
  get checkedInCount(): number { return this.bookings.filter(b => b.status === 'CHECKED_IN').length; }
  get pendingCount(): number { return this.bookings.filter(b => b.status === 'PENDING').length; }

  viewBooking(booking: Booking): void {
    this.router.navigate(['/hospitality/bookings', booking.id]);
  }

  createBooking(): void {
    this.router.navigate(['/hospitality/bookings/create']);
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
}
