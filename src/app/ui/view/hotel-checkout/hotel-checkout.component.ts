import { Component, ViewChild } from '@angular/core';
import { HotelFormComponent } from '../hotel-form/hotel-form.component';
import { HotelRoomdetailsComponent } from '../hotel-roomdetails/hotel-roomdetails.component';
import { HotelRoomlistComponent } from '../hotel-roomlist/hotel-roomlist.component';
import { Room } from '../../hospitality/hotelservice.service';

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

  onBookingFormRequested(rooms: Room[]): void {
    // You can handle the booking form request here
    // For example, open a booking form modal with the selected rooms
    console.log('Booking form requested for rooms:', rooms);
    // You might want to implement a booking form component and show it here
  }

  onBack(): void {
    this.selectedRoom = null;
  }
}
