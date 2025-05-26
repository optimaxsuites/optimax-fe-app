import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

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
  number: number | null; // Allow number to be null
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
  selector: 'app-hotel-changeroom',
  templateUrl: './hotel-changeroom.component.html',
  styleUrls: ['./hotel-changeroom.component.scss'],
})
export class HotelChangeroomComponent implements OnInit {
  @Input() currentRoom!: Room;
  @Input() availableRooms: Room[] = [];
  @Output() onChangeRoom = new EventEmitter<{
    newRoom: Room;
    note: string;
    maintenanceNote: string;
    oldRoomStatus: Room;
  }>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() back = new EventEmitter();

  selectedRoom: Room | null = null;
  changeNote: string = '';
  maintenanceNote: string = '';
  isSubmitting = false;
  maintenanceTasks: string[] = [
    'Cleaning required',
    'Repairs needed',
    'Painting required',
    'Furniture replacement',
    'Plumbing issues',
    'Electrical issues',
    'Deep cleaning',
    'Other maintenance',
  ];
  selectedTasks: string[] = [];
  filteredRooms: Room[] = [];

  ngOnInit() {
    // Initialize the filtered rooms
    this.filterAvailableRooms();
  }

  filterAvailableRooms() {
    this.filteredRooms = this.availableRooms.filter(
      (room) => room.id !== this.currentRoom.id && room.status === 'available'
    );
  }

  selectRoom(room: Room) {
    this.selectedRoom = room;
  }

  submitRoomChange() {
    if (!this.selectedRoom || !this.changeNote) return;

    this.isSubmitting = true;

    // Create updated versions of the rooms
    const newRoom = {
      ...this.selectedRoom,
      status: 'occupied',
      guest: this.currentRoom.guest,
      bookingDetails: this.currentRoom.bookingDetails,
    };

    const oldRoom = {
      ...this.currentRoom,
      status: 'maintenance',
      guest: undefined,
      bookingDetails: undefined,
    };

    this.onChangeRoom.emit({
      newRoom,
      note: this.changeNote,
      maintenanceNote:
        this.maintenanceNote + '\nTasks: ' + this.selectedTasks.join(', '),
      oldRoomStatus: oldRoom,
    });
  }

  goBack(): void {
    this.back.emit();
  }

  toggleTask(task: string) {
    const index = this.selectedTasks.indexOf(task);
    if (index === -1) {
      this.selectedTasks.push(task);
    } else {
      this.selectedTasks.splice(index, 1);
    }
  }
}
