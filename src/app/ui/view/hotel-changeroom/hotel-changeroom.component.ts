import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import {
  HotelserviceService,
  Room,
  Booking,
  Guest,
  RoomTypeDTO,
} from '../../hospitality/hotelservice.service';

@Component({
  selector: 'app-hotel-changeroom',
  templateUrl: './hotel-changeroom.component.html',
  styleUrls: ['./hotel-changeroom.component.scss'],
})
export class HotelChangeroomComponent implements OnInit {
  @Input() currentRoom!: Room;
  availableRooms: Room[] = [];
  @Output() onChangeRoom = new EventEmitter<{
    newRoom: Room;
    note: string;
    maintenanceNote: string;
    oldRoomStatus: Room;
    guest?: Guest;
    booking?: Booking;
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

  bookings: Booking[] = [];
  guests: Guest[] = [];
  roomBookingsMap: Map<number, Booking> = new Map();
  roomGuestsMap: Map<number, Guest> = new Map();

  roomTypes: RoomTypeDTO[] = [];

  constructor(private hotelService: HotelserviceService) {}

  ngOnInit() {
    this.hotelService.getRooms().subscribe((rooms) => {
      this.availableRooms = rooms;
      this.filterAvailableRooms();
    });
    this.hotelService.getBookings().subscribe((bookings) => {
      this.bookings = bookings;
      this.buildRoomBookingsMap();
    });
    this.hotelService.getGuests().subscribe((guests) => {
      this.guests = guests;
      this.buildRoomGuestsMap();
    });
    this.hotelService.getRoomTypes().subscribe((types) => {
      this.roomTypes = types;
    });
  }

  buildRoomBookingsMap() {
    this.roomBookingsMap.clear();
    this.bookings.forEach((booking) => {
      booking.rooms.forEach((roomId) => {
        this.roomBookingsMap.set(roomId, booking);
      });
    });
  }

  buildRoomGuestsMap() {
    this.roomGuestsMap.clear();
    this.bookings.forEach((booking) => {
      let guest: Guest | undefined;
      if (typeof booking.guest === 'number') {
        guest = this.guests.find((g) => g.id === booking.guest);
      } else {
        guest = booking.guest as Guest;
      }
      booking.rooms.forEach((roomId) => {
        if (guest) {
          this.roomGuestsMap.set(roomId, guest);
        }
      });
    });
  }

  getBookingForRoom(roomId: number): Booking | undefined {
    return this.roomBookingsMap.get(roomId);
  }

  getGuestForRoom(roomId: number): Guest | undefined {
    return this.roomGuestsMap.get(roomId);
  }

  filterAvailableRooms() {
    this.filteredRooms = this.availableRooms.filter(
      (room) =>
        room.id !== this.currentRoom.id && room.roomStatus === 'AVAILABLE'
    );
  }

  selectRoom(room: Room) {
    this.selectedRoom = room;
  }

  submitRoomChange() {
    if (!this.selectedRoom || !this.changeNote) return;

    this.isSubmitting = true;

    // Create updated versions of the rooms (do not add guest/booking directly)
    const newRoom: Room = {
      ...this.selectedRoom,
      roomStatus: 'OCCUPIED',
    };

    const oldRoom: Room = {
      ...this.currentRoom,
      roomStatus: 'UNDER_MAINTENANCE',
    };

    this.onChangeRoom.emit({
      newRoom,
      note: this.changeNote,
      maintenanceNote:
        this.maintenanceNote + '\nTasks: ' + this.selectedTasks.join(', '),
      oldRoomStatus: oldRoom,
      guest: this.getGuestForRoom(this.currentRoom.id),
      booking: this.getBookingForRoom(this.currentRoom.id),
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

  getRoomTypeName(roomTypeId: number): string {
    return this.roomTypes.find((rt) => rt.id === roomTypeId)?.name || '';
  }
}
