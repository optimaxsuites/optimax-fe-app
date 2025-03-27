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
  // This is just a shell component that hosts the other components

  @ViewChild('roomDetails') roomDetails: any;
  @ViewChild('hotelForm') hotelForm!: HotelFormComponent;
  messageService: any;

  onRoomSelected(rooms: Room[]): void {
    this.hotelForm.openBookingForm(rooms);
  }

  showBookingForm = false;
  showCheckoutSummary = false;
  currentRoom: Room | null = null;
  checkoutBillItems: BillItem[] = [];
  checkoutTotal = 0;

  handleBookNow(rooms: Room[]) {
    this.hotelForm.openBookingForm(rooms);
    this.showBookingForm = true;
    this.showCheckoutSummary = false;
  }

  handleCheckIn(room: Room) {
    this.hotelForm.openCheckInForm(room);
    this.showBookingForm = true;
    this.showCheckoutSummary = false;
  }

  handleCheckOut(room: Room) {
    this.currentRoom = room;
    // Generate sample bill items - in real app this would come from service
    this.checkoutBillItems = [
      {
        name: 'Room Charges',
        price: room.rate,
        quantity: this.calculateNights(room),
      },
      { name: 'Mini Bar', price: 5000, quantity: 1 },
      { name: 'Laundry', price: 3000, quantity: 2 },
    ];
    this.checkoutTotal = this.checkoutBillItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    this.showBookingForm = false;
    this.showCheckoutSummary = true;
  }

  confirmCheckout() {
    if (this.currentRoom) {
      this.currentRoom.status = 'dirty';
      delete this.currentRoom.guest;
      delete this.currentRoom.bookingDetails;

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Checkout Complete',
        detail: `Room {this.currentRoom.id} is now marked for cleaning`,
      });

      this.showCheckoutSummary = false;
      this.currentRoom = null;
    }
  }

  private calculateNights(room: Room): number {
    if (!room.bookingDetails) return 0;
    const checkin = new Date(room.bookingDetails.checkinDate);
    const checkout = new Date(room.bookingDetails.checkoutDate);
    return Math.ceil(
      (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  handleRoomSelected(room: Room | Room[]): void {
    if (Array.isArray(room)) {
      // Handle the case where multiple rooms are selected
      console.error(
        'Multiple rooms selected, but only one room is expected:',
        room
      );
    } else {
      this.roomDetails.showRoomDetailsModal(room);
    }
  }
}
