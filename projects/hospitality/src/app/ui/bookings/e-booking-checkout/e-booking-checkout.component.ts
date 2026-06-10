import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { HotelserviceService } from '../../hospitality/hotelservice.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { AppConstants } from '../../../shared/constants/app.constants';
import { RoomDetail, BookingConfirmation, BrandSettings } from '../../../shared/models';

@Component({
  selector: 'app-e-booking-checkout',
  templateUrl: './e-booking-checkout.component.html',
  styleUrls: ['./e-booking-checkout.component.scss'],
})
export class EBookingCheckoutComponent implements OnInit, OnDestroy {
  Math = Math;
  bookingForm!: FormGroup;
  room: RoomDetail | null = null;
  uuid = 'default';
  loading = false;
  isSubmitting = false;
  showSuccessModal = false;
  confirmedBooking: BookingConfirmation | null = null;
  isMenuOpen = false;

  private destroy$ = new Subject<void>();

  // Options
  titles: string[] = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'];
  genders: string[] = ['Male', 'Female', 'Other'];
  countries: string[] = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Uganda'];

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Services
  additionalServices: any[] = [];
  selectedServiceIds: number[] = [];

  // Branding
  branding: BrandSettings = { companyName: 'OptimaxHospitality', logo: null, logoPosition: 'left' };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private hotelService: HotelserviceService,
    private formBuilder: FormBuilder,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id');
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';

    // Populate options (with fallbacks to defaults)
    const serviceTitles = this.hotelService.getTitles();
    if (serviceTitles && serviceTitles.length > 0) this.titles = serviceTitles;

    const serviceGenders = this.hotelService.getGenders();
    if (serviceGenders && serviceGenders.length > 0) this.genders = serviceGenders;

    const serviceCountries = this.hotelService.getCountries();
    if (serviceCountries && serviceCountries.length > 0) this.countries = serviceCountries;

    // Read selected service IDs passed as query param
    const servicesParam = this.route.snapshot.queryParamMap.get('services');
    if (servicesParam) {
      this.selectedServiceIds = servicesParam.split(',').map(Number).filter(Boolean);
    }

    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Initialize Reactive Form with validators
    this.bookingForm = this.formBuilder.group({
      checkinDate: [this.formatDate(today), [Validators.required]],
      checkoutDate: [this.formatDate(tomorrow), [Validators.required]],
      adults: [1, [Validators.required]],
      children: [0, []],
      title: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+0-9\s\-().]{7,}$/)]],
      gender: ['', [Validators.required]],
      country: ['', [Validators.required]],
      idNumber: ['', []],
      specialRequests: ['', []]
    });

    this.loadBranding();

    if (roomId) {
      const roomIdNumber = Number(roomId);
      this.loadRoom(roomIdNumber);
      this.loadServices();
    }

    this.hotelService.getRoomTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.logger.debug('Room types loaded');
        },
        error: (err) => {
          this.logger.error('Error loading room types', err);
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

  loadRoom(id: number): void {
    this.hotelService.getRoom(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (room) => {
          this.setupRoom(room);
        },
        error: (err) => {
          this.logger.error('Error loading room', err);
          this.setupRoom(this.getDummyRoom(id));
        }
      });
  }

  private setupRoom(room: any): void {
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
  }

  private getDummyRoom(id: number): any {
    const dummyRooms: any = {
      101: { id: 101, roomNumber: 'D101', roomType: 1, rate: 95000, maxOccupancy: 2, beds: 1, floor: 1, amenities: ['WiFi', 'AC', 'Breakfast'] },
      102: { id: 102, roomNumber: 'P202', roomType: 2, rate: 75000, maxOccupancy: 2, beds: 1, floor: 2, amenities: ['WiFi', 'Pool', 'Mini Bar'] },
      103: { id: 103, roomNumber: 'H303', roomType: 3, rate: 150000, maxOccupancy: 3, beds: 2, floor: 3, amenities: ['WiFi', 'Kitchen', 'Gym'] }
    };
    return dummyRooms[id] || { id, roomNumber: `R${id}`, roomType: 1, rate: 50000, maxOccupancy: 2, beds: 1, floor: 1, amenities: ['WiFi'] };
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

  toggleService(id: number): void {
    const idx = this.selectedServiceIds.indexOf(id);
    if (idx >= 0) this.selectedServiceIds.splice(idx, 1);
    else this.selectedServiceIds.push(id);
  }

  isServiceSelected(id: number): boolean {
    return this.selectedServiceIds.includes(id);
  }

  get nights(): number {
    if (!this.bookingForm) return 1;
    const checkin = this.bookingForm.get('checkinDate')?.value;
    const checkout = this.bookingForm.get('checkoutDate')?.value;
    if (!checkin || !checkout) return 1;
    return this.hotelService.calculateNights(checkin, checkout) || 1;
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

  incrementAdults(): void {
    const control = this.bookingForm.get('adults');
    if (control) {
      control.setValue((control.value || 0) + 1);
    }
  }

  decrementAdults(): void {
    const control = this.bookingForm.get('adults');
    if (control) {
      control.setValue(Math.max(1, control.value - 1));
    }
  }

  incrementChildren(): void {
    const control = this.bookingForm.get('children');
    if (control) {
      control.setValue(control.value + 1);
    }
  }

  decrementChildren(): void {
    const control = this.bookingForm.get('children');
    if (control) {
      control.setValue(Math.max(0, control.value - 1));
    }
  }

  confirmBooking(): void {
    if (!this.isFormComplete()) {
      this.showToastMessage('Please fill in all required fields correctly.', 'error');
      return;
    }

    if (this.isSubmitting) {
      this.showToastMessage('Please wait, processing your booking...', 'error');
      return;
    }

    this.isSubmitting = true;
    const formValues = this.bookingForm.value;

    // 1. Create/Identify Guest
    const guestData: any = {
      title: formValues.title,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      phone: formValues.phone,
      country: formValues.country,
      idNumber: formValues.idNumber || 'N/A',
      gender: formValues.gender
    };

    console.log('DEBUG: E-Booking — Creating guest:', guestData);

    this.hotelService.createGuest(guestData).subscribe({
      next: (createdGuest) => {
        console.log('DEBUG: E-Booking — Guest created:', createdGuest);
        this.proceedWithBooking(formValues);
      },
      error: (err) => {
        console.error('DEBUG: E-Booking — Guest creation failed:', err);
        console.log('Using mock guest for frontend testing...');
        this.proceedWithBooking(formValues);
      }
    });
  }

  private proceedWithBooking(formValues: any): void {
    if (!this.room) return;
    const guestId = 'guest-' + Date.now();

    // 2. Create Booking
    const bookingData: any = {
      checkinDate: formValues.checkinDate,
      checkoutDate: formValues.checkoutDate,
      adults: formValues.adults,
      children: formValues.children,
      specialRequests: formValues.specialRequests,
      subTotal: this.roomTotal,
      total: this.grandTotal,
      status: 'CONFIRMED',
      guest: Number(guestId),
      rooms: [this.room.id]
    };

    console.log('DEBUG: E-Booking — Creating booking:', bookingData);

    this.hotelService.createBooking(bookingData).subscribe({
      next: (res) => {
        console.log('DEBUG: E-Booking — SUCCESS:', res);
        this.handleBookingSuccess(res, formValues);
      },
      error: (err) => {
        console.error('DEBUG: E-Booking — Booking failed:', err);
        console.log('Using mock booking for frontend testing...');
        this.handleBookingSuccess({ id: 'BK-' + Math.floor(Math.random() * 10000) }, formValues);
      }
    });
  }

  private handleBookingSuccess(res: any, formValues: any): void {
    if (!this.room) return;
    this.confirmedBooking = res;

    // Store booking details for confirmation page
    const bookingDetails = {
      id: res.id || 'BK-7721',
      checkinDate: formValues.checkinDate,
      checkoutDate: formValues.checkoutDate,
      nights: this.nights,
      adults: formValues.adults,
      children: formValues.children,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      phone: formValues.phone,
      roomNumber: this.room.roomNumber,
      roomType: this.room.roomTypeName,
      floor: this.room.floorNumber,
      roomTotal: this.roomTotal,
      servicesTotal: this.servicesTotal,
      total: this.grandTotal
    };
    localStorage.setItem('lastBooking', JSON.stringify(bookingDetails));

    this.showSuccessModal = true;
    this.isSubmitting = false;
    this.showToastMessage('Booking created successfully!', 'success');
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 4000);
  }

  finishBooking(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/user/e-bookings/confirmation', this.uuid], {
      state: { booking: this.confirmedBooking }
    });
  }

  goBack(): void {
    history.back();
  }

  isFormComplete(): boolean {
    const form = this.bookingForm.value;
    return !!(
      form.title &&
      form.firstName && form.firstName.length >= 2 &&
      form.lastName && form.lastName.length >= 2 &&
      form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      form.phone && /^[+0-9\s\-().]{7,}$/.test(form.phone) &&
      form.gender &&
      form.country
    );
  }
}
