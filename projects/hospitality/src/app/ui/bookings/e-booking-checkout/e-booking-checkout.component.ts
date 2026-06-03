import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HotelserviceService, Room } from '../../hospitality/hotelservice.service';

@Component({
  selector: 'app-e-booking-checkout',
  templateUrl: './e-booking-checkout.component.html',
  styleUrls: ['./e-booking-checkout.component.scss'],
})
export class EBookingCheckoutComponent implements OnInit {
  Math = Math;
  bookingForm!: FormGroup;
  room: any = null;
  uuid = 'default';
  loading = false;
  isSubmitting = false;
  showSuccessModal = false;
  confirmedBooking: any = null;
  isMenuOpen = false;

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
  branding: any = { companyName: 'OptimaxHospitality', logo: null };

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private hotelService: HotelserviceService,
    private formBuilder: FormBuilder
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

    // Debug form validation
    console.log('Form after init:', this.bookingForm.valid, this.bookingForm.invalid);
    this.bookingForm.statusChanges.subscribe(status => {
      console.log('Form status changed:', status, 'Valid:', this.bookingForm.valid);
    });

    if (roomId) {
      this.loadRoom(Number(roomId));
      this.loadServices();
    }

    this.hotelService.getRoomTypes().subscribe({
      next: () => {},
      error: () => {}
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
        const guestId = this.hotelService.getId(createdGuest);

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
            this.confirmedBooking = res;
            this.showSuccessModal = true;
            this.isSubmitting = false;
            this.showToastMessage('Booking created successfully!', 'success');
          },
          error: (err) => {
            console.error('DEBUG: E-Booking — Booking failed:', err);
            this.showToastMessage('Failed to create reservation. Please try again.', 'error');
            this.isSubmitting = false;
          }
        });
      },
      error: (err) => {
        console.error('DEBUG: E-Booking — Guest creation failed:', err);
        this.showToastMessage('Failed to register guest details. Please check your info.', 'error');
        this.isSubmitting = false;
      }
    });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 4000);
  }

  finishBooking(): void {
    this.showSuccessModal = false;
    // Navigate home using the restored flat absolute path
    this.router.navigate(['/user/hospitality/e-bookings/home', this.uuid]);
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
