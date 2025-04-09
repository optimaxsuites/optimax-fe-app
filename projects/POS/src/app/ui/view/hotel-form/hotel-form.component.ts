import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

// shared/interfaces/hotel.interfaces.ts

export interface Guest {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
}

export interface BookingDetails {
  checkinDate: Date;
  checkoutDate: Date;
  adults: number;
  children: number;
  specialRequests?: string;
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

export interface Room {
  id: number;
  number: number;
  type: string;
  status: string;
  floor?: number;
  guest?: Guest;
  rate: number;
  bookingDetails?: BookingDetails;
  beds?: number;
  maxOccupancy?: number;
  description?: string;
  amenities?: string[];
}

export interface Booking {
  guest: Guest;
  checkinDate: Date;
  checkoutDate: Date;
  adults: number;
  children: number;
  specialRequests: string;
  paymentMethod: string;
  depositAmount: number;
  roomIds: number[];
  roomTypes: string[];
  roomRates: number[];
  subtotal: number;
  taxes: number;
  total: number;
  balanceAmount: number;
  status?: string;
}

@Component({
  selector: 'app-hotel-form',
  templateUrl: './hotel-form.component.html',
  styleUrls: ['./hotel-form.component.scss'],
  providers: [MessageService],
})
export class HotelFormComponent implements OnInit {
  @Input() selectedRooms: Room[] = []; // Now passed from parent
  @Output() bookingConfirmed = new EventEmitter<Room[]>();
  @Input() selectedRoom: Room | null = null;
  @Output() back = new EventEmitter();

  formType: 'booking' | 'checkin' = 'booking';
  bookingForm: FormGroup;
  formErrors: any = {};
  bookingSummary: Booking | null = null;
  nights: number = 0;
  activeStatus: string = 'booked';
  checkinForm: FormGroup;
  showCheckinForm: boolean = false;
  isSameGuest: boolean = false;

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
      depositAmount: [0, [Validators.min(0)]],
    });

    this.checkinForm = this.fb.group({
      firstName: [
        '',
        [Validators.required, Validators.pattern('^[a-zA-Z ]*$')],
      ],
      lastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9+ ]*$')]],
      email: ['', [Validators.required, Validators.email]],
      idNumber: ['', Validators.required],
      gender: ['', Validators.required],
    });

    this.setupFormListeners();
  }

  ngOnInit() {
    if (this.selectedRooms && this.selectedRooms.length > 0) {
      // Check if we're in check-in mode and there's a guest
      if (this.formType === 'checkin' && this.selectedRooms[0].guest) {
        this.showCheckinForm = true;
        // Pre-populate checkin form with guest info
        const guest = this.selectedRooms[0].guest;
        this.checkinForm.patchValue({
          firstName: guest.firstName,
          lastName: guest.lastName,
          phone: guest.phone,
          email: guest.email,
        });
      } else {
        // Pre-populate booking form
        this.bookingForm.patchValue({
          adults: 1,
          children: 0,
          checkinDate: new Date(),
          checkoutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        });
      }
    }
    this.loadSelectedRooms();
  }

  onSameGuestCheckin() {
    this.isSameGuest = true;
    this.showCheckinForm = false;
    // Automatically confirm the booking with the existing guest info
    this.confirmBooking();
  }

  setActiveStatus(status: string) {
    this.activeStatus = status;
    if (this.bookingSummary) {
      // Update the booking summary status
      this.bookingSummary.status = status === 'checkin' ? 'occupied' : 'booked';

      // Update the selected rooms' status
      this.selectedRooms = this.selectedRooms.map((room) => ({
        ...room,
        status: status === 'checkin' ? 'occupied' : 'booked',
      }));
    }
  }

  private setupFormListeners(): void {
    this.bookingForm.get('checkinDate')?.valueChanges.subscribe((date) => {
      if (date) {
        const currentCheckout = this.bookingForm.get('checkoutDate')?.value;
        if (currentCheckout && new Date(currentCheckout) <= new Date(date)) {
          const newCheckout = new Date(date);
          newCheckout.setDate(newCheckout.getDate() + 1);
          this.bookingForm.get('checkoutDate')?.setValue(newCheckout);
        }
        this.calculateBookingDetails();
      }
    });

    this.bookingForm.get('checkoutDate')?.valueChanges.subscribe(() => {
      this.calculateBookingDetails();
    });

    this.bookingForm.get('depositAmount')?.valueChanges.subscribe(() => {
      this.calculateBookingDetails();
    });
  }

  openBookingForm(rooms: Room[]): void {
    this.formType = 'booking';
    this.selectedRooms = rooms;
    this.initForm();
    this.saveSelectedRooms();
  }

  initForm(): void {
    this.bookingForm.reset({
      title: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: 'Nigeria',
      checkinDate: new Date(),
      checkoutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      adults: 1,
      children: 0,
      specialRequests: '',
      paymentMethod: '',
      depositAmount: 0,
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
    const subtotal = roomRates * this.nights;
    const taxes = subtotal * 0.075; // 7.5% VAT
    const total = subtotal + taxes;
    const depositAmount = formValues.depositAmount || 0;
    const balanceAmount = Math.max(0, total - depositAmount);

    // Prepare guest object
    const guest: Guest = {
      title: formValues.title,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      phone: formValues.phone,
      country: formValues.country,
    };

    // Prepare booking summary
    this.bookingSummary = {
      guest,
      checkinDate,
      checkoutDate,
      adults: formValues.adults,
      children: formValues.children,
      specialRequests: formValues.specialRequests,
      paymentMethod: formValues.paymentMethod,
      depositAmount,
      roomIds: this.selectedRooms.map((room) => room.id),
      roomTypes: [...new Set(this.selectedRooms.map((room) => room.type))],
      roomRates: this.selectedRooms.map((room) => room.rate),
      subtotal,
      taxes,
      total,
      balanceAmount,
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
          } else if (field === 'firstName' || field === 'lastName') {
            this.formErrors[field] = 'Only letters and spaces allowed';
          }
        }
      }
    });
  }

  confirmBooking(): void {
    if (!this.bookingSummary) return;

    const status = this.activeStatus === 'checkin' ? 'occupied' : 'booked';

    // For check-in with same guest, use existing guest info
    let guest: Guest;
    if (this.isSameGuest && this.selectedRooms[0].guest) {
      guest = this.selectedRooms[0].guest;
    } else if (this.formType === 'checkin' && this.showCheckinForm) {
      // For new guest check-in, use checkin form values
      const formValues = this.checkinForm.value;
      guest = {
        title: '',
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        phone: formValues.phone,
        country: '',
      };
    } else {
      // For regular booking, use booking form values
      const formValues = this.bookingForm.value;
      guest = {
        title: formValues.title,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        phone: formValues.phone,
        country: formValues.country,
      };
    }

    const updatedRooms = this.selectedRooms.map((room) => ({
      ...room,
      status: status,
      guest: guest,
      bookingDetails: {
        checkinDate: this.bookingSummary?.checkinDate ?? new Date(),
        checkoutDate: this.bookingSummary?.checkoutDate ?? new Date(),
        adults: this.bookingSummary?.adults ?? 0,
        children: this.bookingSummary?.children ?? 0,
        specialRequests: this.bookingSummary?.specialRequests ?? '',
        paymentMethod: this.bookingSummary?.paymentMethod ?? '',
        totalAmount: this.bookingSummary?.total ?? 0,
        paidAmount: this.bookingSummary?.depositAmount ?? 0,
        balanceAmount: this.bookingSummary?.balanceAmount ?? 0,
      },
    }));

    this.bookingConfirmed.emit(updatedRooms);
    this.showSuccessMessage(updatedRooms, status);
    this.closeForm();
  }

  private showSuccessMessage(rooms: Room[], status: string): void {
    const roomNumbers = rooms.map((r) => r.number).join(', ');
    const statusMessage = status === 'occupied' ? 'checked in' : 'booked';

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Room${
        rooms.length > 1 ? 's' : ''
      } ${roomNumbers} ${statusMessage} successfully`,
    });
  }

  closeForm(): void {
    this.back.emit();
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

  goBack(): void {
    this.back.emit();
    this.bookingSummary = null;
    this.bookingForm.reset();
  }

  private clearSelectedRooms(): void {
    this.selectedRooms = [];
    localStorage.removeItem('selectedRooms');
  }

  private calculateBookingDetails(): void {
    const formValues = this.bookingForm.value;
    const checkinDate = new Date(formValues.checkinDate || new Date());
    const checkoutDate = new Date(
      formValues.checkoutDate ||
        new Date(new Date().setDate(new Date().getDate() + 1))
    );

    // Calculate nights
    const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
    this.nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Calculate amounts based on all selected rooms
    const roomRates = this.selectedRooms.reduce(
      (sum, room) => sum + room.rate,
      0
    );
    const subtotal = roomRates * this.nights;
    const taxes = subtotal * 0.075; // 7.5% VAT
    const total = subtotal + taxes;

    // Update form values
    this.bookingForm.patchValue(
      {
        subtotal,
        taxes,
        total,
        balanceAmount: Math.max(0, total - (formValues.depositAmount || 0)),
      },
      { emitEvent: false }
    );
  }
}
