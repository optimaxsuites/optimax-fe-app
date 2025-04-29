import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

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
  selector: 'app-hotel-rooms',
  templateUrl: './hotel-rooms.component.html',
  styleUrl: './hotel-rooms.component.scss',
})
export class HotelRoomsComponent implements OnInit {
  @Output() roomCreated = new EventEmitter<Room>();
  @Output() cancel = new EventEmitter<void>();

  roomForm: FormGroup;

  roomTypes = ['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential'];

  roomStatuses = ['available', 'maintenance', 'dirty'];

  amenitiesList = [
    'WiFi',
    'TV',
    'AC',
    'Mini Bar',
    'Hair Dryer',
    'Safe',
    'Bathtub',
    'Balcony',
    'Ocean View',
    'City View',
    'Room Service',
    'Gym Access',
  ];

  selectedAmenities: string[] = [];
  amenitiesSelection: any;

  constructor(private fb: FormBuilder, private messageService: MessageService) {
    this.createForm();
    this.roomForm = this.fb.group({
      // form controls here
      roomType: ['', Validators.required],
      status: ['available', Validators.required],
      amenities: [[]],
    });
  }

  ngOnInit(): void {}

  createForm(): void {
    this.roomForm = this.fb.group({
      number: [
        '',
        [Validators.required, Validators.min(100), Validators.max(9999)],
      ],
      type: ['Standard', Validators.required],
      status: ['available', Validators.required],
      floor: ['', [Validators.required, Validators.min(1), Validators.max(99)]],
      rate: ['', [Validators.required, Validators.min(1000)]],
      beds: ['', [Validators.required, Validators.min(1), Validators.max(4)]],
      maxOccupancy: [
        '',
        [Validators.required, Validators.min(1), Validators.max(10)],
      ],
      description: [''],
      amenities: [this.selectedAmenities],
    });
  }

  onSubmit(): void {
    if (this.roomForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Form Error',
        detail: 'Please complete all required fields correctly.',
      });
      this.markFormGroupTouched(this.roomForm);
      return;
    }

    // Get existing rooms to check for duplicates and generate ID
    const storedRooms = localStorage.getItem('rooms');
    const rooms: Room[] = storedRooms ? JSON.parse(storedRooms) : [];

    // Check if room number already exists
    if (rooms.some((room) => room.number === this.roomForm.value.number)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Duplicate Room',
        detail: `Room number ${this.roomForm.value.number} already exists.`,
      });
      return;
    }

    // Generate new room ID (max existing ID + 1)
    const maxId =
      rooms.length > 0 ? Math.max(...rooms.map((room) => room.id)) : 0;
    const newId = maxId + 1;

    // Create new room object
    const newRoom: Room = {
      id: newId,
      number: this.roomForm.value.number,
      type: this.roomForm.value.type,
      status: this.roomForm.value.status,
      floor: this.roomForm.value.floor,
      rate: this.roomForm.value.rate,
      beds: this.roomForm.value.beds,
      maxOccupancy: this.roomForm.value.maxOccupancy,
      description: this.roomForm.value.description,
      amenities: this.selectedAmenities,
    };

    // Add room to localStorage
    rooms.push(newRoom);
    localStorage.setItem('rooms', JSON.stringify(rooms));

    // Emit event with new room
    this.roomCreated.emit(newRoom);

    // Show success message
    this.messageService.add({
      severity: 'success',
      summary: 'Room Created',
      detail: `Room ${newRoom.number} has been successfully created.`,
    });

    // Reset form
    this.resetForm();
  }

  resetForm(): void {
    this.roomForm.reset({
      type: 'Standard',
      status: 'available',
    });
    this.selectedAmenities = [];
  }

  onCancel(): void {
    this.cancel.emit();
  }

  toggleAmenity(amenity: string): void {
    const index = this.selectedAmenities.indexOf(amenity);
    if (index === -1) {
      this.selectedAmenities.push(amenity);
    } else {
      this.selectedAmenities.splice(index, 1);
    }

    // Update form control value
    this.roomForm.get('amenities')?.setValue(this.selectedAmenities);
  }

  isAmenitySelected(amenity: string): boolean {
    return this.selectedAmenities.includes(amenity);
  }

  // Helper method to mark all controls in a form group as touched
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
