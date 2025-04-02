import { Component, ViewChild } from '@angular/core';
import { HotelFormComponent } from '../hotel-form/hotel-form.component';

interface Room {
  id: number;
  type: string;
  status: string;
  floor?: number;
  guest?: string;
  selected?: boolean;
  bookingDetails?: {
    title?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    checkinDate: Date;
    checkoutDate: Date;
    adults: number;
    children: number;
    specialRequests?: string;
    paymentMethod: string;
    totalAmount?: number;
    paidAmount?: number;
    balanceAmount?: number;
  };
  beds?: number;
  maxOccupancy?: number;
  rate: number;
  description?: string;
  amenities?: string[];
}

interface BillItem {
  name: string;
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-hotel-checkout',
  templateUrl: './hotel-checkout.component.html',
  styleUrls: ['./hotel-checkout.component.scss'],
})
export class HotelCheckoutComponent {
  @ViewChild('roomDetails') roomDetails: any;
  @ViewChild('hotelForm') hotelForm!: HotelFormComponent;
  messageService: any;

  handleRoomSelected(room: Room | Room[]): void {
    if (Array.isArray(room)) {
      console.error(room);
    } else {
      this.roomDetails.showRoomDetailsModal(room);
    }
  }
}
