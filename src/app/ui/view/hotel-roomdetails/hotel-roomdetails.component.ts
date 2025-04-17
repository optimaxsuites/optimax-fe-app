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
  maintenanceReason?: string;
  maintenanceTasks?: string[];
  maintenanceStartDate?: Date;
  maintenanceNotes?: string;
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
  openExtendStay: boolean = false;

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
    // Close other open modals if needed
    this.openForm = false;
    this.openCheckinForm = false;
  }

  navigateTocheck() {
    this.openCheckinForm = !this.openCheckinForm;
  }

  navigateToExtend() {
    this.openExtendStay = !this.openExtendStay;
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
      // Clear all maintenance-related data
      this.detailedRoom.status = 'available';
      this.detailedRoom.maintenanceReason = undefined;
      this.detailedRoom.maintenanceTasks = undefined;
      this.detailedRoom.maintenanceStartDate = undefined;
      this.detailedRoom.maintenanceNotes = undefined;

      this.updateRoom(this.detailedRoom);

      this.messageService.add({
        severity: 'success',
        summary: 'Maintenance Complete',
        detail: 'Room is now available',
      });

      this.cdRef.detectChanges();
    }
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

  // Add this to your existing component
  getAvailableRooms(): Room[] {
    const storedRooms = localStorage.getItem('rooms');
    if (storedRooms) {
      const allRooms: Room[] = JSON.parse(storedRooms);
      return allRooms.filter(
        (room) =>
          room.status === 'available' &&
          room.id !== (this.detailedRoom?.id || this.room?.id)
      );
    }
    return [];
  }

  handleRoomChange(event: {
    newRoom: Room;
    note: string;
    maintenanceNote: string;
    oldRoomStatus: Room;
  }): void {
    try {
      const storedRooms = localStorage.getItem('rooms');
      let rooms: Room[] = storedRooms ? JSON.parse(storedRooms) : [];

      // Parse maintenance note to extract tasks
      const maintenanceText = event.maintenanceNote || '';
      const tasksMatch = maintenanceText.match(/Tasks: (.*)/);
      const maintenanceTasks = tasksMatch
        ? tasksMatch[1].split(', ').filter((task) => task.trim().length > 0)
        : [];

      // Handle old room (set to maintenance)
      const updatedOldRoom = {
        ...event.oldRoomStatus,
        status: 'Maintenance',
        maintenanceReason: event.note,
        maintenanceTasks: maintenanceTasks,
        maintenanceStartDate: new Date(),
        maintenanceNotes: event.maintenanceNote,
      };

      // Handle new room (if it's available, clear maintenance details)
      const updatedNewRoom = {
        ...event.newRoom,
        ...(event.newRoom.status === 'Available' && {
          maintenanceReason: '',
          maintenanceTasks: [],
          maintenanceStartDate: undefined,
          maintenanceNotes: '',
        }),
      };

      // Update both rooms in list
      rooms = rooms.map((room) => {
        if (room.id === updatedNewRoom.id) return updatedNewRoom;
        if (room.id === updatedOldRoom.id) return updatedOldRoom;
        return room;
      });

      // Save to localStorage
      localStorage.setItem('rooms', JSON.stringify(rooms));

      // Update UI
      if (this.detailedRoom) {
        this.detailedRoom =
          rooms.find((r) => r.id === this.detailedRoom?.id) || null;
      }

      // Success message
      this.messageService.add({
        severity: 'success',
        summary: 'Room Changed',
        detail: `Guest moved from Room ${event.oldRoomStatus.number} to Room ${event.newRoom.number}`,
      });

      // Close modal and emit changes
      this.navigateToChangeRoom();
      this.statusChanged.emit(updatedNewRoom);
      this.statusChanged.emit(updatedOldRoom);
    } catch (error) {
      console.error('Error changing rooms:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to change rooms',
      });
    }
  }

  onCheckoutComplete(updatedRoom: Room): void {
    // Update the room in localStorage
    this.updateRoomInLocalStorage(updatedRoom);

    // Update the detailed room if it's the same room
    if (this.detailedRoom && this.detailedRoom.id === updatedRoom.id) {
      this.detailedRoom = updatedRoom;
    }

    // Emit status change to update parent components
    this.statusChanged.emit(updatedRoom);

    // Close the message component
    this.openMessage = false;

    // Show success message
    this.messageService.add({
      severity: 'success',
      summary: 'Checkout Complete',
      detail: `Room ${updatedRoom.number} has been marked as dirty`,
    });

    this.cdRef.detectChanges();
  }

  onStayExtended(updatedRoom: Room): void {
    // Update the detailed room
    this.detailedRoom = updatedRoom;

    // Update localStorage
    this.updateRoomInLocalStorage(updatedRoom);

    // Emit to parent if needed
    this.statusChanged.emit(updatedRoom);

    // Force UI update
    this.cdRef.detectChanges();

    this.navigateToExtend();
  }

  onExtendStay(): void {
    if (this.detailedRoom && this.detailedRoom.bookingDetails) {
      const extensionDays = 1; // Or fetch from a form/input
      const ratePerNight = this.detailedRoom.rate;

      const currentCheckout = new Date(
        this.detailedRoom.bookingDetails.checkoutDate
      );
      const newCheckout = new Date(currentCheckout);
      newCheckout.setDate(currentCheckout.getDate() + extensionDays);

      const extraAmount = extensionDays * ratePerNight;
      this.detailedRoom.bookingDetails.checkoutDate = newCheckout;
      this.detailedRoom.bookingDetails.totalAmount += extraAmount;
      this.detailedRoom.bookingDetails.balanceAmount += extraAmount;

      // Save and reflect changes
      this.updateRoom(this.detailedRoom);

      this.messageService.add({
        severity: 'success',
        summary: 'Stay Extended',
        detail: `Checkout extended by ${extensionDays} day(s).`,
      });

      this.cdRef.detectChanges();
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'No booking details available for this room.',
      });
    }
  }
}
