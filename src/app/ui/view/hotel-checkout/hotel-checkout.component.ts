import { Component, ViewChild } from '@angular/core';

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
  @ViewChild(HotelRoomlistComponent) roomList!: HotelRoomlistComponent;

  selectedRoom: Room | null = null;
  showRoomDetails: boolean = false;

  handleRoomSelected(room: Room): void {

    this.selectedRoom = room;
    this.roomDetails.showRoomDetailsModal(room);
  }

  // onRoomStatusChanged(updatedRoom: Room): void {
  //   this.selectedRoom = updatedRoom;
  //   this.roomDetails.showRoomDetailsModal(updatedRoom);
  //   if (!room) return;
  //   this.selectedRoom = room;
  //   this.showRoomDetails = true;

  //   // Use setTimeout to ensure the view is updated before calling the method
  //   setTimeout(() => {
  //     if (this.roomDetails) {
  //       this.roomDetails.loadRoomDetails(room.id!);
  //     }
  //   }, 0);
  // }



  onRoomStatusChanged(updatedRoom: Room): void {
    if (!updatedRoom) return;

    console.log('Room status changed:', updatedRoom);
    this.selectedRoom = updatedRoom;

    // Refresh the room list to show updated status
    if (this.roomList) {
      this.roomList.loadAllData();
    }

    // Update room details if currently showing
    if (this.showRoomDetails && this.roomDetails) {
      this.roomDetails.loadRoomDetails(updatedRoom.id!);
    }
  }

  onBookingFormRequested(rooms: Room[]): void {
    console.log('Booking form requested for rooms:', rooms);
    // Implement booking form logic here
  }

  onBack(): void {
    this.selectedRoom = null;
    this.showRoomDetails = false;
  }

  closeRoomDetails(): void {
    this.showRoomDetails = false;
    this.selectedRoom = null;
  }
}
