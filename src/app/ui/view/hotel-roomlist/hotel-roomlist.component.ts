import { Component, EventEmitter, Output } from '@angular/core';
import { MessageService } from 'primeng/api';

// shared/interfaces/hotel.interfaces.ts

export interface Guest {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
}

export interface BookingDetails {
  checkinDate: Date;
  checkoutDate: Date;
  adults: number;
  children: number;
  specialRequests?: string;
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

export interface Room {
  id: number;
  number: number;
  type: string;
  status: string;
  floor?: number;
  guest?: Guest;
  rate: number;
  bookingDetails?: BookingDetails;
  beds?: number;
  maxOccupancy?: number;
  description?: string;
  amenities?: string[];
}

export interface Booking {
  guest: Guest;
  checkinDate: Date;
  checkoutDate: Date;
  adults: number;
  children: number;
  specialRequests: string;
  paymentMethod: string;
  depositAmount: number;
  roomIds: number[];
  roomTypes: string[];
  roomRates: number;
  subtotal: number;
  taxes: number;
  total: number;
  balanceAmount: number;
}

@Component({
  selector: 'app-hotel-roomlist',
  templateUrl: './hotel-roomlist.component.html',
  styleUrls: ['./hotel-roomlist.component.scss'],
  providers: [MessageService],
})
export class HotelRoomlistComponent {
  @Output() roomSelected = new EventEmitter<Room>();
  @Output() bookingFormRequested = new EventEmitter<Room[]>();

  roomTypes = [
    'All Rooms',
    'Standard',
    'Deluxe',
    'Suite',
    'Executive',
    'Presidential',
  ];
  selectedRoomTypes: string[] = ['All Rooms'];
  searchQuery = '';
  searchDate: Date | null = null;
  viewingAvailableRooms = false;
  selectAll = false;
  selectedRooms: Room[] = [];

  openForm = false;

  // For displaying booking details
  selectedBookingDetails: Room | null = null;
  showBookingDetails = false;

  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  availableRooms: Room[] = [];
  selectedRoom: Room | null = null;

  statusColors: { [key: string]: string } = {
    available: 'bg-green-400',
    booked: 'bg-amber-300',
    occupied: 'bg-blue-400',
    maintenance: 'bg-gray-400',
    dirty: 'bg-red-400',
  };

  constructor(private messageService: MessageService) {
    this.loadRooms();
    this.filteredRooms = [...this.rooms];
  }

  private loadRooms(): void {
    const storedRooms = localStorage.getItem('rooms');
    if (storedRooms) {
      const parsedRooms = JSON.parse(storedRooms);

      // Convert date strings back to Date objects
      this.rooms = parsedRooms.map((room: any) => {
        if (room.bookingDetails) {
          room.bookingDetails.checkinDate = room.bookingDetails.checkinDate
            ? new Date(room.bookingDetails.checkinDate)
            : null;
          room.bookingDetails.checkoutDate = room.bookingDetails.checkoutDate
            ? new Date(room.bookingDetails.checkoutDate)
            : null;
        }
        return room;
      });
    } else {
      // Initialize with default rooms if none in localStorage
      this.rooms = [
        {
          id: 1,
          number: 101,
          type: 'Standard',
          status: 'available',
          rate: 15000,
          floor: 1,
          beds: 1,
          maxOccupancy: 3,
          description: 'Cozy standard room with city view',
          amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Hair Dryer'],
        },
        // ... other default rooms
      ];
      localStorage.setItem('rooms', JSON.stringify(this.rooms));
    }

    // Apply filters after loading
    this.applyFilters();
  }

  selectRoom(room: Room): void {
    this.selectedRoom = room;
    this.roomSelected.emit(room);
  }

  navigateToForm() {
    this.openForm = !this.openForm;
  }

  openRoomDetails(room: Room): void {
    this.roomSelected.emit(room);
  }

  closeBookingDetails(): void {
    this.showBookingDetails = false;
    this.selectedBookingDetails = null;
  }

  bookSelectedRooms(): void {
    if (this.selectedRooms.length > 0) {
      this.bookingFormRequested.emit(this.selectedRooms);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Rooms Selected',
        detail: 'Please select at least one room to book',
      });
    }
  }

  getFilterClass(type: string): string {
    const baseClasses =
      'p-4 font-bold text-xl rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between';
    return this.selectedRoomTypes.includes(type)
      ? `${baseClasses} bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg border-2 border-emerald-700`
      : `${baseClasses} bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-300`;
  }

  toggleRoomTypeSelection(type: string): void {
    if (type === 'All Rooms') {
      this.selectedRoomTypes = ['All Rooms'];
    } else {
      if (this.selectedRoomTypes.includes(type)) {
        this.selectedRoomTypes = this.selectedRoomTypes.filter(
          (t) => t !== type
        );
        if (this.selectedRoomTypes.length === 0) {
          this.selectedRoomTypes = ['All Rooms'];
        }
      } else {
        this.selectedRoomTypes = this.selectedRoomTypes.filter(
          (t) => t !== 'All Rooms'
        );
        this.selectedRoomTypes.push(type);
      }
    }
    this.applyFilters();
  }

  showAvailableRooms(): void {
    this.availableRooms = this.rooms.filter(
      (room) =>
        room.status === 'available' &&
        (this.selectedRoomTypes.includes('All Rooms') ||
          this.selectedRoomTypes.includes(room.type))
    );
    this.viewingAvailableRooms = true;
    this.selectedRooms = [];
    this.selectAll = false;
  }

  applyFilters(): void {
    this.filteredRooms = this.rooms.filter((room) => {
      const typeMatch =
        this.selectedRoomTypes.includes('All Rooms') ||
        this.selectedRoomTypes.includes(room.type);
      const searchMatch =
        !this.searchQuery ||
        room.number.toString().includes(this.searchQuery) ||
        (room.guest &&
          `${room.guest.firstName} ${room.guest.lastName}`
            .toLowerCase()
            .includes(this.searchQuery.toLowerCase()));

      let dateMatch = true;
      if (this.searchDate && room.bookingDetails) {
        const searchDateObj = new Date(this.searchDate);
        // Set time to midnight for proper comparison
        searchDateObj.setHours(0, 0, 0, 0);

        const checkinDate = new Date(room.bookingDetails.checkinDate);
        checkinDate.setHours(0, 0, 0, 0);

        const checkoutDate = new Date(room.bookingDetails.checkoutDate);
        checkoutDate.setHours(0, 0, 0, 0);

        // Date falls within the booking period
        dateMatch =
          searchDateObj >= checkinDate && searchDateObj < checkoutDate;
      }

      return typeMatch && searchMatch && (this.searchDate ? dateMatch : true);
    });
  }

  clearDateFilter(): void {
    this.searchDate = null;
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedRoomTypes = ['All Rooms'];
    this.searchQuery = '';
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

  // Helper for displaying dates
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }

  // Calculate stay duration
  calculateNights(checkin?: Date, checkout?: Date): number {
    if (!checkin || !checkout) return 0;
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const diffTime = checkoutDate.getTime() - checkinDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  onBookingConfirmed(updatedRooms: Room[]): void {
    // Update local rooms array
    updatedRooms.forEach((updatedRoom) => {
      const index = this.rooms.findIndex((r) => r.id === updatedRoom.id);
      if (index !== -1) {
        this.rooms[index] = updatedRoom;
      }
    });

    // Update localStorage
    localStorage.setItem('rooms', JSON.stringify(this.rooms));

    // Close all modals and reset state
    this.viewingAvailableRooms = false;
    this.openForm = false;
    this.selectedRooms = [];
    this.selectAll = false;

    // Refresh the filtered rooms
    this.applyFilters();
  }
}
