import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

interface Room {
  id: number;
  type: string;
  status: 'available' | 'booked' | 'occupied' | 'dirty';
  guest?: string;
  rate?: number;
  bookingDetails?: any;
}

@Component({
  selector: 'app-hotel-checkout',
  templateUrl: './hotel-checkout.component.html',
  styleUrls: ['./hotel-checkout.component.scss'],
  providers: [MessageService],
})
export class HotelCheckoutComponent implements OnInit {
  selectedRoom: Room | null = null;
  selectedRoomType: string = 'All Rooms';
  searchQuery: string = '';
  searchDate: Date | null = null;
  minDate: Date = new Date();
  minCheckinDate: Date = new Date();
  showBookingForm: boolean = false;
  showCheckInForm: boolean = false;
  viewingAvailableRooms: boolean = false;
  bookingForm!: FormGroup;
  bookingSummary: any = null;
  formErrors: any = {};
  nights: number = 0;
  roomRate: number = 0;
  subtotal: number = 0;
  taxes: number = 0;
  total: number = 0;
  isCardPayment: boolean = false;

  statusColors: any = {
    booked: 'bg-orange-300',
    occupied: 'bg-blue-300',
    dirty: 'bg-red-300',
    available: 'bg-green-300',
  };

  roomTypes: string[] = [
    'All Rooms',
    'Single',
    'Double',
    'Deluxe',
    'Suites',
    'Presidential',
  ];

  get roomTypesWithoutAll(): string[] {
    return this.roomTypes.filter((type) => type !== 'All Rooms');
  }

  countries: string[] = [
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Spain',
    'Italy',
    'Japan',
    'China',
    'India',
    'Brazil',
    'South Africa',
    'Nigeria',
    'Mexico',
    'Russia',
  ];

  rooms: Room[] = [
    { id: 100, type: 'Single', status: 'available', rate: 100 },
    { id: 101, type: 'Single', status: 'available', rate: 100 },
    { id: 102, type: 'Single', status: 'booked', guest: 'Kennedy', rate: 100 },
    { id: 103, type: 'Double', status: 'booked', guest: 'Simmons', rate: 150 },
    {
      id: 104,
      type: 'Deluxe',
      status: 'occupied',
      guest: 'Philip',
      rate: 250,
      bookingDetails: {
        title: 'Mr',
        firstName: 'Shane',
        lastName: 'Johnson',
        email: 'philipfriday@gmail.com',
        phone: '09061809704',
        checkinDate: new Date(2025, 2, 20),
        checkoutDate: new Date(2025, 2, 25),
        adults: 2,
        children: 1,
        paymentMethod: 'creditCard',
        specialRequests: 'Extra pillows',
      },
    },
    { id: 105, type: 'Suites', status: 'available', rate: 350 },
    { id: 200, type: 'Double', status: 'available', rate: 150 },
    { id: 201, type: 'Double', status: 'available', rate: 150 },
    { id: 202, type: 'Single', status: 'available', rate: 100 },
    { id: 203, type: 'Presidential ', status: 'available', rate: 500 },
    { id: 204, type: 'Single', status: 'dirty', rate: 100 },
    { id: 205, type: 'Double', status: 'dirty', rate: 150 },
    { id: 300, type: 'Deluxe', status: 'available', rate: 250 },
    { id: 301, type: 'Deluxe', status: 'available', rate: 250 },
    { id: 302, type: 'Suites', status: 'available', rate: 350 },
    { id: 303, type: 'Suites', status: 'available', rate: 350 },
    {
      id: 304,
      type: 'Presidential',
      status: 'booked',
      guest: 'Martinez',
      rate: 500,
    },
  ];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  get filteredRooms(): Room[] {
    return this.rooms.filter((room) => {
      if (
        this.selectedRoomType !== 'All Rooms' &&
        room.type !== this.selectedRoomType
      ) {
        return false;
      }

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        if (
          !room.id.toString().includes(query) &&
          !room.type.toLowerCase().includes(query) &&
          (!room.guest || !room.guest.toLowerCase().includes(query))
        ) {
          return false;
        }
      }

      if (this.searchDate) {
        if (room.status === 'booked' || room.status === 'occupied') {
          if (!room.bookingDetails) return false;

          const searchDate = new Date(this.searchDate);
          const checkinDate = new Date(room.bookingDetails.checkinDate);
          const checkoutDate = new Date(room.bookingDetails.checkoutDate);

          if (searchDate >= checkinDate && searchDate < checkoutDate) {
            return true;
          } else {
            return false;
          }
        }
      }

      return true;
    });
  }

  get availableRooms(): Room[] {
    return this.rooms.filter((room) => room.status === 'available');
  }

  get availableRoomsByType(): Room[] {
    const selectedType = this.bookingForm.get('roomType')?.value;
    if (!selectedType) return [];
    return this.rooms.filter(
      (room) => room.status === 'available' && room.type === selectedType
    );
  }

  initForm(): void {
    this.bookingForm = this.fb.group({
      // Guest Information
      title: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      gender: ['', Validators.required],
      country: ['', Validators.required],
      idType: ['', Validators.required],
      idNumber: ['', Validators.required],

      // Booking Details
      roomType: [''],
      roomId: ['', Validators.required],
      checkinDate: [new Date(), Validators.required],
      checkoutDate: [
        new Date(new Date().setDate(new Date().getDate() + 1)),
        Validators.required,
      ],
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, Validators.min(0)],
      specialRequests: [''],

      // Payment Information
      paymentMethod: ['', Validators.required],
      cardNumber: [''],
      cardExpiry: [''],
      cardCvv: [''],

      // Terms
      termsAccepted: [false, Validators.requiredTrue],
    });

    // Watch for changes in payment method
    this.bookingForm.get('paymentMethod')?.valueChanges.subscribe((method) => {
      this.isCardPayment = method === 'creditCard' || method === 'debitCard';

      if (this.isCardPayment) {
        this.bookingForm
          .get('cardNumber')
          ?.setValidators([Validators.required]);
        this.bookingForm
          .get('cardExpiry')
          ?.setValidators([
            Validators.required,
            Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/),
          ]);
        this.bookingForm
          .get('cardCvv')
          ?.setValidators([
            Validators.required,
            Validators.pattern(/^\d{3,4}$/),
          ]);
      } else {
        this.bookingForm.get('cardNumber')?.clearValidators();
        this.bookingForm.get('cardExpiry')?.clearValidators();
        this.bookingForm.get('cardCvv')?.clearValidators();
      }

      this.bookingForm.get('cardNumber')?.updateValueAndValidity();
      this.bookingForm.get('cardExpiry')?.updateValueAndValidity();
      this.bookingForm.get('cardCvv')?.updateValueAndValidity();
    });

    // Watch for changes in checkout date
    this.bookingForm.get('checkinDate')?.valueChanges.subscribe((date) => {
      if (date) {
        this.minCheckinDate = new Date(date);
        const currentCheckout = this.bookingForm.get('checkoutDate')?.value;
        if (currentCheckout && new Date(currentCheckout) <= new Date(date)) {
          const newCheckout = new Date(date);
          newCheckout.setDate(newCheckout.getDate() + 1);
          this.bookingForm.get('checkoutDate')?.setValue(newCheckout);
        }
      }
    });

    // Watch for changes in room type
    this.bookingForm.get('roomType')?.valueChanges.subscribe(() => {
      this.bookingForm.get('roomId')?.setValue('');
    });
  }

  selectRoomType(type: string): void {
    this.selectedRoomType = type;
  }

  selectRoom(room: Room): void {
    this.selectedRoom = room;
    this.viewingAvailableRooms = false;
  }

  showAvailableRooms(): void {
    this.closeModals();
    this.viewingAvailableRooms = true;
    this.selectedRoom = null;
  }

  showCheckInModal(): void {
    this.closeModals();
    this.initForm();
    this.showCheckInForm = true;
  }

  bookRoom(room: Room): void {
    this.closeModals();
    this.selectedRoom = room;
    this.initForm();
    this.bookingForm.patchValue({
      roomId: room.id,
      roomType: room.type,
    });
    this.showBookingForm = true;
  }

  proceedToCheckIn(room: Room): void {
    this.closeModals();
    this.selectedRoom = room;
    this.initForm();
    this.showCheckInForm = true;
    this.bookingForm.patchValue({
      roomId: room.id,
      roomType: room.type,
    });
  }

  cancelForm(): void {
    this.showBookingForm = false;
    this.showCheckInForm = false;
    this.selectedRoom = null;
    this.formErrors = {};
  }

  closeModals(): void {
    this.selectedRoom = null;
    this.viewingAvailableRooms = false;
    this.showBookingForm = false;
    this.showCheckInForm = false;
    this.bookingSummary = null;
  }

  closeConfirmation(): void {
    this.bookingSummary = null;
  }

  submitForm(): void {
    if (this.bookingForm.invalid) {
      this.validateAllFormFields();
      return;
    }

    const formValues = this.bookingForm.value;

    // Calculate nights and total
    const checkinDate = new Date(formValues.checkinDate);
    const checkoutDate = new Date(formValues.checkoutDate);
    const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
    this.nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    this.roomRate = this.getRoomRateById(formValues.roomId);
    this.subtotal = this.roomRate * this.nights;
    this.taxes = this.subtotal * 0.12; // 12% tax
    this.total = this.subtotal + this.taxes;

    this.bookingSummary = formValues;
  }

  validateAllFormFields(): void {
    const form = this.bookingForm;
    this.formErrors = {};

    Object.keys(form.controls).forEach((field) => {
      const control = form.get(field);
      if (control && control.invalid) {
        if (control.errors?.['required']) {
          this.formErrors[field] = 'This field is required';
        } else if (control.errors?.['email']) {
          this.formErrors[field] = 'Please enter a valid email address';
        } else if (control.errors?.['min']) {
          this.formErrors[
            field
          ] = `Value must be at least ${control.errors?.['min'].min}`;
        } else if (control.errors?.['pattern']) {
          if (field === 'cardExpiry') {
            this.formErrors[field] = 'Please enter a valid expiry date (MM/YY)';
          } else if (field === 'cardCvv') {
            this.formErrors[field] = 'Please enter a valid CVV code';
          } else {
            this.formErrors[field] = 'Invalid format';
          }
        } else if (control.errors?.['requiredTrue']) {
          this.formErrors[field] = 'You must accept the terms and conditions';
        }
      }
    });
  }

  getRoomTypeById(id: number): string {
    const room = this.rooms.find((r) => r.id === id);
    return room ? room.type : '';
  }

  getRoomRateById(id: number): number {
    const room = this.rooms.find((r) => r.id === id);
    return room && room.rate ? room.rate : 0;
  }

  editBooking(): void {
    this.bookingSummary = null;
  }

  confirmBooking(): void {
    const formValues = this.bookingForm.value;
    const roomId = formValues.roomId;

    // Find the room by ID
    const roomIndex = this.rooms.findIndex((r) => r.id === roomId);
    if (roomIndex === -1) return;

    // Prepare the guest name
    const guestName = `${formValues.firstName} ${formValues.lastName}`;

    // Prepare booking details
    const bookingDetails = {
      title: formValues.title,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      phone: formValues.phone,
      checkinDate: formValues.checkinDate,
      checkoutDate: formValues.checkoutDate,
      adults: formValues.adults,
      children: formValues.children,
      paymentMethod: formValues.paymentMethod,
      specialRequests: formValues.specialRequests,
    };

    // Update the room status
    if (this.showBookingForm) {
      this.rooms[roomIndex] = {
        ...this.rooms[roomIndex],
        status: 'booked',
        guest: guestName,
        bookingDetails,
      };

      this.messageService.add({
        severity: 'success',
        summary: 'Booking Confirmed',
        detail: `Room ${roomId} has been booked for ${guestName}`,
      });
    } else if (this.showCheckInForm) {
      this.rooms[roomIndex] = {
        ...this.rooms[roomIndex],
        status: 'occupied',
        guest: guestName,
        bookingDetails,
      };

      this.messageService.add({
        severity: 'success',
        summary: 'Check-in Complete',
        detail: `${guestName} has been checked into Room ${roomId}`,
      });
    }

    this.closeModals();
    this.bookingSummary = null;
  }
}
