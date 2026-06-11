import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Location } from '@angular/common';
interface Room {
  id: number;
  name: string;
  description: string;
  price: number;
  capacity: number;
  size: number;
  amenities: string[];
  imageUrl: string;
  rating: number;
  available: boolean;
}
@Component({
  selector: 'app-multiple-bookings',
  templateUrl: './multiple-bookings.component.html',
  styleUrl: './multiple-bookings.component.scss',
})
export class MultipleBookingsComponent {
  @Output() confirmed = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();

  constructor(private location: Location) {}

  selectedRooms: { room: Room; count: number }[] = [];

  getSelectedCount(room: Room): number {
    const selected = this.selectedRooms.find((r) => r.room.id === room.id);
    return selected ? selected.count : 0;
  }

  /**
   * Increments the count of a selected room or adds it to the selection.
   * @param room - The room object to increment or add.
   */
  incrementRoom(room: Room): void {
    const existing: { room: Room; count: number } | undefined =
      this.selectedRooms.find((r) => r.room.id === room.id);
    if (existing) {
      existing.count++;
    } else {
      this.selectedRooms.push({ room, count: 1 });
    }
  }

  decrementRoom(room: Room): void {
    const existing = this.selectedRooms.find((r) => r.room.id === room.id);
    if (existing) {
      existing.count--;
      if (existing.count <= 0) {
        this.selectedRooms = this.selectedRooms.filter(
          (r) => r.room.id !== room.id
        );
      }
    }
  }

  // canAddMore(room: Room): boolean {
  //   const selected = this.getSelectedCount(room);
  //   return selected < room.available;
  // }

  get selectedRoomsSummary() {
    return this.selectedRooms.map((item) => ({
      name: item.room.name,
      count: item.count,
      totalPrice: item.count * item.room.price,
    }));
  }

  get totalSelectedRooms(): number {
    return this.selectedRooms.reduce((sum, item) => sum + item.count, 0);
  }

  get totalPrice(): number {
    return this.selectedRooms.reduce(
      (sum, item) => sum + item.count * item.room.price,
      0
    );
  }

  confirmSelection(): void {
    this.confirmed.emit(this.selectedRooms);
  }

  closeModal(): void {
    this.back.emit();
    this.location.back();
  }

  rooms: Room[] = [
    {
      id: 1,
      name: 'Studio Apartment',
      description:
        'Modern studio apartment with kitchen facilities and city access',
      price: 183,
      capacity: 2,
      size: 28,
      amenities: ['Free WiFi', 'Air Conditioning', 'TV', 'Mini Bar', 'Safe'],
      imageUrl:
        'https://images.unsplash.com/photo-1566669437685-5f63c6a685f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 8.6,
      available: true,
    },
    {
      id: 2,
      name: 'Presidential Suite',
      description:
        'Contemporary hotel with modern amenities and great connectivity',
      price: 103,
      capacity: 1,
      size: 24,
      amenities: [
        'Free WiFi',
        'Air Conditioning',
        'TV',
        'Free cancellation',
        'No prepayment',
      ],
      imageUrl:
        'https://images.unsplash.com/photo-1592229505726-ca121043b6ec?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 7.5,
      available: true,
    },
    {
      id: 3,
      name: 'Deluxe Room',
      description: 'Charming boutique hotel in the heart of Amsterdam',
      price: 245,
      capacity: 2,
      size: 35,
      amenities: [
        'Free WiFi',
        'Air Conditioning',
        'TV',
        'Safe',
        'Private bathroom',
      ],
      imageUrl:
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 8.9,
      available: true,
    },
    {
      id: 4,
      name: 'Deluxe Room',
      description: 'Luxury accommodation with stunning canal views',
      price: 320,
      capacity: 1,
      size: 40,
      amenities: [
        'Free WiFi',
        'Air Conditioning',
        'TV',
        'Mini Bar',
        'Safe',
        'Balcony',
        'Breakfast Included',
      ],
      imageUrl:
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 9.1,
      available: true,
    },
    {
      id: 5,
      name: 'Executive Business Room',
      description: 'Perfect for business travelers with modern facilities',
      price: 165,
      capacity: 1,
      size: 32,
      amenities: [
        'Free WiFi',
        'Air Conditioning',
        'TV',
        'Free cancellation',
        'Private bathroom',
      ],
      imageUrl:
        'https://images.unsplash.com/photo-1582719471381-97122a67b73f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 8.2,
      available: true,
    },
    {
      id: 6,
      name: 'Suites',
      description: 'Peaceful garden setting with modern comforts',
      price: 195,
      capacity: 2,
      size: 45,
      amenities: [
        'Free WiFi',
        'Air Conditioning',
        'TV',
        'Mini Bar',
        'Balcony',
        'No prepayment',
      ],
      imageUrl:
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      rating: 8.4,
      available: true,
    },
  ];
}
