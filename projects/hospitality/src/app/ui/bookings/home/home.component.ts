import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HotelserviceService, Room as ApiRoom } from '../../hospitality/hotelservice.service';

interface DisplayRoom {
  id: number;
  roomNumber: string | number;
  name: string;
  description: string;
  price: number;
  capacity: number;
  amenities: { name: string, icon: string }[];
  imageUrl: string;
  available: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  rooms: DisplayRoom[] = [];
  branding: any = {
    companyName: 'OptimaxHospitality',
    logo: null,
    logoPosition: 'left'
  };

  private readonly fallbackImages = [
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800',
  ];

  private readonly amenityIcons: Record<string, string> = {
    'wifi': 'fa-solid fa-wifi',
    'ac': 'fa-solid fa-snowflake',
    'tv': 'fa-solid fa-tv',
    'breakfast': 'fa-solid fa-mug-hot',
    'pool': 'fa-solid fa-person-swimming',
    'gym': 'fa-solid fa-dumbbell',
    'parking': 'fa-solid fa-car',
    'bar': 'fa-solid fa-martini-glass-cocktail',
    'kitchen': 'fa-solid fa-kitchen-set',
    'workspace': 'fa-solid fa-briefcase',
    'lounge': 'fa-solid fa-couch',
    'laundry': 'fa-solid fa-shirt'
  };

  constructor(
    private hotelService: HotelserviceService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadBranding();
    this.hotelService.getRooms().subscribe({
      next: (apiRooms: ApiRoom[]) => {
        if (apiRooms && apiRooms.length > 0) {
          this.rooms = this.mapRooms(apiRooms);
        } else {
          this.rooms = this.getDummyRooms();
        }
      },
      error: (err: any) => {
        console.error('Error loading rooms:', err);
        this.rooms = this.getDummyRooms();
      }
    });
  }

  private loadBranding(): void {
    const saved = localStorage.getItem('optimax_settings');
    if (saved) {
      this.branding = JSON.parse(saved);
    }
  }

  private mapRooms(apiRooms: ApiRoom[]): DisplayRoom[] {
    return apiRooms.map((room, i) => ({
      id: room.id,
      roomNumber: room.roomNumber,
      name: this.hotelService.getRoomTypeNameById(room.roomType),
      description: room.description || 'A premium room experience awaits.',
      price: room.rate,
      capacity: room.maxOccupancy,
      amenities: this.mapAmenities(room.amenities),
      imageUrl: (room.imageURLs && room.imageURLs.length > 0)
        ? room.imageURLs[0]
        : this.fallbackImages[i % this.fallbackImages.length],
      available: room.roomStatus === 'AVAILABLE'
    }));
  }

  private mapAmenities(amenities: any[]): { name: string, icon: string }[] {
    const raw = Array.isArray(amenities) ? amenities : [];
    if (raw.length === 0) return [
      { name: 'Fast WiFi', icon: 'fa-solid fa-wifi' },
      { name: 'AC', icon: 'fa-solid fa-snowflake' },
      { name: 'Smart TV', icon: 'fa-solid fa-tv' }
    ];

    return raw.map(a => {
      const name = typeof a === 'string' ? a : (a.name || 'Amenity');
      const lower = name.toLowerCase();
      let icon = 'fa-solid fa-check-circle';
      
      for (const [key, value] of Object.entries(this.amenityIcons)) {
        if (lower.includes(key)) {
          icon = value;
          break;
        }
      }
      return { name, icon };
    });
  }

  private getDummyRooms(): DisplayRoom[] {
    return [
      { id: 101, roomNumber: 'D101', name: 'Deluxe Suite', description: 'Luxury suite with city view', price: 95000, capacity: 2, amenities: this.mapAmenities(['WiFi', 'AC', 'Breakfast']), imageUrl: this.fallbackImages[0], available: true },
      { id: 102, roomNumber: 'P202', name: 'Poolside Studio', description: 'Direct access to pool', price: 75000, capacity: 2, amenities: this.mapAmenities(['WiFi', 'Pool', 'Mini Bar']), imageUrl: this.fallbackImages[1], available: true },
      { id: 103, roomNumber: 'H303', name: 'Penthouse Loft', description: 'Stunning terrace view', price: 150000, capacity: 3, amenities: this.mapAmenities(['WiFi', 'Kitchen', 'Gym']), imageUrl: this.fallbackImages[2], available: true },
      { id: 104, roomNumber: 'S404', name: 'Premium Studio', description: 'Modern and minimalist', price: 65000, capacity: 2, amenities: this.mapAmenities(['WiFi', 'Workspace']), imageUrl: this.fallbackImages[0], available: true },
      { id: 105, roomNumber: 'E505', name: 'Executive Suite', description: 'Perfect for business stays', price: 110000, capacity: 2, amenities: this.mapAmenities(['WiFi', 'Lounge']), imageUrl: this.fallbackImages[1], available: true },
      { id: 106, roomNumber: 'F606', name: 'Family Room', description: 'Spacious for everyone', price: 120000, capacity: 4, amenities: this.mapAmenities(['WiFi', 'TV', 'Laundry']), imageUrl: this.fallbackImages[2], available: true }
    ];
  }

  getCategory(room: DisplayRoom): string {
    const name = room.name.toLowerCase();
    if (name.includes('suite') || name.includes('penthouse')) return 'SUITE';
    if (name.includes('deluxe') || name.includes('premium')) return 'DELUXE';
    if (name.includes('studio') || name.includes('loft')) return 'STUDIO';
    if (name.includes('pool')) return 'POOLSIDE';
    const categories = ['DELUXE', 'POOLSIDE', 'STUDIO'];
    return categories[room.id % categories.length];
  }

  viewRoomDetails(room: DisplayRoom): void {
    // Navigate relatively to the booking-form within the same bookings/:uuid shell
    this.router.navigate(['../booking-form', room.id], { relativeTo: this.route });
  }
}
