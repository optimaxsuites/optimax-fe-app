import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';

export interface Guest {
  id?: string;
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
  guest?: Guest;
  rate: number;
  bookingDetails?: BookingDetails;
  beds?: number;
  maxOccupancy?: number;
  description?: string;
  amenities?: string[];
  extendedStayDays?: number;
  maintenanceNotes?: string;
  serviceCharges?: ServiceCharge[];
}

export interface ServiceCharge {
  category: string;
  name: string;
  price: number;
  quantity: number;
  date: string;
}

@Component({
  selector: 'app-hotel-message',
  templateUrl: './hotel-message.component.html',
  styleUrls: ['./hotel-message.component.scss'],
  providers: [MessageService],
})
export class HotelMessageComponent {
  @Input() showCheckout: boolean = false;
  @Input() room!: Room;
  @Output() closeCheckout = new EventEmitter<void>();
  @Output() checkoutComplete = new EventEmitter<Room>();

  paymentAmount: number = 0;
  paymentMethod: string = 'cash';
  readonly TAX_RATE = 0.075;
  formattedAmount: string = '';
  rawAmount: string = '';

  constructor(private messageService: MessageService) {}

  calculateRoomTotal(): number {
    if (!this.room?.bookingDetails) return 0;
    const nights = this.calculateNights(
      this.room.bookingDetails.checkinDate,
      this.room.bookingDetails.checkoutDate
    );
    return this.room.rate * nights;
  }

  onAmountInput(value: string): void {
    const inputValue = value.replace(/,/g, ''); // Remove commas
    this.rawAmount = inputValue;

    if (inputValue) {
      const numericValue = parseFloat(inputValue);
      if (!isNaN(numericValue)) {
        this.paymentAmount = numericValue;
        this.formattedAmount = this.formatWithCommas(numericValue);
      }
    } else {
      this.paymentAmount = 0;
      this.formattedAmount = '';
    }
  }

  onBlur(): void {
    if (this.rawAmount) {
      const numericValue = parseFloat(this.rawAmount);
      if (!isNaN(numericValue)) {
        this.paymentAmount = numericValue;
      }
    }
  }

  formatWithCommas(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  calculateServiceChargesTotal(): number {
    if (!this.room.serviceCharges) return 0;
    return this.room.serviceCharges.reduce(
      (sum, service) => sum + service.price * service.quantity,
      0
    );
  }

  calculateTaxes(): number {
    const subtotal =
      this.calculateRoomTotal() + this.calculateServiceChargesTotal();
    return subtotal * this.TAX_RATE;
  }

  calculateTotal(): number {
    return (
      this.calculateRoomTotal() +
      this.calculateServiceChargesTotal() +
      this.calculateTaxes()
    );
  }

  calculateBalance(): number {
    const paidAmount = this.room?.bookingDetails?.paidAmount || 0;
    return this.calculateTotal() - paidAmount;
  }

  processPayment(): void {
    if (this.paymentAmount <= 0) return;

    if (!this.room.bookingDetails) {
      this.room.bookingDetails = {
        checkinDate: new Date(),
        checkoutDate: new Date(),
        adults: 1,
        children: 0,
        paymentMethod: this.paymentMethod,
        totalAmount: this.calculateTotal(),
        paidAmount: 0,
        balanceAmount: this.calculateTotal(),
      };
    }

    this.room.bookingDetails.paidAmount += this.paymentAmount;
    this.room.bookingDetails.balanceAmount = this.calculateBalance();
    this.room.bookingDetails.paymentMethod = this.paymentMethod;

    this.messageService.add({
      severity: 'success',
      summary: 'Payment Processed',
      detail: `Payment of ${this.paymentAmount} has been recorded`,
    });

    this.paymentAmount = 0;
  }

  completeCheckout(): void {
    // Update room status to dirty
    this.room.status = 'dirty';

    // Clear guest and booking details
    delete this.room.guest;
    delete this.room.bookingDetails;
    delete this.room.serviceCharges;
    delete this.room.extendedStayDays;

    // Emit checkout complete event
    this.checkoutComplete.emit(this.room);

    this.messageService.add({
      severity: 'success',
      summary: 'Checkout Complete',
      detail: 'Guest has been checked out and room marked as dirty',
    });

    this.closeCheckoutModal();
  }

  closeCheckoutModal(): void {
    this.closeCheckout.emit();
  }
  // Fix for: "Argument of type 'Date | undefined' is not assignable to parameter of type 'Date'"
  calculateNights(
    checkinDate: Date | undefined,
    checkoutDate: Date | undefined
  ): number {
    if (!checkinDate || !checkoutDate) {
      return 0;
    }

    // Convert to milliseconds and calculate the difference
    const diffTime = checkoutDate.getTime() - checkinDate.getTime();

    // Convert the difference to days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }
}
