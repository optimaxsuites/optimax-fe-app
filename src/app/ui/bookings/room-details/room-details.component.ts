import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HotelserviceService, Room } from '../../hospitality/hotelservice.service';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-room-details',
  templateUrl: './room-details.component.html',
  styleUrls: ['./room-details.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class RoomDetailsComponent implements OnInit {
  room: any = null;
  uuid: string = 'default';
  loading = true;
  activeImageIndex = 0;
  additionalServices: any[] = [];
  selectedServices: Set<number> = new Set();
  totalPrice = 0;
  isMenuOpen = false;
  branding: any = {
    companyName: 'OptimaxHospitality',
    logo: null,
    logoPosition: 'left'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id');
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    this.loadBranding();

    // Ensure room types are loaded BEFORE room details for accurate mapping
    this.hotelService.getRoomTypes().subscribe({
      next: () => {
        if (roomId) {
          this.loadRoomDetails(Number(roomId));
          this.loadServices();
        }
      }
    });
  }

  private loadBranding(): void {
    const saved = localStorage.getItem('optimax_settings');
    if (saved) {
      this.branding = JSON.parse(saved);
    }
  }

  loadRoomDetails(id: number): void {
    this.loading = true;
    this.hotelService.getRoom(id).subscribe({
      next: (room: any) => {
        console.log('DEBUG: RoomDetails — Raw Room fetched:', room);
        
        // Ensure we have a list for testing if API is empty
        const apiImages = room.imageURLs && room.imageURLs.length > 0 ? room.imageURLs : [];
        const testImages = [
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1200'
        ];

        // Explicitly map all fields to ensure they are available in template
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
        
        console.log('DEBUG: RoomDetails — Mapped object:', this.room);
        this.calculateTotal();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading room details:', err);
        this.loading = false;
      }
    });
  }

  loadServices(): void {
    this.hotelService.getAdditionalDetails().subscribe({
      next: (services) => {
        this.additionalServices = services;
      },
      error: (err) => console.error('Error loading services:', err)
    });
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
    this.activeImageIndex = (this.activeImageIndex + 1) % this.room.images.length;
  }

  prevImage(): void {
    this.activeImageIndex = (this.activeImageIndex - 1 + this.room.images.length) % this.room.images.length;
  }

  bookNow(): void {
    // Navigate to the booking form
    this.router.navigate(['/e-bookings/booking-form', this.room.id, this.uuid]);
  }

  goBack(): void {
    this.router.navigate(['/e-bookings/home', this.uuid]);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
