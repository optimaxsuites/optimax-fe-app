import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HotelserviceService, Room as ApiRoom } from '../../hospitality/hotelservice.service';

interface Room {
  id: number;
  roomNumber: number;
  roomType: any;
  description: string;
  rate: number;
  capacity: number;
  size: number;
  amenities: string[];
  imageURLs: string[];
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

  rooms: Room[] = [];

   constructor(
    private router: Router,
    private route: ActivatedRoute,
    private hotelService: HotelserviceService
  ) {}

  uuid = '';

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    this.loadRooms();
  }

  loadRooms(): void {
    this.hotelService.getRooms().subscribe({
      next: (apiRooms: ApiRoom[]) => {
        this.rooms = apiRooms.map((room: ApiRoom) => ({
          id: room.id,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          description: room.description || 'Experience premium luxury in this meticulously designed space.',
          rate: room.rate,
          capacity: room.maxOccupancy,
          size: room.floor * 25 + 30, // Dummy size based on floor
          amenities: room.amenities && room.amenities.length > 0 ? room.amenities : ['Free WiFi', 'Air Conditioning', 'TV'],
          imageURLs: room.imageURLs || [],
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
    // Navigate to booking form with room ID and hotel UUID
    this.router.navigate(['/user/e-bookings/booking-form', room.id, this.uuid]);
  }

  bookRoom(room: Room): void {
    this.router.navigate(['/hospitality', 'bookings', 'room-select', this.uuid]);
  }

  getStarRating(rating: number): string {
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 0.5 ? '½' : '';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return '★'.repeat(fullStars) + halfStar + '☆'.repeat(emptyStars);
  }

  navigateTobooking() {
    this.router.navigate([`/user/e-bookings/multiple-rooms/${this.uuid}`]);
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
      'price-low': (a, b) => a.rate - b.rate,
      'price-high': (a, b) => b.rate - a.rate,
      rating: (a, b) => b.rating - a.rating,
      recommended: (a, b) => {
        const scoreA = a.rating * 0.7 + ((500 - a.rate) * 0.3) / 100;
        const scoreB = b.rating * 0.7 + ((500 - b.rate) * 0.3) / 100;
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
        room.rate >= this.priceRange[0] && room.rate <= this.priceRange[1];
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
