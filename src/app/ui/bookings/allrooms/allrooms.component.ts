import { Component, OnInit } from '@angular/core';

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
  selector: 'app-allrooms',
  templateUrl: './allrooms.component.html',
  styleUrls: ['./allrooms.component.scss'],
})
export class AllroomsComponent implements OnInit {
  darkMode = false;
  sortBy = 'recommended';
  filteredRooms: Room[] = [];
  selectedRoom: Room | null = null;

  // Filters
  priceRange = [100, 400];
  capacityFilter = 0;

  // Make Math available in template
  Math = Math;

  private readonly sampleRooms: Room[] = [
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

  rooms: Room[] = [];

  constructor() {}

  ngOnInit(): void {
    this.rooms = [...this.sampleRooms];
    this.filteredRooms = [...this.rooms];
    this.sortRooms();
  }

  getStarRating(rating: number): string {
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 0.5 ? '½' : '';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return '★'.repeat(fullStars) + halfStar + '☆'.repeat(emptyStars);
  }

  getBedType(capacity: number): string {
    const bedTypes: { [key: number]: string } = {
      1: '1 single bed',
      2: '1 queen bed',
      3: '1 queen bed + 1 single bed',
      4: '1 king bed + sofa bed',
    };
    return bedTypes[capacity] || '1 king bed + sofa bed';
  }

  getFirstFewAmenities(amenities: string[], count: number): string[] {
    return amenities.slice(0, count);
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
  }

  sortRooms(): void {
    const sortFunctions: { [key: string]: (a: Room, b: Room) => number } = {
      'price-low': (a, b) => a.price - b.price,
      'price-high': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      recommended: (a, b) => {
        const scoreA = a.rating * 0.7 + ((500 - a.price) * 0.3) / 100;
        const scoreB = b.rating * 0.7 + ((500 - b.price) * 0.3) / 100;
        return scoreB - scoreA;
      },
    };

    this.filteredRooms.sort(
      sortFunctions[this.sortBy] || sortFunctions['recommended']
    );
  }

  filterRooms(): void {
    this.filteredRooms = this.rooms.filter((room) => {
      const priceMatch =
        room.price >= this.priceRange[0] && room.price <= this.priceRange[1];
      const capacityMatch =
        this.capacityFilter === 0 || room.capacity >= this.capacityFilter;
      const nameMatch = this.selectedRoom
        ? room.id === this.selectedRoom.id
        : true;

      return priceMatch && capacityMatch && nameMatch;
    });

    this.sortRooms();
  }

  updatePriceRange(min: number, max: number): void {
    this.priceRange = [Number(min), Number(max)];
    this.filterRooms();
  }

  updateCapacity(capacity: number): void {
    this.capacityFilter = capacity;
    this.filterRooms();
  }

  getRatingText(rating: number): string {
    if (rating >= 9) return 'Excellent';
    if (rating >= 8) return 'Very Good';
    if (rating >= 7) return 'Good';
    if (rating >= 6) return 'Pleasant';
    return 'Fair';
  }

  generateRandomDistance(): number {
    return Math.floor(Math.random() * 1000) + 100;
  }

  generateRandomReviews(): number {
    return Math.floor(Math.random() * 1000) + 100;
  }

  calculateTaxes(price: number): number {
    return Math.floor(price * 0.1);
  }

  hasDiscountPrice(price: number): boolean {
    return price > 200;
  }

  getOriginalPrice(price: number): number {
    return price + 50;
  }
  // Fixed method to prevent random generation on each change detection

  // TrackBy function for better performance
  trackByRoomId(index: number, room: Room): number {
    return room.id;
  }
}
