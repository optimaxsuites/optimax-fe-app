import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Observable, forkJoin } from 'rxjs';
import {
  HotelserviceService,
  Room,
  RoomStatus,
  Booking,
  Guest,
  RoomTypeDTO,
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

  // Room type properties
  roomTypes: RoomTypeDTO[] = [];
  selectedRoomTypeIds: number[] = [];
  allRoomTypesSelected = true;

  // Search and filter properties
  searchQuery = '';
  searchDate: Date | null = null;
  filterForm: FormGroup;

  // Room selection properties
  viewingAvailableRooms = false;
  selectAll = false;
  selectedRooms: Room[] = [];

  // Data properties
  bookings: Booking[] = [];
  guests: Guest[] = [];
  isLoading = true;
  roomBookingsMap: Map<number, Booking> = new Map();
  roomGuestsMap: Map<number, Guest> = new Map();

  // UI state properties
  openForm = false;
  openLogs = false;
  openRoom = false;
  showRoomForm = false;
  selectedBookingDetails: Room | null = null;
  showBookingDetails = false;
  showRoomDetails = false;
  selectedRoomForDetails: Room | null = null;

  // Room lists
  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  availableRooms: Room[] = [];
  selectedRoom: Room | null = null;

  // Status properties
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

  selectedStatus: { value: string; label: string } = this.statusOptions[0];

  constructor(
    private messageService: MessageService,
    private hotelService: HotelserviceService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      searchQuery: [''],
      selectedStatus: [this.statusOptions[0]],
      selectedRoomTypes: [[]],
    });
  }

  ngOnInit(): void {
    this.loadAllData();
  }

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
        this.roomTypes = roomTypes;
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

  getFilterClass(typeId: number): string {
    const baseClasses =
      'p-4 font-bold text-xl rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between';
    return this.isRoomTypeSelected(typeId)
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
        this.selectedRoomTypeIds.length === 0 ||
        this.selectedRoomTypeIds.includes(room.roomType as number);

      // Status filter
      const statusMatch =
        this.selectedStatus.value === 'All Statuses' ||
        this.selectedStatus.value === room.roomStatus;

      // Guest name filter (searchQuery)
      const guest = this.roomGuestsMap.get(room.id as number);
      const guestName = guest
        ? `${guest.firstName || ''} ${guest.lastName || ''}`
            .trim()
            .toLowerCase()
        : '';

      // Search filter: room number, room type, or guest name
      const searchLower = this.searchQuery.toLowerCase();
      const searchMatch =
        !this.searchQuery ||
        room.roomNumber.toString().includes(this.searchQuery) ||
        this.getRoomTypeName(room.roomType as number)
          ?.toLowerCase()
          .includes(searchLower) ||
        (guestName && guestName.includes(searchLower));

      // Date filter: check-in or checkout date
      let dateMatch = true;
      if (this.searchDate) {
        const booking = this.roomBookingsMap.get(room.id as number);
        if (booking) {
          const checkin = new Date(booking.checkinDate);
          const checkout = new Date(booking.checkoutDate);
          const searchDateOnly = new Date(this.searchDate);
          searchDateOnly.setHours(0, 0, 0, 0);
          checkin.setHours(0, 0, 0, 0);
          checkout.setHours(0, 0, 0, 0);
          dateMatch =
            checkin.getTime() === searchDateOnly.getTime() ||
            checkout.getTime() === searchDateOnly.getTime();
        } else {
          dateMatch = false;
        }
      }

      return typeMatch && statusMatch && searchMatch && dateMatch;
    });
  }

  toggleRoomTypeSelection(typeId: number): void {
    const index = this.selectedRoomTypeIds.indexOf(typeId);
    if (index === -1) {
      this.selectedRoomTypeIds = [typeId];
      this.allRoomTypesSelected = false;
    } else {
      this.selectedRoomTypeIds = [];
      this.allRoomTypesSelected = true;
    }
    this.applyFilters();
  }

  isRoomTypeSelected(typeId: number): boolean {
    return this.selectedRoomTypeIds.includes(typeId);
  }

  selectAllRoomTypes(): void {
    if (this.allRoomTypesSelected) {
      this.selectedRoomTypeIds = [];
    } else {
      this.selectedRoomTypeIds = this.roomTypes.map(
        (type) => type.id as number
      );
    }
    this.allRoomTypesSelected = !this.allRoomTypesSelected;
    this.applyFilters();
  }

  showAvailableRooms(): void {
    this.hotelService.getAvailableRooms().subscribe({
      next: (rooms) => {
        this.availableRooms = rooms.filter(
          (room) => room.roomStatus === 'AVAILABLE'
        );
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
    this.selectedRoomTypeIds = [];
    this.allRoomTypesSelected = true;
    this.selectedStatus = this.statusOptions[0];
    this.searchQuery = '';
    this.searchDate = null;
    this.applyFilters();
  }

  private enrichRoomsWithGuestAndBookingData(
    rooms: Room[],
    bookings: Booking[],
    guests: Guest[]
  ): Room[] {
    this.roomBookingsMap.clear();
    this.roomGuestsMap.clear();

    return rooms.map((room) => {
      const roomBooking = bookings.find((booking) =>
        booking.rooms.includes(room.id as number)
      );

      let guest: Guest | undefined;
      if (roomBooking) {
        guest =
          typeof roomBooking.guest === 'number'
            ? guests.find((g) => g.id === roomBooking.guest)
            : roomBooking.guest;

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
        this.applyFilters();
        this.showRoomForm = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Room created successfully',
        });
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
    this.selectRoom(room);
  }

  bookSelectedRooms(): void {
    if (this.selectedRooms.length > 0) {
      this.bookingFormRequested.emit(this.selectedRooms);
      this.openForm = true;
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Rooms Selected',
        detail: 'Please select at least one room to book',
      });
    }
  }

  getRoomTypeName(id: number): string {
    return this.roomTypes.find((rt) => rt.id === id)?.name || '';
  }

  getRoomTypeById(id: number): RoomTypeDTO | undefined {
    return this.roomTypes.find((t) => t.id === id);
  }
}
