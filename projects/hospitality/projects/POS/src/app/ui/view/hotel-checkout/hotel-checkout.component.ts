import { Component, ViewChild } from '@angular/core';
import { HotelFormComponent } from '../hotel-form/hotel-form.component';
import { HotelRoomdetailsComponent } from '../hotel-roomdetails/hotel-roomdetails.component';

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
  selector: 'app-hotel-checkout',
  templateUrl: './hotel-checkout.component.html',
  styleUrls: ['./hotel-checkout.component.scss'],
})
export class HotelCheckoutComponent {
  @ViewChild(HotelRoomdetailsComponent) roomDetails!: HotelRoomdetailsComponent;
  selectedRoom: Room | null = null;

  handleRoomSelected(room: Room): void {
    this.selectedRoom = room;
    this.roomDetails.showRoomDetailsModal(room);
  }

  onRoomStatusChanged(updatedRoom: Room): void {
    this.selectedRoom = updatedRoom;
    this.roomDetails.showRoomDetailsModal(updatedRoom);
  }
}
