import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface Guest {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
}

export interface BookingDetails {
  firstName: string;
  lastName: string;
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

@Component({
  selector: 'app-hotel-changeroom',
  templateUrl: './hotel-changeroom.component.html',
  styleUrl: './hotel-changeroom.component.scss',
})
export class HotelChangeroomComponent {
  @Input() currentRoom!: Room;
  @Input() availableRooms: Room[] = [];
  @Output() onChangeRoom = new EventEmitter<{ newRoom: Room; note: string }>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() back = new EventEmitter();

  selectedRoomId: number | null = null;
  changeNote: string = '';
  isSubmitting = false;

  // Filter out the current room from available rooms
  get filteredAvailableRooms() {
    return this.availableRooms.filter(
      (room) => room.id !== this.currentRoom.id && room.status === 'available'
    );
  }

  selectRoom(roomId: number) {
    this.selectedRoomId = roomId;
  }

  submitRoomChange() {
    if (!this.selectedRoomId || !this.changeNote) return;

    this.isSubmitting = true;
    const newRoom = this.availableRooms.find(
      (r) => r.id === this.selectedRoomId
    )!;

    this.onChangeRoom.emit({
      newRoom,
      note: this.changeNote,
    });
  }

  goBack(): void {
    this.back.emit();
  }
}
