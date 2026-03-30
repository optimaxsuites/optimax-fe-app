import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotelserviceService, Room } from '../../hospitality/hotelservice.service';

@Component({
  selector: 'app-e-booking-checkout',
  templateUrl: './e-booking-checkout.component.html',
  styleUrls: ['./e-booking-checkout.component.scss'],
})
export class EBookingCheckoutComponent implements OnInit {
  room: any = null;
  uuid = 'default';
  loading = true;
  isSubmitting = false;
  showSuccessModal = false;
  confirmedBooking: any = null;
  isMenuOpen = false;

  // Booking form state
  checkinDate = '';
  checkoutDate = '';
  adults = 1;
  children = 0;
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  specialRequests = '';

  // Services
  additionalServices: any[] = [];
  selectedServiceIds: number[] = [];

  // Branding
  branding: any = { companyName: 'OptimaxHospitality', logo: null };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id');
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';

    // Read selected service IDs passed as query param
    const servicesParam = this.route.snapshot.queryParamMap.get('services');
    if (servicesParam) {
      this.selectedServiceIds = servicesParam.split(',').map(Number).filter(Boolean);
    }

    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    this.checkinDate = this.formatDate(today);
    this.checkoutDate = this.formatDate(tomorrow);

    this.loadBranding();

    this.hotelService.getRoomTypes().subscribe(() => {
      if (roomId) {
        this.loadRoom(Number(roomId));
        this.loadServices();
      }
    });
  }

  private loadBranding(): void {
    const saved = localStorage.getItem('optimax_settings');
    if (saved) this.branding = JSON.parse(saved);
  }

  loadRoom(id: number): void {
    this.hotelService.getRoom(id).subscribe({
      next: (room: any) => {
        const testImages = [
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1200',
        ];
        this.room = {
          ...room,
          roomTypeName: this.hotelService.getRoomTypeNameById(room.roomType),
          displayPrice: room.rate || 0,
          images: (room.imageURLs && room.imageURLs.length > 0) ? room.imageURLs : testImages,
          amenities: (room.amenities && room.amenities.length > 0) ? room.amenities : ['Breakfast Included', 'Lounge Access', 'Gym & Fitness'],
          capacity: room.maxOccupancy || 2,
          bedsCount: room.beds || 1,
          floorNumber: room.floor || 1,
        };
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadServices(): void {
    this.hotelService.getAdditionalDetails().subscribe({
      next: (s) => { this.additionalServices = s; }
    });
  }

  toggleService(id: number): void {
    const idx = this.selectedServiceIds.indexOf(id);
    if (idx >= 0) this.selectedServiceIds.splice(idx, 1);
    else this.selectedServiceIds.push(id);
  }

  isServiceSelected(id: number): boolean {
    return this.selectedServiceIds.includes(id);
  }

  get nights(): number {
    if (!this.checkinDate || !this.checkoutDate) return 1;
    return this.hotelService.calculateNights(this.checkinDate, this.checkoutDate) || 1;
  }

  get roomTotal(): number {
    return (this.room?.displayPrice || 0) * this.nights;
  }

  get servicesTotal(): number {
    return this.additionalServices
      .filter(s => this.selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + (s.price || 0), 0);
  }

  get grandTotal(): number {
    return this.roomTotal + this.servicesTotal;
  }

  get selectedServices(): any[] {
    return this.additionalServices.filter(s => this.selectedServiceIds.includes(s.id));
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  confirmBooking(): void {
    if (!this.room || this.isSubmitting) return;

    // Simple validation
    if (!this.firstName || !this.lastName || !this.email || !this.phone) {
      alert('Please fill in all required guest information fields.');
      return;
    }

    this.isSubmitting = true;

    // 1. Create/Identify Guest
    const guestData: any = {
      title: 'Mr/Ms', // Default or could be added to form
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      phone: this.phone,
      country: 'Nigeria', // Default
      idNumber: 'N/A',
      gender: 'PREFER_NOT_TO_SAY'
    };

    console.log('DEBUG: E-Booking — Creating guest:', guestData);
    
    this.hotelService.createGuest(guestData).subscribe({
      next: (createdGuest) => {
        console.log('DEBUG: E-Booking — Guest created:', createdGuest);
        
        // 2. Create Booking
        const bookingData: any = {
          checkinDate: this.checkinDate,
          checkoutDate: this.checkoutDate,
          adults: this.adults,
          children: this.children,
          specialRequests: this.specialRequests,
          subTotal: this.roomTotal,
          total: this.grandTotal,
          status: 'PENDING',
          guest: createdGuest.id,
          rooms: [this.room.id]
        };

        console.log('DEBUG: E-Booking — Creating booking:', bookingData);

        this.hotelService.createBooking(bookingData).subscribe({
          next: (res) => {
            console.log('DEBUG: E-Booking — SUCCESS:', res);
            this.confirmedBooking = res;
            this.showSuccessModal = true;
            this.isSubmitting = false;
          },
          error: (err) => {
            console.error('DEBUG: E-Booking — Booking failed:', err);
            alert('Failed to create reservation. Please try again or contact support.');
            this.isSubmitting = false;
          }
        });
      },
      error: (err) => {
        console.error('DEBUG: E-Booking — Guest creation failed:', err);
        alert('Failed to register guest details. Please check your information.');
        this.isSubmitting = false;
      }
    });
  }

  finishBooking(): void {
    this.showSuccessModal = false;
    // Navigate home using the restored flat absolute path
    this.router.navigate(['e-bookings/home', this.uuid]);
  }

  goBack(): void {
    history.back();
  }
}
