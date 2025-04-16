import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ChangeDetectorRef } from '@angular/core';

// Using the same interface as in roomlist component for consistency
export interface Guest {
  id?: string; // Optional property for guest ID
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  idNumber: string;
  gender: string;
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
  guest?: Guest; // Optional property for guest
  rate: number;
  bookingDetails?: BookingDetails;
  beds?: number;
  maxOccupancy?: number;
  description?: string;
  amenities?: string[];
  currentKey?: RoomKey; // Optional property for current key
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
  roomRates: number[];
  subtotal: number;
  taxes: number;
  total: number;
  balanceAmount: number;
  status?: string;
}

export interface RoomKey {
  id: string;
  roomNumber: number;
  roomId: number;
  isActive: boolean;
  assignedDate: Date;
  deactivationDate: Date;
  guestIdNumber: string;
  guestName?: string;
}

export interface KeyCardLog {
  id: string;
  roomNumber: number;
  roomId: number;
  keyCardId: string;
  guestIdNumber: string;
  accessType: 'GUEST' | 'MASTER' | 'STAFF';
  timestamp: Date;
  accessGranted: boolean;
}

@Component({
  selector: 'app-hotel-roomdetails',
  templateUrl: './hotel-roomdetails.component.html',
  styleUrls: ['./hotel-roomdetails.component.scss'],
  providers: [MessageService],
})
export class HotelRoomdetailsComponent {
  @Input() room: Room | null = null;
  @Output() back = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<Room>();
  @Input() selectedRoom: Room | null = null;

  previousRoom: Room | null = null;
  showDetails: boolean = false;
  detailedRoom: Room | null = null;
  isAdminView: boolean = true;
  openForm: boolean = false;
  openMessage: boolean = false;
  openBills: boolean = false;
  openRoom: boolean = false;
  openCheckinForm: boolean = false;
  openNote: boolean = false;

  statusColors: any = {
    available: 'bg-emerald-500',
    booked: 'bg-amber-500',
    occupied: 'bg-blue-500',
    maintenance: 'bg-gray-500',
    dirty: 'bg-red-500',
  };
  selectedRooms: Room[] | undefined;
  formType: string | undefined;

  onKeyAssigned: any;
  defaultCheckinDate: Date = new Date();
  defaultCheckoutDate: Date = new Date();

  constructor(
    private messageService: MessageService,
    private cdRef: ChangeDetectorRef
  ) {}

  private updateRoom(updatedRoom?: Room): void {
    const roomToUpdate = updatedRoom || this.room;
    if (roomToUpdate) {
      this.updateRoomInLocalStorage(roomToUpdate);
      this.statusChanged.emit(roomToUpdate);
    }
  }

  get isAvailable(): boolean {
    return this.detailedRoom?.status === 'available';
  }

  get isBooked(): boolean {
    return this.detailedRoom?.status === 'booked';
  }

  get isOccupied(): boolean {
    return this.detailedRoom?.status === 'occupied';
  }

  get isMaintenance(): boolean {
    return this.detailedRoom?.status === 'maintenance';
  }

  get isDirty(): boolean {
    return this.detailedRoom?.status === 'dirty';
  }

  showRoomDetailsModal(room: Room): void {
    const storedRooms = localStorage.getItem('rooms');
    if (storedRooms) {
      const parsedRooms = JSON.parse(storedRooms);
      const updatedRoom = parsedRooms.find((r: Room) => r.id === room.id);

      if (updatedRoom) {
        this.processRoomDates(updatedRoom);
        this.detailedRoom = updatedRoom;
      } else {
        this.detailedRoom = room;
      }
    } else {
      this.detailedRoom = room;
    }
    this.showDetails = true;
    this.cdRef.detectChanges(); // Force change detection
  }

  private processRoomDates(room: Room): void {
    if (room.bookingDetails) {
      if (typeof room.bookingDetails.checkinDate === 'string') {
        room.bookingDetails.checkinDate = new Date(
          room.bookingDetails.checkinDate
        );
      }
      if (typeof room.bookingDetails.checkoutDate === 'string') {
        room.bookingDetails.checkoutDate = new Date(
          room.bookingDetails.checkoutDate
        );
      }
    }
  }

  closeModal(): void {
    this.showDetails = false;
    this.detailedRoom = null;
    this.openForm = false;
    if (this.previousRoom) {
      this.detailedRoom = this.previousRoom;
      this.previousRoom = null;
    }
    this.showDetails = true;
  }

  navigateToMessage() {
    this.openMessage = !this.openMessage;
  }

  navigateToBills() {
    this.openBills = !this.openBills;
  }

  navigateToNote() {
    this.openNote = !this.openNote;
  }

  navigateToChangeRoom() {
    this.openRoom = !this.openRoom;
  }

  navigateTocheck() {
    this.openCheckinForm = !this.openCheckinForm;
  }

  onStartMaintenance(): void {
    if (this.detailedRoom) {
      this.detailedRoom.status = 'maintenance';
      this.updateRoom(this.detailedRoom);

      this.messageService.add({
        severity: 'info',
        summary: 'Maintenance Started',
        detail: 'Room is now under maintenance',
      });

      this.cdRef.detectChanges();
    }
  }

  onCompleteMaintenance(): void {
    if (this.detailedRoom) {
      this.detailedRoom.status = 'available';
      this.updateRoom(this.detailedRoom);

      this.messageService.add({
        severity: 'success',
        summary: 'Maintenance Complete',
        detail: 'Room is now available',
      });

      this.cdRef.detectChanges();
    }
  }

  onExtendStay(): void {
    // Implementation for extending a guest's stay
    this.messageService.add({
      severity: 'info',
      summary: 'Extend Stay',
      detail: 'Extend stay functionality will be implemented here',
    });
  }

  onCheckinComplete(updatedRoom: Room) {
    // Update your room list or perform other actions
    console.log('Room updated:', updatedRoom);
  }

  onAddMaintenanceNotes(): void {
    // Implementation for adding maintenance notes
    this.messageService.add({
      severity: 'info',
      summary: 'Maintenance Notes',
      detail: 'Add maintenance notes functionality will be implemented here',
    });
  }

  // Helper method to update room in localStorage
  private updateRoomInLocalStorage(room: Room): void {
    try {
      const storedRooms = localStorage.getItem('rooms');
      const rooms = storedRooms ? JSON.parse(storedRooms) : [];

      const index = rooms.findIndex((r: Room) => r.id === room.id);

      if (index !== -1) {
        // Update existing room
        rooms[index] = this.sanitizeRoomData(room);
      } else {
        // Add new room
        rooms.push(this.sanitizeRoomData(room));
      }

      localStorage.setItem('rooms', JSON.stringify(rooms));
    } catch (error) {
      console.error('Error updating localStorage:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Storage Error',
        detail: 'Failed to save room data',
      });
    }
  }

  private sanitizeRoomData(room: Room): Room {
    const sanitizedRoom = { ...room };

    // Ensure dates are properly serialized

    return sanitizedRoom;
  }

  // In your parent component
  navigateToForm() {
    const roomsToBook = this.detailedRoom ? [this.detailedRoom] : [];
    this.selectedRooms = roomsToBook;

    // Determine if we're doing a check-in (room is booked) or new booking
    if (this.detailedRoom?.status === 'booked') {
      this.formType = 'checkin';
    } else {
      this.formType = 'booking';
    }

    this.openForm = !this.openForm;
  }

  onBookingConfirmed(updatedRooms: Room[]): void {
    // Update the first room (since we only passed one)
    if (updatedRooms.length > 0) {
      this.detailedRoom = { ...updatedRooms[0] };
      this.processRoomDates(this.detailedRoom);
      this.updateRoomInLocalStorage(this.detailedRoom);

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Booking Confirmed',
        detail: `Room ${this.detailedRoom.number} has been booked`,
      });
    }

    this.openForm = false;
    this.cdRef.detectChanges();
  }

  onCancelBooking(): void {
    if (this.detailedRoom) {
      // Update the room status to 'available'
      this.detailedRoom.status = 'available';

      // Clear guest and booking details
      delete this.detailedRoom.guest;
      delete this.detailedRoom.bookingDetails;

      // Update in localStorage
      this.updateRoomInLocalStorage(this.detailedRoom);

      // Emit the status change
      this.statusChanged.emit(this.detailedRoom);

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Booking Cancelled',
        detail: `Booking for Room ${this.detailedRoom.number} has been cancelled`,
      });

      // Close the modal
      this.closeModal();
    }
  }
  onCompleteCleaning(): void {
    if (this.detailedRoom) {
      this.detailedRoom.status = 'available';
      this.updateRoom(this.detailedRoom);

      this.messageService.add({
        severity: 'success',
        summary: 'Cleaning Complete',
        detail: 'Room is now available',
      });

      this.cdRef.detectChanges();
    }
  }

  // Helper method to get full guest name
  getGuestFullName(): string {
    if (!this.detailedRoom || !this.detailedRoom.guest) return 'No Guest';

    const guest = this.detailedRoom.guest;
    return `${guest.title || ''} ${guest.firstName || ''} ${
      guest.lastName || ''
    }`.trim();
  }
}
