import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HotelserviceService } from '../../hospitality/hotelservice.service';
import { switchMap, tap, takeUntil } from 'rxjs/operators';
import { Subject, forkJoin } from 'rxjs';
import { AppConstants } from '../../../shared/constants/app.constants';
import { LoggerService } from '../../../shared/services/logger.service';
import { Room, ApiRoom } from '../../../shared/models';

interface DisplayRoom {
  id: number;
  roomNumber: string | number;
  name: string;
  typeId: number;
  description: string;
  price: number;
  capacity: number;
  amenities: { name: string, icon: string }[];
  images: string[];
  activeImageIndex: number;
  available: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  rooms: DisplayRoom[] = [];
  filteredRooms: DisplayRoom[] = [];
  roomTypes: { id: number; name: string }[] = [];
  selectedCategory: string | number = 'All Rooms';
  maxPrice = 200000;
  selectedAmenities: string[] = [];
  isMenuOpen = false;
  isLoading = false;
  error: string | null = null;
  showAuthModal = false;
  selectedRoomForAuth: DisplayRoom | null = null;
  branding: any = {
    companyName: 'OptimaxHospitality',
    logo: null,
    logoPosition: 'left'
  };
  uuid = 'default';

  private slideInterval: ReturnType<typeof setInterval> | null = null;
  private destroy$ = new Subject<void>();

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
    private route: ActivatedRoute,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    this.loadBranding();

    this.isLoading = true;
    this.error = null;

    const minDuration = new Promise<void>(resolve =>
      setTimeout(resolve, AppConstants.SKELETON_MIN_DURATION)
    );

    this.hotelService.getRoomTypes()
      .pipe(
        tap(types => {
          this.roomTypes = types as any;
        }),
        switchMap(() => this.hotelService.getRooms()),
        tap(() => {
          minDuration.then(() => {
            // Skeleton min duration completed
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (apiRooms: any[]) => {
          this.handleRoomsLoaded(apiRooms);
        },
        error: (err) => {
          this.handleRoomsLoadError(err);
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
    return apiRooms.map((room, i) => {
      const images = (room.imageURLs && room.imageURLs.length > 0)
        ? room.imageURLs
        : [this.fallbackImages[i % this.fallbackImages.length], ...this.fallbackImages.filter((_, idx) => idx !== (i % this.fallbackImages.length))];
      
      return {
        id: room.id,
        roomNumber: room.roomNumber,
        name: this.hotelService.getRoomTypeNameById(room.roomType),
        typeId: room.roomType,
        description: room.description || 'A premium room experience awaits.',
        price: room.rate,
        capacity: room.maxOccupancy,
        amenities: this.mapAmenities(room.amenities || []),
        images: images,
        activeImageIndex: 0,
        available: room.roomStatus === 'AVAILABLE'
      };
    });
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
    const dummyData = [
      { id: 101, roomNumber: 'D101', name: 'Deluxe Suite', description: 'Luxury suite with city view', price: 95000, capacity: 2, amenities: ['WiFi', 'AC', 'Breakfast'] },
      { id: 102, roomNumber: 'P202', name: 'Poolside Studio', description: 'Direct access to pool', price: 75000, capacity: 2, amenities: ['WiFi', 'Pool', 'Mini Bar'] },
      { id: 103, roomNumber: 'H303', name: 'Penthouse Loft', description: 'Stunning terrace view', price: 150000, capacity: 3, amenities: ['WiFi', 'Kitchen', 'Gym'] },
      { id: 104, roomNumber: 'S404', name: 'Premium Studio', description: 'Modern and minimalist', price: 65000, capacity: 2, amenities: ['WiFi', 'Workspace'] },
      { id: 105, roomNumber: 'E505', name: 'Executive Suite', description: 'Perfect for business stays', price: 110000, capacity: 2, amenities: ['WiFi', 'Lounge'] },
      { id: 106, roomNumber: 'F606', name: 'Family Room', description: 'Spacious for everyone', price: 120000, capacity: 4, amenities: ['WiFi', 'TV', 'Laundry'] }
    ];

    return dummyData.map((d, i) => ({
      ...d,
      typeId: (d.id % 4) + 1, // Mock typeId for dummy rooms
      amenities: this.mapAmenities(d.amenities),
      images: [this.fallbackImages[i % 3], this.fallbackImages[(i+1)%3], this.fallbackImages[(i+2)%3]],
      activeImageIndex: 0,
      available: true
    }));
  }

  private handleRoomsLoaded(apiRooms: ApiRoom[]): void {
    if (apiRooms && apiRooms.length > 0) {
      this.rooms = this.mapRooms(apiRooms);
    } else {
      this.rooms = this.getDummyRooms();
    }
    this.filteredRooms = [...this.rooms];
    this.startAutoSlide();
    this.isLoading = false;
    this.error = null;
    this.logger.info('Rooms loaded', { count: this.rooms.length });
  }

  private handleRoomsLoadError(err: any): void {
    this.logger.error('Error loading rooms', err);
    this.rooms = this.getDummyRooms();
    this.filteredRooms = [...this.rooms];
    this.startAutoSlide();
    this.isLoading = false;
  }

  private startAutoSlide(): void {
    this.clearSlideInterval();
    this.slideInterval = setInterval(() => {
      this.rooms.forEach(room => {
        if (room.images.length > 1) {
          room.activeImageIndex = (room.activeImageIndex + 1) % room.images.length;
        }
      });
    }, AppConstants.CAROUSEL_SLIDE_INTERVAL);
  }

  private clearSlideInterval(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.clearSlideInterval();
    this.destroy$.next();
    this.destroy$.complete();
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
    this.router.navigate(['/user/e-bookings/rooms/details', room.id, this.uuid]);
  }

  bookRoom(room: DisplayRoom): void {
    this.router.navigate(['/user/e-bookings/booking-form', room.id, this.uuid]);
  }

  openAuthModal(room: DisplayRoom): void {
    this.selectedRoomForAuth = room;
    this.showAuthModal = true;
  }

  closeAuthModal(): void {
    this.showAuthModal = false;
    this.selectedRoomForAuth = null;
  }

  proceedToCheckout(mode: 'signin' | 'signup' | 'guest'): void {
    this.showAuthModal = false;

    if (mode === 'guest') {
      if (!this.selectedRoomForAuth) return;
      this.router.navigate(['/user/e-bookings/checkout', this.selectedRoomForAuth.id, this.uuid]);
    } else {
      const authPath = mode === 'signin' ? 'login' : 'register';
      const returnUrl = this.selectedRoomForAuth
        ? `/user/e-bookings/checkout/${this.selectedRoomForAuth.id}/${this.uuid}`
        : `/user/e-bookings/home/${this.uuid}`;

      this.router.navigate(['/user/e-bookings/auth', authPath, this.uuid], {
        queryParams: { returnUrl: returnUrl }
      });
    }
  }

  setCategory(category: string | number): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredRooms = this.rooms.filter(room => {
      // Category Filter
      let categoryMatch = true;
      if (this.selectedCategory !== 'All Rooms') {
        categoryMatch = room.typeId === Number(this.selectedCategory);
      }

      // Price Filter
      const priceMatch = room.price <= this.maxPrice;

      // Amenities Filter
      const amenityMatch = this.selectedAmenities.length === 0 || 
        this.selectedAmenities.every(sa => room.amenities.some(ra => ra.name.toLowerCase().includes(sa.toLowerCase())));

      return categoryMatch && priceMatch && amenityMatch;
    });
  }

  toggleAmenity(amenity: string): void {
    const idx = this.selectedAmenities.indexOf(amenity);
    if (idx >= 0) this.selectedAmenities.splice(idx, 1);
    else this.selectedAmenities.push(amenity);
    this.applyFilters();
  }

  updatePrice(event: any): void {
    this.maxPrice = event.target.value;
    this.applyFilters();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
