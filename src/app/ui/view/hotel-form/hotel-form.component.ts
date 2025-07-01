import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import {
  HotelserviceService,
  Room,
  Booking,
  Guest,
  RoomStatus,
  BookingStatus,
} from '../../hospitality/hotelservice.service';
import { switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../sharedComponent/service/environments/environment.prod';

@Component({
  selector: 'app-hotel-form',
  templateUrl: './hotel-form.component.html',
  styleUrls: ['./hotel-form.component.scss'],
  providers: [DatePipe],
})
export class HotelFormComponent implements OnInit {
  @Input() selectedRooms: Room[] = [];
  @Output() bookingComplete = new EventEmitter<Booking>();
  @Output() closeForm = new EventEmitter<void>();
  @ViewChild('idNumberField') idNumberField!: ElementRef;

  bookingForm: FormGroup;
  formErrors: any = {};
  bookingSummary: any = null;
  activeStatus: BookingStatus = 'CONFIRMED';
  isProcessing = false;
  isScanning = false;
  scanError: string | null = null;
  scanProgress = 0;
  formattedAmount: string = '';
  rawAmount: string = '';
  paymentMethods = ['CASH', 'CARD', 'TRANSFER'];
  paymentStatus = 'PENDING';
  today: Date = new Date();

  // Public access to service methods
  titles = this.hotelService.getTitles();
  countries = this.hotelService.getCountries();
  genders = this.hotelService.getGenders();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    public hotelService: HotelserviceService,
    private datePipe: DatePipe,
    private http: HttpClient
  ) {
    this.bookingForm = this.fb.group({
      // Guest Information
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

      // Booking Information
      checkinDate: [new Date(), Validators.required],
      checkoutDate: [this.getDefaultCheckoutDate(), Validators.required],
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.min(0)]],
      specialRequests: [''],

      // Payment Information
      paymentMethod: ['', Validators.required],
      depositAmount: [0, [Validators.min(0)]],
      paymentReference: [''],
      paymentNote: [''],
    });
  }

  ngOnInit(): void {
    this.setupFormListeners();
  }

  private getDefaultCheckoutDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
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
      }
    });
  }

  // ID Scanning Functionality
  startIDScan(): void {
    if (this.isScanning) return;

    this.isScanning = true;
    this.scanError = null;
    this.scanProgress = 0;

    // Simulate scan progress
    const interval = setInterval(() => {
      this.scanProgress += 10;
      if (this.scanProgress >= 100) {
        clearInterval(interval);
        this.completeIDScan();
      }
    }, 300);
  }

  completeIDScan(): void {
    // Simulate successful scan with sample data
    const sampleData = {
      title: 'Mr',
      firstName: 'John',
      lastName: 'Doe',
      idNumber: 'A123456789',
      gender: 'Male',
      country: 'Nigeria',
    };

    this.bookingForm.patchValue(sampleData);
    this.isScanning = false;
    this.scanProgress = 0;
    this.messageService.add({
      severity: 'success',
      summary: 'Scan Successful',
      detail: 'Guest information extracted from ID',
      life: 3000,
    });
  }

  cancelScan(): void {
    this.isScanning = false;
    this.scanProgress = 0;
    this.scanError = 'Scan cancelled by user';
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      this.validateAllFormFields();
      this.messageService.add({
        severity: 'error',
        summary: 'Form Error',
        detail: 'Please fill all required fields correctly',
        life: 5000,
      });
      return;
    }

    this.createBookingSummary();
  }

  private createBookingSummary(): void {
    const formValues = this.bookingForm.value;
    const checkinDate = new Date(formValues.checkinDate);
    const checkoutDate = new Date(formValues.checkoutDate);

    // Calculate nights
    const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Calculate amounts
    const roomRates = this.selectedRooms.reduce(
      (sum, room) => sum + (room.rate || 0),
      0
    );
    const subtotal = roomRates * nights;
    const taxes = subtotal * 0.075; // 7.5% VAT
    const total = subtotal + taxes;
    const depositAmount = formValues.depositAmount || 0;
    const balanceAmount = Math.max(0, total - depositAmount);

    this.bookingSummary = {
      guest: {
        title: formValues.title,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        phone: formValues.phone,
        country: formValues.country,
        idNumber: formValues.idNumber,
        gender: formValues.gender,
      },
      booking: {
        checkinDate: this.datePipe.transform(checkinDate, 'yyyy-MM-dd') || '',
        checkoutDate: this.datePipe.transform(checkoutDate, 'yyyy-MM-dd') || '',
        adults: formValues.adults,
        children: formValues.children,
        specialRequests: formValues.specialRequests,
        depositAmount: depositAmount,
        subTotal: subtotal,
        taxes: taxes,
        total: total,
        balanceAmount: balanceAmount,
        status: this.activeStatus,
        rooms: this.selectedRooms.map((room) => room.id || 0),
        paymentMethod: formValues.paymentMethod,
      },
      payment: {
        amountPaid: depositAmount,
        method: formValues.paymentMethod,
        status: this.paymentStatus,
        paidOn: this.datePipe.transform(new Date(), 'yyyy-MM-dd') || '',
        reference: formValues.paymentReference || '',
        note: formValues.paymentNote || '',
      },
      selectedRooms: this.selectedRooms,
    };
  }

  async confirmBooking(): Promise<void> {
    if (!this.bookingSummary) return;
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // First create guest
      const createdGuest = await this.hotelService
        .createGuest(this.bookingSummary.guest)
        .toPromise();

      // Then create booking with guest ID
      if (!createdGuest || !createdGuest.id) {
        throw new Error('Guest creation failed - no guest ID returned');
      }

      const bookingData: Booking = {
        ...this.bookingSummary.booking,
        guest: createdGuest.id,
      };

      const createdBooking = await this.hotelService
        .createBooking(bookingData)
        .toPromise();

      // Process payment
      if (!createdBooking || !createdBooking.id) {
        throw new Error('Booking creation failed - no booking ID returned');
      }

      const paymentData = {
        ...this.bookingSummary.payment,
        bookingId: createdBooking.id,
      };

      await this.processPayment(paymentData);

      // Update room statuses
      const newRoomStatus: RoomStatus =
        this.activeStatus === 'CHECKED_IN' ? 'OCCUPIED' : 'BOOKED';

      await this.updateRoomStatuses(createdBooking.rooms, newRoomStatus);

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Booking ${
          this.activeStatus === 'CHECKED_IN' ? 'checked in' : 'created'
        } successfully`,
        life: 5000,
      });

      this.bookingComplete.emit(createdBooking);
      this.closeForm.emit();
    } catch (err) {
      this.handleError('Failed to complete booking', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processPayment(paymentData: any): Promise<void> {
    try {
      // Replace with your actual payment endpoint
      const paymentUrl = `${environment.apiBaseUrl}/x/api/v2/hsp/payments`;
      await this.http
        .post(paymentUrl, paymentData, {
          headers: this.hotelService.getHeaders(),
        })
        .toPromise();

      this.messageService.add({
        severity: 'success',
        summary: 'Payment Processed',
        detail: 'Payment was successfully recorded',
        life: 5000,
      });
    } catch (err) {
      console.error('Payment processing error:', err);
      throw new Error('Failed to process payment');
    }
  }

  private updateRoomStatuses(
    roomIds: number[],
    status: RoomStatus
  ): Promise<void[]> {
    const updatePromises = roomIds.map((roomId) => {
      return new Promise<void>((resolve, reject) => {
        this.hotelService.getRoom(roomId).subscribe((room) => {
          const updatedRoom = { ...room, roomStatus: status };
          this.hotelService.updateRoom(roomId, updatedRoom).subscribe({
            next: () => resolve(),
            error: (err) => {
              console.error(`Failed to update room ${roomId} status`, err);
              resolve(); // We resolve even if there's an error to continue the flow
            },
          });
        });
      });
    });

    return Promise.all(updatePromises);
  }

  private handleError(summary: string, error: any): void {
    console.error(error);
    this.messageService.add({
      severity: 'error',
      summary: summary,
      detail: error.message || 'Unknown error occurred',
      life: 5000,
    });
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

  setActiveStatus(status: BookingStatus): void {
    this.activeStatus = status;
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

  calculateNights(checkin: string, checkout: string): number {
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  getRoomTypeName(roomTypeId: number): string {
    let roomTypeName = 'Unknown';
    this.hotelService.getRoomTypes().subscribe((roomTypes) => {
      const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
      if (roomType) {
        roomTypeName = roomType.name;
      }
    });
    return roomTypeName;
  }

  onAmountInput(event: any): void {
    let inputValue = event.target.value.replace(/,/g, '');
    this.rawAmount = inputValue;

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

  onBlur(): void {
    if (this.rawAmount) {
      const numericValue = parseFloat(this.rawAmount);
      if (!isNaN(numericValue)) {
        this.bookingForm
          .get('depositAmount')
          ?.setValue(numericValue, { emitEvent: false });
      }
    }
  }

  onClose(): void {
    this.closeForm.emit();
  }
}
