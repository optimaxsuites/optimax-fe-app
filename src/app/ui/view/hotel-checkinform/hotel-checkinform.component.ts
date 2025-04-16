import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

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
  selector: 'app-hotel-checkinform',
  templateUrl: './hotel-checkinform.component.html',
  styleUrls: ['./hotel-checkinform.component.scss'],
  providers: [MessageService],
})
export class HotelCheckinformComponent implements OnInit {
  @Input() selectedRoom: Room | null = null;
  @Output() checkinComplete = new EventEmitter<Room>();
  @Output() close = new EventEmitter<void>();
  @Input() selectedRooms: Room[] = [];

  bookingForm: FormGroup;
  guestForm: FormGroup;
  formErrors: any = {};
  showConfirmationModal = false;
  confirmationGuest: Guest = {} as Guest;
  isNewGuest = false;
  showGuestForm = false;
  formattedAmount: string = '';
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

  constructor(private fb: FormBuilder, private messageService: MessageService) {
    this.bookingForm = this.fb.group({
      checkinDate: ['', Validators.required],
      checkoutDate: ['', Validators.required],
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.min(0)]],
      specialRequests: [''],
      paymentMethod: ['', Validators.required],
      depositAmount: [0, [Validators.required, Validators.min(0)]],
    });

    this.guestForm = this.fb.group({
      title: ['', Validators.required],
      firstName: [
        '',
        [Validators.required, Validators.pattern('^[a-zA-Z ]*$')],
      ],
      lastName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]*$')]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9+ ]*$')]],
      idNumber: ['', Validators.required],
      country: ['Nigeria', Validators.required],
      gender: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadSavedData();
    this.setupFormListeners();
  }

  private setupFormListeners(): void {
    this.bookingForm.get('checkinDate')?.valueChanges.subscribe(() => {
      this.bookingForm.get('checkoutDate')?.updateValueAndValidity();
    });
  }

  private loadSavedData(): void {
    if (this.selectedRoom) {
      // Load booking details if they exist
      if (this.selectedRoom.bookingDetails) {
        this.bookingForm.patchValue({
          checkinDate: new Date(this.selectedRoom.bookingDetails.checkinDate),
          checkoutDate: new Date(this.selectedRoom.bookingDetails.checkoutDate),
          adults: this.selectedRoom.bookingDetails.adults,
          children: this.selectedRoom.bookingDetails.children,
          specialRequests: this.selectedRoom.bookingDetails.specialRequests,
          paymentMethod: this.selectedRoom.bookingDetails.paymentMethod,
          depositAmount: this.selectedRoom.bookingDetails.paidAmount || 0,
        });

        // Format the deposit amount for display
        if (this.selectedRoom.bookingDetails.paidAmount) {
          this.formattedAmount = this.formatWithCommas(
            this.selectedRoom.bookingDetails.paidAmount
          );
        }
      }

      // Load guest details if they exist
      if (this.selectedRoom.guest) {
        this.guestForm.patchValue(this.selectedRoom.guest);
        this.showGuestForm = false; // Hide guest form by default if guest exists
      } else {
        this.showGuestForm = true; // Show guest form if no guest exists
      }
    } else {
      // If no room is selected, show guest form by default
      this.showGuestForm = true;
    }
  }

  validateAllFormFields(formGroup: FormGroup): boolean {
    this.formErrors = {};
    let isValid = true;

    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      if (control && control.invalid) {
        isValid = false;
        if (control.errors?.['required']) {
          this.formErrors[field] = 'This field is required';
        } else if (control.errors?.['email']) {
          this.formErrors[field] = 'Please enter a valid email address';
        } else if (control.errors?.['pattern']) {
          if (field === 'phone') {
            this.formErrors[field] = 'Please enter a valid phone number';
          } else if (field === 'firstName' || field === 'lastName') {
            this.formErrors[field] = 'Only letters and spaces allowed';
          }
        } else if (control.errors?.['min']) {
          this.formErrors[
            field
          ] = `Value must be at least ${control.errors?.['min'].min}`;
        }
      }
    });

    return isValid;
  }

  confirmCheckin(): void {
    // Validate both forms
    const isBookingValid = this.validateAllFormFields(this.bookingForm);
    const isGuestValid =
      this.isNewGuest || !this.showGuestForm
        ? this.validateAllFormFields(this.guestForm)
        : true;

    if (!isBookingValid || !isGuestValid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Form Error',
        detail: 'Please fill all required fields correctly',
      });
      return;
    }

    // Prepare confirmation data
    this.confirmationGuest = this.isNewGuest
      ? this.guestForm.value
      : this.selectedRoom?.guest || this.guestForm.value;
    this.showConfirmationModal = true;
  }

  onAmountInput(event: any): void {
    let inputValue = event.target.value.replace(/,/g, '');

    if (inputValue) {
      const numericValue = parseFloat(inputValue);
      if (!isNaN(numericValue)) {
        this.formattedAmount = this.formatWithCommas(numericValue);
        this.bookingForm
          .get('depositAmount')
          ?.setValue(numericValue, { emitEvent: false });
      }
    } else {
      this.formattedAmount = '';
      this.bookingForm.get('depositAmount')?.setValue(0, { emitEvent: false });
    }
  }

  formatWithCommas(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
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

  calculateNights(): number {
    const checkinDate = this.bookingForm.get('checkinDate')?.value;
    const checkoutDate = this.bookingForm.get('checkoutDate')?.value;

    if (checkinDate && checkoutDate) {
      const timeDiff =
        new Date(checkoutDate).getTime() - new Date(checkinDate).getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    return 0;
  }

  calculateTotal(): number {
    const nights = this.calculateNights();
    if (this.selectedRoom && nights > 0) {
      return this.selectedRoom.rate * nights;
    }
    return 0;
  }

  closeForm(): void {
    this.close.emit();
  }

  toggleNewGuest(): void {
    this.isNewGuest = !this.isNewGuest;
    this.showGuestForm = this.isNewGuest;

    if (!this.isNewGuest && this.selectedRoom?.guest) {
      // Load original guest info
      this.guestForm.patchValue(this.selectedRoom.guest);
    } else {
      // Reset to empty form
      this.guestForm.reset({
        country: 'Nigeria',
      });
    }
  }

  completeCheckin(): void {
    if (!this.selectedRoom) return;

    const bookingValues = this.bookingForm.value;
    const guestValues =
      this.isNewGuest || !this.selectedRoom.guest
        ? this.guestForm.value
        : this.selectedRoom.guest;

    // Create updated room object
    const updatedRoom: Room = {
      ...this.selectedRoom,
      status: 'occupied',
      guest: guestValues,
      bookingDetails: {
        checkinDate: bookingValues.checkinDate,
        checkoutDate: bookingValues.checkoutDate,
        adults: bookingValues.adults,
        children: bookingValues.children,
        specialRequests: bookingValues.specialRequests,
        paymentMethod: bookingValues.paymentMethod,
        totalAmount: this.calculateTotal(),
        paidAmount: bookingValues.depositAmount,
        balanceAmount: this.calculateTotal() - bookingValues.depositAmount,
      },
    };

    // Update local storage
    this.updateRoomInLocalStorage(updatedRoom);

    // Emit event and show success message
    this.checkinComplete.emit(updatedRoom);
    this.showConfirmationModal = false;

    this.messageService.add({
      severity: 'success',
      summary: 'Check-in Successful',
      detail: `${guestValues.firstName} ${guestValues.lastName} checked into Room ${this.selectedRoom.number}`,
      life: 3000,
    });

    this.closeForm();
  }

  private updateRoomInLocalStorage(room: Room): void {
    try {
      const storedRooms = localStorage.getItem('rooms');
      let rooms = storedRooms ? JSON.parse(storedRooms) : [];

      // Find and update the room if it exists
      const index = rooms.findIndex((r: Room) => r.id === room.id);
      if (index !== -1) {
        rooms[index] = room;
      } else {
        rooms.push(room);
      }

      localStorage.setItem('rooms', JSON.stringify(rooms));
    } catch (error) {
      console.error('Error updating room in localStorage:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save room data',
      });
    }
  }
}
