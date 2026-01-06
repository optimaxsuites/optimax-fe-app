import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { HotelServiceService } from '../hotel-service.service';

// shared/interfaces/hotel.interfaces.ts

export interface Guest {
  id?: string; // Optional property for guest ID
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  idNumber: string;
  gender: string;
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
  guest?: Guest; // Optional property for guest
  rate: number;
  bookingDetails?: BookingDetails;
  beds?: number;
  maxOccupancy?: number;
  description?: string;
  amenities?: string[];
  currentKey?: RoomKey; // Optional property for current key
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

export interface RoomKey {
  id: string;
  roomNumber: number;
  roomId: number;
  isActive: boolean;
  assignedDate: Date;
  deactivationDate: Date;
  guestIdNumber: string;
  guestName?: string;
}

export interface KeyCardLog {
  id: string;
  roomNumber: number;
  roomId: number;
  keyCardId: string;
  guestIdNumber: string;
  accessType: 'GUEST' | 'MASTER' | 'STAFF';
  timestamp: Date;
  accessGranted: boolean;
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

  constructor(
    private fb: FormBuilder,
    private keyCardService: HotelServiceService,
    private messageService: MessageService
  ) {
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
      idNumber: ['', Validators.required],
      gender: ['', Validators.required],
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
      subtotal: [{ value: 0, disabled: true }],
      taxes: [{ value: 0, disabled: true }],
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
          idNumber: guest.idNumber,
          gender: guest.gender,
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
      idNumber: '',
      gender: '',
      subtotal: 0,
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
      idNumber: formValues.idNumber,
      gender: formValues.gender,
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
    if (!this.bookingSummary) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No booking summary available',
        life: 3000,
      });
      return;
    }

    const status = this.activeStatus === 'checkin' ? 'occupied' : 'booked';

    // Validate ID number first
    let idNumber: string;
    try {
      idNumber = this.validateIdNumber();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'ID Number Required',
        detail:
          error instanceof Error
            ? error.message
            : 'Valid ID number is required for check-in',
        life: 5000,
      });
      return;
    }

    // For check-in with same guest, use existing guest info
    let guest: Guest;
    if (this.isSameGuest && this.selectedRooms[0].guest) {
      guest = {
        ...this.selectedRooms[0].guest,
        idNumber: idNumber,
      };
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
        idNumber: idNumber,
        gender: formValues.gender,
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
        idNumber: idNumber,
        gender: formValues.gender,
      };
    }

    const updatedRooms = this.selectedRooms.map((room) => {
      const updatedRoom: Room = {
        ...room,
        status: status,
        guest: guest,
        bookingDetails: {
          checkinDate: this.bookingSummary!.checkinDate,
          checkoutDate: this.bookingSummary!.checkoutDate,
          adults: this.bookingSummary!.adults,
          children: this.bookingSummary!.children,
          specialRequests: this.bookingSummary!.specialRequests || '',
          paymentMethod: this.bookingSummary!.paymentMethod,
          totalAmount: this.bookingSummary!.total,
          paidAmount: this.bookingSummary!.depositAmount,
          balanceAmount: this.bookingSummary!.balanceAmount,
        },
      };

      if (status === 'occupied') {
        try {
          this.keyCardService.deactivateRoomKeys(room.id);

          const key = this.keyCardService.assignKey(
            updatedRoom,
            guest,
            this.bookingSummary!.checkinDate,
            this.bookingSummary!.checkoutDate
          );

          updatedRoom.currentKey = key;

          this.messageService.add({
            severity: 'success',
            summary: 'Key Card Assigned',
            detail: `Key ${key.id} assigned to Room ${room.number}`,
            life: 3000,
          });

          this.keyCardService.logAccess(
            room.number,
            room.id,
            key.id,
            guest.idNumber || '',

            true
          );
        } catch (error) {
          console.error('Key assignment error:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Key Assignment Failed',
            detail: 'Could not assign key card to room',
            life: 3000,
          });
        }
      } else if (status === 'booked' && room.currentKey) {
        this.keyCardService.deactivateKey(room.currentKey.id);
        updatedRoom.currentKey = undefined;
      }

      return updatedRoom;
    });

    this.bookingConfirmed.emit(updatedRooms);
    this.showSuccessMessage(updatedRooms, status);
    this.closeForm();
  }

  private validateIdNumber(): string {
    // Get ID number from the appropriate form
    let idNumber: string;
    if (this.isSameGuest && this.selectedRooms[0].guest?.idNumber) {
      idNumber = this.selectedRooms[0].guest.idNumber;
    } else if (this.formType === 'checkin' && this.showCheckinForm) {
      idNumber = this.checkinForm.value.idNumber;
    } else {
      idNumber = this.bookingForm.value.idNumber;
    }

    // Validate presence
    if (!idNumber || idNumber.trim() === '') {
      throw new Error('Government-issued ID number is required');
    }

    // Add additional validation rules as needed
    // Example: Check for minimum length or specific format
    if (idNumber.length < 6) {
      throw new Error('ID number must be at least 6 characters');
    }

    // You can add more specific validation based on your country's ID format
    // For example, check for specific patterns or checksums

    return idNumber.trim();
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
