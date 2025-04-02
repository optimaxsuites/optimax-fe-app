// hotel-checkout-modal.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';

export interface BookingDetails {
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  checkinDate: Date | string;
  checkoutDate: Date | string;
  adults: number;
  children?: number;
  specialRequests?: string;
  paymentMethod?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
}

export interface Room {
  id: number;
  type: string;
  status: string;
  floor?: number;
  guest?: string;
  selected?: boolean;
  bookingDetails?: BookingDetails;
  beds?: number;
  maxOccupancy?: number;
  rate: number;
  description?: string;
  amenities?: string[];
  extendedStayDays?: number;
}

export interface ServiceCharge {
  category: string;
  name: string;
  price: number;
  quantity: number;
  date: Date | string;
}

export interface BillItem {
  name: string;
  price: number;
  quantity: number;
}

export interface OtherCharge {
  name: string;
  price: number;
  quantity: number;
}
@Component({
  selector: 'app-hotel-message',
  templateUrl: './hotel-message.component.html',
  styleUrls: ['./hotel-message.component.scss'],
  providers: [MessageService],
})
export class HotelMessageComponent {
  @Input() showCheckout: boolean = false;
  @Input() detailedRoom!: Room;
  @Input() serviceCharges: ServiceCharge[] = [];
  @Input() otherCharges: OtherCharge[] = [];

  @Output() closeCheckoutEvent = new EventEmitter<void>();
  @Output() processPaymentEvent = new EventEmitter<void>();
  @Output() printInvoiceEvent = new EventEmitter<void>();
  @Output() checkoutGuestEvent = new EventEmitter<void>();

  // Sample tax rate (7.5%)
  readonly TAX_RATE = 0.075;

  constructor(private messageService: MessageService) {}

  closeCheckout(): void {
    this.closeCheckoutEvent.emit();
  }

  // Add these methods to your HotelCheckoutModalComponent

  getServiceItems(category: string): ServiceCharge[] {
    return this.serviceCharges.filter(
      (service) =>
        service.name.includes(category) || service.category === category
    );
  }

  getServiceTotal(category: string): number {
    return this.getServiceItems(category).reduce(
      (sum, service) => sum + service.price * service.quantity,
      0
    );
  }

  getOtherServiceCategories(): string[] {
    const allCategories = this.serviceCharges.map(
      (service) => service.category || service.name.split(' - ')[0]
    );
    const uniqueCategories = [...new Set(allCategories)];
    return uniqueCategories.filter(
      (cat) => cat && !['Mini Bar', 'Kitchen'].includes(cat)
    );
  }

  calculateServiceChargesTotal(): number {
    return this.serviceCharges.reduce(
      (sum, service) => sum + service.price * service.quantity,
      0
    );
  }

  processPayment(): void {
    this.processPaymentEvent.emit();
    this.messageService.add({
      severity: 'success',
      summary: 'Payment Processed',
      detail: 'Payment was successfully processed',
    });
  }

  printInvoice(): void {
    this.printInvoiceEvent.emit();
  }

  checkoutGuest(): void {
    this.checkoutGuestEvent.emit();
    this.messageService.add({
      severity: 'success',
      summary: 'Checkout Complete',
      detail: 'Guest has been checked out successfully',
    });
  }

  calculateNights(
    checkinDate: Date | string,
    checkoutDate: Date | string
  ): number {
    if (!checkinDate || !checkoutDate) return 0;

    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    return Math.ceil(
      (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  calculateRoomTotal(): number {
    if (!this.detailedRoom?.bookingDetails) return 0;

    const nights = this.calculateNights(
      this.detailedRoom.bookingDetails.checkinDate,
      this.detailedRoom.bookingDetails.checkoutDate
    );
    return this.detailedRoom.rate * nights;
  }

  calculateOtherChargesTotal(): number {
    return this.otherCharges.reduce(
      (sum, charge) => sum + charge.price * charge.quantity,
      0
    );
  }

  calculateTaxes(): number {
    const subtotal =
      this.calculateRoomTotal() +
      this.calculateServiceChargesTotal() +
      this.calculateOtherChargesTotal();
    return subtotal * this.TAX_RATE;
  }

  calculateTotal(): number {
    return (
      this.calculateRoomTotal() +
      this.calculateServiceChargesTotal() +
      this.calculateOtherChargesTotal() +
      this.calculateTaxes()
    );
  }

  calculateBalance(): number {
    const paidAmount = this.detailedRoom?.bookingDetails?.paidAmount || 0;
    return this.calculateTotal() - paidAmount;
  }

  getPaymentMethod(): string {
    return this.detailedRoom?.bookingDetails?.paymentMethod || 'Not specified';
  }
}
