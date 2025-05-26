import { Component, ViewChild } from '@angular/core';
import { HotelFormComponent } from '../hotel-form/hotel-form.component';
import { HotelRoomdetailsComponent } from '../hotel-roomdetails/hotel-roomdetails.component';

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
  selector: 'app-hotel-checkout',
  templateUrl: './hotel-checkout.component.html',
  styleUrls: ['./hotel-checkout.component.scss'],
})
export class HotelCheckoutComponent {
  @ViewChild(HotelRoomdetailsComponent) roomDetails!: HotelRoomdetailsComponent;
  selectedRoom: Room | null = null;

  handleRoomSelected(room: Room): void {
    if (!room) return;

    this.selectedRoom = room;
    if (this.roomDetails) {
      this.roomDetails.showRoomDetailsModal(room);
    }
  }

  onRoomStatusChanged(updatedRoom: Room): void {
    if (!updatedRoom) return;

    this.selectedRoom = updatedRoom;
    if (this.roomDetails) {
      this.roomDetails.showRoomDetailsModal(updatedRoom);
    }
  }
}
