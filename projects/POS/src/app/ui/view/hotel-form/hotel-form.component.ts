import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

interface Room {
  id: number;
  type: string;
  status: string;
  floor?: number;
  guest?: string;
  selected?: boolean;
  bookingDetails?: {
    title?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    checkinDate: Date;
    checkoutDate: Date;
    adults: number;
    children: number;
    specialRequests?: string;
    paymentMethod: string;
    totalAmount?: number;
    paidAmount?: number;
    balanceAmount?: number;
  };
  beds?: number;
  maxOccupancy?: number;
  rate: number;
  description?: string;
  amenities?: string[];
}

@Component({
  selector: 'app-hotel-form',
  templateUrl: './hotel-form.component.html',
  styleUrls: ['./hotel-form.component.scss'],
  providers: [MessageService],
})
export class HotelFormComponent implements OnInit {
  @Output() close = new EventEmitter();

  showForm: boolean = false;
  formType: 'booking' | 'checkin' = 'booking';
  bookingForm: FormGroup;
  formErrors: any = {};
  isCardPayment: boolean = false;
  selectedRooms: Room[] = [];
  bookingSummary: any = null;
  nights: number = 0;
  subtotal: number = 0;
  taxes: number = 0;
  total: number = 0;
  depositAmount: number = 0;
  balanceAmount: number = 0;

  countries: string[] = [
    'Nigeria',
    'United States',
    'United Kingdom',
    'Canada',
    'Ghana',
    'South Africa',
    'Kenya',
    'Germany',
    'France',
    'China',
    'India',
  ];

  roomTypes: string[] = [
    'Standard',
    'Deluxe',
    'Suite',
    'Executive',
    'Presidential',
  ];
  currentDate: Date = new Date();

  constructor(private fb: FormBuilder, private messageService: MessageService) {
    this.bookingForm = this.fb.group({
      title: ['', Validators.required],
      firstName: [
        '',
        [Validators.required, Validators.pattern('^[a-zA-Z ]*$')],
      ],
      lastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9+ ]*$')]],
      country: ['Nigeria', Validators.required],
      checkinDate: [new Date(), Validators.required],
      checkoutDate: [
        new Date(new Date().setDate(new Date().getDate() + 1)),
        Validators.required,
      ],
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.min(0)]],
      specialRequests: [''],
      paymentMethod: ['', Validators.required],
      cardNumber: [''],
      cardExpiry: [''],
      cardCvv: [''],
      depositAmount: [0, [Validators.min(0)]],
      termsAccepted: [false, Validators.requiredTrue],
      selectedRooms: [[], Validators.required],
    });

    this.setupFormListeners();
  }

  ngOnInit(): void {
    this.loadSelectedRooms();
  }

  private setupFormListeners(): void {
    this.bookingForm.get('paymentMethod')?.valueChanges.subscribe((method) => {
      this.isCardPayment = method === 'creditCard' || method === 'debitCard';
      this.updateCardValidators();
    });

    this.bookingForm.get('checkinDate')?.valueChanges.subscribe((date) => {
      if (date) {
        const currentCheckout = this.bookingForm.get('checkoutDate')?.value;
        if (currentCheckout && new Date(currentCheckout) <= new Date(date)) {
          const newCheckout = new Date(date);
          newCheckout.setDate(newCheckout.getDate() + 1);
          this.bookingForm.get('checkoutDate')?.setValue(newCheckout);
        }
      }
    });
  }

  private updateCardValidators(): void {
    const cardNumber = this.bookingForm.get('cardNumber');
    const cardExpiry = this.bookingForm.get('cardExpiry');
    const cardCvv = this.bookingForm.get('cardCvv');

    if (this.isCardPayment) {
      cardNumber?.setValidators([
        Validators.required,
        Validators.pattern(/^[0-9]{16}$/),
      ]);
      cardExpiry?.setValidators([
        Validators.required,
        Validators.pattern(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/),
      ]);
      cardCvv?.setValidators([
        Validators.required,
        Validators.pattern(/^[0-9]{3,4}$/),
      ]);
    } else {
      cardNumber?.clearValidators();
      cardExpiry?.clearValidators();
      cardCvv?.clearValidators();
    }

    cardNumber?.updateValueAndValidity();
    cardExpiry?.updateValueAndValidity();
    cardCvv?.updateValueAndValidity();
  }

  openBookingForm(roomOrRooms: Room | Room[]): void {
    this.formType = 'booking';
    this.selectedRooms = Array.isArray(roomOrRooms)
      ? roomOrRooms
      : [roomOrRooms];
    this.showForm = true;
    this.initForm();
    this.saveSelectedRooms();
  }

  initForm(): void {
    this.bookingForm.reset({
      checkinDate: new Date(),
      checkoutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      adults: 1,
      children: 0,
      depositAmount: 0,
      termsAccepted: false,
      country: 'Nigeria',
      selectedRooms: this.selectedRooms,
    });
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      this.validateAllFormFields();
      this.messageService.add({
        severity: 'error',
        summary: 'Form Error',
        detail: 'Please fill all required fields correctly',
      });
      return;
    }

    const formValues = this.bookingForm.value;
    const checkinDate = new Date(formValues.checkinDate);
    const checkoutDate = new Date(formValues.checkoutDate);

    // Calculate nights
    const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
    this.nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Calculate amounts
    const roomRates = this.selectedRooms.reduce(
      (sum, room) => sum + room.rate,
      0
    );
    this.subtotal = roomRates * this.nights;
    this.taxes = this.subtotal * 0.075; // 7.5% VAT
    this.total = this.subtotal + this.taxes;
    this.depositAmount = formValues.depositAmount || 0;
    this.balanceAmount = Math.max(0, this.total - this.depositAmount);

    // Prepare booking summary
    this.bookingSummary = {
      ...formValues,
      roomIds: this.selectedRooms.map((room) => room.id),
      roomTypes: [...new Set(this.selectedRooms.map((room) => room.type))],
      roomRates: roomRates,
      nights: this.nights,
      subtotal: this.subtotal,
      taxes: this.taxes,
      total: this.total,
      depositAmount: this.depositAmount,
      balanceAmount: this.balanceAmount,
    };
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
          if (field === 'phone') {
            this.formErrors[field] = 'Please enter a valid phone number';
          } else if (field === 'cardNumber') {
            this.formErrors[field] =
              'Please enter a valid 16-digit card number';
          } else if (field === 'cardExpiry') {
            this.formErrors[field] = 'Please enter a valid expiry date (MM/YY)';
          } else if (field === 'cardCvv') {
            this.formErrors[field] = 'Please enter a valid CVV (3-4 digits)';
          } else if (field === 'firstName' || field === 'lastName') {
            this.formErrors[field] = 'Only letters and spaces allowed';
          }
        } else if (control.errors?.['requiredTrue']) {
          this.formErrors[field] = 'You must accept the terms and conditions';
        }
      }
    });
  }

  confirmBooking(): void {
    const formValues = this.bookingForm.value;
    const guestName = `${formValues.title} ${formValues.firstName} ${formValues.lastName}`;

    // Update room statuses
    this.selectedRooms.forEach((room) => {
      room.status = 'booked';
      room.guest = guestName;
      room.bookingDetails = {
        title: formValues.title,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        phone: formValues.phone,
        checkinDate: formValues.checkinDate,
        checkoutDate: formValues.checkoutDate,
        adults: formValues.adults,
        children: formValues.children,
        specialRequests: formValues.specialRequests,
        paymentMethod: formValues.paymentMethod,
        totalAmount: this.total,
        paidAmount: this.depositAmount,
        balanceAmount: this.balanceAmount,
      };
    });

    this.messageService.add({
      severity: 'success',
      summary: 'Booking Confirmed',
      detail: `Rooms ${this.selectedRooms
        .map((r) => r.id)
        .join(', ')} booked for ${guestName}`,
    });

    this.clearSelectedRooms();
    this.closeForm();
  }

  closeForm(): void {
    this.showForm = false;
    this.bookingSummary = null;
    this.bookingForm.reset();
  }

  editBooking(): void {
    this.bookingSummary = null;
  }

  minCheckoutDate(): Date {
    const checkinDate = this.bookingForm.get('checkinDate')?.value;
    if (checkinDate) {
      const minDate = new Date(checkinDate);
      minDate.setDate(minDate.getDate() + 1);
      return minDate;
    }
    return new Date();
  }

  private saveSelectedRooms(): void {
    localStorage.setItem('selectedRooms', JSON.stringify(this.selectedRooms));
  }

  private loadSelectedRooms(): void {
    const savedRooms = localStorage.getItem('selectedRooms');
    if (savedRooms) {
      this.selectedRooms = JSON.parse(savedRooms);
    }
  }

  private clearSelectedRooms(): void {
    this.selectedRooms = [];
    localStorage.removeItem('selectedRooms');
  }

  openCheckInForm(room: Room): void {
    this.formType = 'checkin';
    this.selectedRooms = [room];
    this.showForm = true;

    // Pre-fill form with existing booking details if available
    if (room.bookingDetails) {
      this.bookingForm.patchValue({
        title: room.bookingDetails.title,
        firstName: room.bookingDetails.firstName,
        lastName: room.bookingDetails.lastName,
        email: room.bookingDetails.email,
        phone: room.bookingDetails.phone,
        checkinDate: new Date(room.bookingDetails.checkinDate),
        checkoutDate: new Date(room.bookingDetails.checkoutDate),
        adults: room.bookingDetails.adults,
        children: room.bookingDetails.children,
        specialRequests: room.bookingDetails.specialRequests,
        paymentMethod: room.bookingDetails.paymentMethod,
      });
    } else {
      this.initForm();
    }
  }
}
