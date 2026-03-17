import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HotelserviceService, Room as ApiRoom } from '../../hospitality/hotelservice.service';

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
      name: 'Luxury Penthouse',
      description: 'Stunning 4-bedroom penthouse with private pool and panoramic views of the Atlantic',
      price: 450,
      capacity: 8,
      size: 450,
      amenities: ['Private Pool', 'Ocean View', '24/7 Butler', 'Smart Home', 'High-Speed Wi-Fi'],
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800',
      rating: 9.8,
      available: true,
    },
    {
      id: 2,
      name: 'Victoria Island Executive',
      description: 'Modern executive suite in the heart of VI business district, perfect for the modern traveler',
      price: 120,
      capacity: 2,
      size: 45,
      amenities: ['Business Center', 'Gym Access', 'Airport Shuttle', 'King Bed', 'Breakfast Included'],
      imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
      rating: 9.2,
      available: true,
    },
    {
      id: 3,
      name: 'Lekki Garden Villa',
      description: 'Serene garden villa with lush greenery and state-of-the-art entertainment system',
      price: 280,
      capacity: 4,
      size: 120,
      amenities: ['Private Garden', 'Game Room', 'Chef on Call', 'Secure Parking', 'Ultra-fast Wi-Fi 6'],
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800',
      rating: 9.5,
      available: true,
    },
    {
      id: 4,
      name: 'Ikoyi Heritage Suite',
      description: 'Classic luxury meets modern comfort in this historic Ikoyi residence',
      price: 350,
      capacity: 2,
      size: 85,
      amenities: ['Clawfoot Tub', 'Vintage Decor', 'Personal Concierge', 'Tea Room', 'Poolside Lounge'],
      imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800',
      rating: 9.6,
      available: true,
    },
    {
      id: 5,
      name: 'Banana Island Retreat',
      description: 'Exclusive waterfront retreat with unparalleled security and luxury amenities',
      price: 850,
      capacity: 6,
      size: 380,
      amenities: ['Waterfront', 'Private Yacht Dock', 'Cinema', 'Infinity Pool', 'Helipad Access'],
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&q=80&w=800',
      rating: 9.9,
      available: true,
    },
    {
      id: 6,
      name: 'Mainland Cozy Loft',
      description: 'Chic urban loft for the creative soul, located in the vibrant Ikeja GRA',
      price: 85,
      capacity: 2,
      size: 35,
      amenities: ['Creative Workspace', 'Rooftop Bar', 'City View', 'Minimalist Design', 'Coffee Bar'],
      imageUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800',
      rating: 8.9,
      available: true,
    },
  ];

  rooms: Room[] = [];

  constructor(
    private router: Router,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.hotelService.getRooms().subscribe({
      next: (apiRooms: ApiRoom[]) => {
        this.rooms = apiRooms.map((room: ApiRoom) => ({
          id: room.id,
          name: this.hotelService.getRoomTypeNameById(room.roomType),
          description: room.description || 'Experience premium luxury in this meticulously designed space.',
          price: room.rate,
          capacity: room.maxOccupancy,
          size: room.floor * 25 + 30, // Dummy size based on floor
          amenities: room.amenities && room.amenities.length > 0 ? room.amenities : ['Free WiFi', 'Air Conditioning', 'TV'],
          imageUrl: (room.imageURLs && room.imageURLs.length > 0) ? room.imageURLs[0] : 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800',
          rating: 4.5 + (Math.random() * 0.5), // Premium stays get 4.5+ rating
          available: room.roomStatus === 'AVAILABLE'
        }));
        this.filteredRooms = [...this.rooms];
        this.sortRooms();
      },
      error: (err: any) => console.error('Error loading rooms:', err)
    });
  }

  viewRoomDetails(room: any): void {
    // Navigate to booking form (acting as detail page) with room ID as uuid
    this.router.navigate(['/user/booking-form', room.id]);
  }

  getStarRating(rating: number): string {
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 0.5 ? '½' : '';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return '★'.repeat(fullStars) + halfStar + '☆'.repeat(emptyStars);
  }

  navigateTobooking() {
    const uuid = 'abc123';
    this.router.navigate([`/user/multiple-rooms/uuid`]);
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
