import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { HotelserviceService } from '../../hospitality/hotelservice.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { AppConstants } from '../../../shared/constants/app.constants';
import { RoomDetail, BrandSettings } from '../../../shared/models';

@Component({
  selector: 'app-room-details',
  templateUrl: './room-details.component.html',
  styleUrls: ['./room-details.component.scss'],
})
export class RoomDetailsComponent implements OnInit, OnDestroy {
  room: RoomDetail | null = null;
  uuid: string = 'default';
  loading = true;
  activeImageIndex = 0;
  additionalServices: any[] = [];
  selectedServices: Set<number> = new Set();
  totalPrice = 0;
  isMenuOpen = false;
  showAuthModal = false;
  recommendedRooms: any[] = [];
  branding: BrandSettings = {
    companyName: 'OptimaxHospitality',
    logo: null,
    logoPosition: 'left'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelserviceService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id');
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    this.loadBranding();

    if (!roomId) {
      this.logger.error('Room ID not provided');
      return;
    }

    const roomIdNumber = Number(roomId);

    this.hotelService.getRoomTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadRoomDetails(roomIdNumber);
          this.loadServices();
          this.loadRecommendedRooms(roomIdNumber);
        },
        error: (err) => {
          this.logger.error('Error loading room types', err);
          this.loadRoomDetails(roomIdNumber);
          this.loadServices();
          this.loadRecommendedRooms(roomIdNumber);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBranding(): void {
    const saved = localStorage.getItem(AppConstants.STORAGE_BRANDING);
    if (saved) {
      try {
        this.branding = JSON.parse(saved);
      } catch (err) {
        this.logger.error('Error parsing branding', err);
      }
    }
  }

  loadRoomDetails(id: number): void {
    this.loading = true;
    const minDuration = new Promise<void>(resolve =>
      setTimeout(resolve, AppConstants.SKELETON_MIN_DURATION)
    );

    this.hotelService.getRoom(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (room) => {
          this.setupRoom(room, minDuration);
        },
        error: (err) => {
          this.logger.error('Error loading room details', err);
          this.setupRoom(this.getDummyRoom(id), minDuration);
        }
      });
  }

  private setupRoom(room: any, minDuration: Promise<void>): void {
    const apiImages = room.imageURLs && room.imageURLs.length > 0 ? room.imageURLs : [];
    const testImages = [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1200'
    ];

    this.room = {
      ...room,
      id: room.id,
      roomNumber: room.roomNumber || 'N/A',
      roomTypeName: this.hotelService.getRoomTypeNameById(room.roomType),
      description: room.description || 'A premium room experience awaits.',
      displayPrice: room.rate || 0,
      capacity: room.maxOccupancy || 0,
      bedsCount: room.beds || 0,
      floorNumber: room.floor || 0,
      amenities: (room.amenities && room.amenities.length > 0) ? room.amenities : ['Breakfast Included', 'Lounge Access', 'Gym & Fitness'],
      images: apiImages.length > 0 ? apiImages : testImages,
      rating: (room as any).rating || 4.8,
      reviewsCount: (room as any).reviewsCount || 12
    };

    this.calculateTotal();
    minDuration.then(() => {
      this.loading = false;
    });
  }

  private getDummyRoom(id: number): any {
    const dummyRooms: any = {
      101: { id: 101, roomNumber: 'D101', roomType: 1, rate: 95000, maxOccupancy: 2, beds: 1, floor: 1, description: 'Luxury suite with city view', amenities: ['WiFi', 'AC', 'Breakfast'] },
      102: { id: 102, roomNumber: 'P202', roomType: 2, rate: 75000, maxOccupancy: 2, beds: 1, floor: 2, description: 'Direct access to pool', amenities: ['WiFi', 'Pool', 'Mini Bar'] },
      103: { id: 103, roomNumber: 'H303', roomType: 3, rate: 150000, maxOccupancy: 3, beds: 2, floor: 3, description: 'Stunning terrace view', amenities: ['WiFi', 'Kitchen', 'Gym'] }
    };
    return dummyRooms[id] || { id, roomNumber: `R${id}`, roomType: 1, rate: 50000, maxOccupancy: 2, beds: 1, floor: 1, description: 'Premium room', amenities: ['WiFi'] };
  }

  loadServices(): void {
    this.hotelService.getAdditionalDetails()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (services) => {
          this.additionalServices = services;
        },
        error: (err) => {
          this.logger.error('Error loading services', err);
        }
      });
  }

  loadRecommendedRooms(currentRoomId: number): void {
    this.hotelService.getRooms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rooms: any[]) => {
        const testImages = [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600',
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=600',
        ];
        this.recommendedRooms = rooms
          .filter(r => r.id !== currentRoomId && r.roomStatus === 'AVAILABLE')
          .slice(0, 4)
          .map((r, i) => ({
            ...r,
            roomTypeName: this.hotelService.getRoomTypeNameById(r.roomType),
            displayPrice: r.rate || 0,
            coverImage: (r.imageURLs && r.imageURLs[0]) || testImages[i % testImages.length],
          }));
      }
    });
  }

  openAuthModal(): void {
    this.showAuthModal = true;
  }

  closeAuthModal(): void {
    this.showAuthModal = false;
  }

  proceedToCheckout(mode: 'signin' | 'signup' | 'guest'): void {
    this.showAuthModal = false;

    if (mode === 'guest') {
      if (!this.room) return;
      const serviceIds = Array.from(this.selectedServices).join(',');
      const extras = serviceIds ? { queryParams: { services: serviceIds } } : {};
      this.router.navigate(['/user/e-bookings/checkout', this.room.id, this.uuid], extras);
    } else {
      const authPath = mode === 'signin' ? 'login' : 'register';
      const serviceIds = Array.from(this.selectedServices).join(',');
      const checkoutUrl = this.room ? `/user/e-bookings/checkout/${this.room.id}/${this.uuid}` : `/user/e-bookings/home/${this.uuid}`;
      const returnUrl = (this.room && serviceIds) ? `${checkoutUrl}?services=${serviceIds}` : checkoutUrl;

      this.router.navigate(['/e-bookings/auth', authPath, this.uuid], {
        queryParams: { returnUrl: returnUrl }
      });
    }
  }

  toggleService(serviceId: number): void {
    if (this.selectedServices.has(serviceId)) {
      this.selectedServices.delete(serviceId);
    } else {
      this.selectedServices.add(serviceId);
    }
    this.calculateTotal();
  }

  calculateTotal(): void {
    if (!this.room) return;
    let serviceTotal = 0;
    this.additionalServices.forEach(s => {
      if (this.selectedServices.has(s.id)) {
        serviceTotal += s.price;
      }
    });
    this.totalPrice = this.room.displayPrice + serviceTotal;
  }

  setActiveImage(index: number): void {
    this.activeImageIndex = index;
  }

  nextImage(): void {
    if (!this.room) return;
    this.activeImageIndex = (this.activeImageIndex + 1) % this.room.images.length;
  }

  prevImage(): void {
    if (!this.room) return;
    this.activeImageIndex = (this.activeImageIndex - 1 + this.room.images.length) % this.room.images.length;
  }

  bookNow(): void {
    if (!this.room) return;
    this.router.navigate(['e-bookings/booking-form', this.room.id, this.uuid]);
  }

  goBack(): void {
    this.router.navigate(['/e-bookings/home', this.uuid]);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
