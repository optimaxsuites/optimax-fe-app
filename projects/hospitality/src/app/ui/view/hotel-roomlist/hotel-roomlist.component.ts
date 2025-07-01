import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';

import { Observable, forkJoin, map } from 'rxjs';
import {
  HotelserviceService,
  Room,
  RoomStatus,
  Booking,
  Guest,
} from '../../hospitality/hotelservice.service';

@Component({
  selector: 'app-hotel-roomlist',
  templateUrl: './hotel-roomlist.component.html',
  styleUrls: ['./hotel-roomlist.component.scss'],
  providers: [MessageService],
})
export class HotelRoomlistComponent implements OnInit {
  @Output() roomSelected = new EventEmitter<Room>();
  @Output() bookingFormRequested = new EventEmitter<Room[]>();

  roomTypes: string[] = ['All Rooms'];
  selectedRoomTypes: string[] = ['All Rooms'];
  searchQuery = '';
  searchDate: Date | null = null;
  viewingAvailableRooms = false;
  selectAll = false;
  selectedRooms: Room[] = [];
  bookings: Booking[] = [];
  guests: Guest[] = [];
  isLoading = true;
  roomBookingsMap: Map<number, Booking> = new Map();
  roomGuestsMap: Map<number, Guest> = new Map();

  openForm = false;
  openLogs = false;
  openRoom = false;
  showRoomForm = false;

  selectedBookingDetails: Room | null = null;
  showBookingDetails = false;
  showRoomDetails = false;
  selectedRoomForDetails: Room | null = null;

  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  availableRooms: Room[] = [];
  selectedRoom: Room | null = null;

  statusColors: { [key: string]: string } = {
    AVAILABLE: 'bg-green-400',
    BOOKED: 'bg-amber-300',
    OCCUPIED: 'bg-blue-400',
    UNDER_MAINTENANCE: 'bg-gray-400',
    CLEANING: 'bg-red-400',
  };

  statusOptions = [
    { value: 'All Statuses', label: 'All Statuses' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'BOOKED', label: 'Booked' },
    { value: 'OCCUPIED', label: 'Occupied' },
    { value: 'UNDER_MAINTENANCE', label: 'Maintenance' },
    { value: 'CLEANING', label: 'Cleaning' },
  ];

  selectedStatus: { value: string; label: string } = {
    value: 'All Statuses',
    label: 'All Statuses',
  };

  constructor(
    private messageService: MessageService,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  // selectRoom(room: Room): void {
  //   this.selectedRoomForDetails = room;
  //   this.showRoomDetails = true;
  //   this.roomSelected.emit(room);
  // }

  public loadAllData(): void {
    this.isLoading = true;

    forkJoin([
      this.hotelService.getRooms(),
      this.hotelService.getRoomTypes(),
      this.hotelService.getBookings(),
      this.hotelService.getGuests(),
    ]).subscribe({
      next: ([rooms, roomTypes, bookings, guests]) => {
        this.rooms = this.enrichRoomsWithGuestAndBookingData(
          rooms,
          bookings,
          guests
        );
        this.bookings = bookings;
        this.guests = guests;
        this.roomTypes = ['All Rooms', ...roomTypes.map((rt) => rt.name)];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load data',
        });
        this.isLoading = false;
      },
    });
  }

  closeRoomDetails(): void {
    this.showRoomDetails = false;
    this.selectedRoomForDetails = null;
  }

  navigateToForm() {
    this.openForm = !this.openForm;
  }

  navigateToLogs() {
    this.openLogs = !this.openLogs;
  }

  navigateToRoom() {
    this.openRoom = !this.openRoom;
  }


  closeBookingDetails(): void {
    this.showBookingDetails = false;
    this.selectedBookingDetails = null;
  }

  getFilterClass(type: string): string {
    const baseClasses =
      'p-4 font-bold text-xl rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between';
    return this.selectedRoomTypes.includes(type)
      ? `${baseClasses} bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg border-2 border-emerald-700`
      : `${baseClasses} bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-300`;
  }

  onStatusChange(selectedValue: { value: string; label: string }): void {
    this.selectedStatus = selectedValue;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredRooms = this.rooms.filter((room) => {
      // Room type filter
      const typeMatch =
        this.selectedRoomTypes.includes('All Rooms') ||
        this.selectedRoomTypes.includes(room.roomType.name);

      // Status filter
      const statusMatch =
        this.selectedStatus.value === 'All Statuses' ||
        this.selectedStatus.value === room.roomStatus;

      // Search filter
      const searchMatch =
        !this.searchQuery ||
        room.roomNumber.toString().includes(this.searchQuery) ||
        (room.roomType &&
          room.roomType.name &&
          room.roomType.name
            .toLowerCase()
            .includes(this.searchQuery.toLowerCase()));

      // Date filter (if implemented)
      // ...

      return typeMatch && statusMatch && searchMatch;
    });
  }

  toggleRoomTypeSelection(type: string): void {
    this.selectedRoomTypes = [type];
    this.applyFilters();
  }

  showAvailableRooms(): void {
    this.hotelService.getAvailableRooms().subscribe({
      next: (rooms) => {
        this.availableRooms = rooms;
        this.viewingAvailableRooms = true;
        this.selectedRooms = [];
        this.selectAll = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load available rooms',
        });
      },
    });
  }

  clearDateFilter(): void {
    this.searchDate = null;
    this.applyFilters();
  }

  getStatusKeys(): string[] {
    return Object.keys(this.statusColors);
  }

  closeAvailableRoomsModal(): void {
    this.viewingAvailableRooms = false;
  }

  isRoomSelected(room: Room): boolean {
    return this.selectedRooms.some((r) => r.id === room.id);
  }

  toggleRoomSelection(room: Room): void {
    if (this.isRoomSelected(room)) {
      this.selectedRooms = this.selectedRooms.filter((r) => r.id !== room.id);
    } else {
      this.selectedRooms.push(room);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.selectedRooms = this.selectAll ? [...this.availableRooms] : [];
  }

  updateSelectAllState(): void {
    this.selectAll = this.selectedRooms.length === this.availableRooms.length;
  }

  calculateTotal(): number {
    return this.selectedRooms.reduce((total, room) => total + room.rate, 0);
  }

  clearSelection(): void {
    this.selectedRooms = [];
    this.selectAll = false;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }

  resetFilters(): void {
    this.selectedRoomTypes = ['All Rooms'];
    this.selectedStatus = { value: 'All Statuses', label: 'All Statuses' };
    this.searchQuery = '';
    this.searchDate = null;
    this.applyFilters();
  }

  // loadAllData(): void {
  //   this.isLoading = true;

  //   forkJoin([
  //     this.hotelService.getRooms(),
  //     this.hotelService.getRoomTypes(),
  //     this.hotelService.getBookings(),
  //     this.hotelService.getGuests(),
  //   ]).subscribe({
  //     next: ([rooms, roomTypes, bookings, guests]) => {
  //       this.rooms = this.enrichRoomsWithGuestAndBookingData(
  //         rooms,
  //         bookings,
  //         guests
  //       );
  //       this.bookings = bookings;
  //       this.guests = guests;
  //       this.roomTypes = ['All Rooms', ...roomTypes.map((rt) => rt.name)];
  //       this.applyFilters();
  //       this.isLoading = false;
  //     },
  //     error: (err) => {
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Error',
  //         detail: 'Failed to load data',
  //       });
  //       this.isLoading = false;
  //     },
  //   });
  // }

  private enrichRoomsWithGuestAndBookingData(
    rooms: Room[],
    bookings: Booking[],
    guests: Guest[]
  ): Room[] {
    // Clear existing maps
    this.roomBookingsMap.clear();
    this.roomGuestsMap.clear();

    return rooms.map((room) => {
      // Find booking for this room
      const roomBooking = bookings.find((booking) =>
        booking.rooms.includes(room.id as number)
      );

      // Find guest for this booking
      let guest: Guest | undefined;
      if (roomBooking) {
        guest =
          typeof roomBooking.guest === 'number'
            ? guests.find((g) => g.id === roomBooking.guest)
            : roomBooking.guest;

        // Add to maps
        if (roomBooking && guest) {
          this.roomBookingsMap.set(room.id as number, roomBooking);
          this.roomGuestsMap.set(room.id as number, guest);
        }
      }

      return {
        ...room,
        bookingDetails: roomBooking
          ? {
              checkinDate: roomBooking.checkinDate,
              checkoutDate: roomBooking.checkoutDate,
              adults: roomBooking.adults,
              children: roomBooking.children,
              specialRequests: roomBooking.specialRequests,
              paymentMethod: 'Credit Card',
              totalAmount: roomBooking.total,
              paidAmount: roomBooking.depositAmount || 0,
              balanceAmount: roomBooking.balanceAmount || 0,
            }
          : undefined,
      };
    });
  }

  getBookingForRoom(roomId: number): Booking | undefined {
    return this.roomBookingsMap.get(roomId);
  }

  getGuestForRoom(roomId: number): Guest | undefined {
    return this.roomGuestsMap.get(roomId);
  }

  hasBooking(roomId: number): boolean {
    return this.roomBookingsMap.has(roomId);
  }

  hasGuest(roomId: number): boolean {
    return this.roomGuestsMap.has(roomId);
  }

  getRoomTypeName(roomTypeId: string): string {
    const roomType = this.roomTypes.find((rt) => rt === `Room ${roomTypeId}`);
    return roomType || `Room ${roomTypeId}`;
  }

  calculateNights(
    checkinDate: string | Date | undefined,
    checkoutDate: string | Date | undefined
  ): number {
    if (!checkinDate || !checkoutDate) return 0;

    const checkin =
      typeof checkinDate === 'string' ? new Date(checkinDate) : checkinDate;
    const checkout =
      typeof checkoutDate === 'string' ? new Date(checkoutDate) : checkoutDate;

    const timeDiff = checkout.getTime() - checkin.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  onBookingConfirmed(): void {
    this.loadAllData();
    this.viewingAvailableRooms = false;
    this.openForm = false;
    this.selectedRooms = [];
    this.selectAll = false;
  }

  handleNewRoom(newRoom: Room): void {
    this.hotelService.createRoom(newRoom).subscribe({
      next: (room) => {
        this.rooms.push(room);
        this.updateRoomTypes();
        this.applyFilters();
        this.showRoomForm = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create room',
        });
      },
    });
  }

  private updateRoomTypes(): void {
    this.hotelService.getRoomTypes().subscribe({
      next: (roomTypes) => {
        this.roomTypes = ['All Rooms', ...roomTypes.map((rt) => rt.name)];
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load room types',
        });
      },
    });
  }

  selectRoom(room: Room): void {
    this.selectedRoom = room;
    this.selectedRoomForDetails = room;
    this.showRoomDetails = true;
    this.roomSelected.emit(room);
  }

  openRoomDetails(room: Room): void {
    if (!room || !room.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid room information',
      });
      return;
    }

    console.log('Opening room details for:', room);
    this.selectRoom(room);
  }

  bookSelectedRooms(): void {
    console.log('bookSelectedRooms called, selectedRooms:', this.selectedRooms);
    if (this.selectedRooms.length > 0) {
      this.bookingFormRequested.emit(this.selectedRooms);
      this.openForm = true; // Make sure this is set
      console.log('openForm set to:', this.openForm);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Rooms Selected',
        detail: 'Please select at least one room to book',
      });
    }
  }
}
