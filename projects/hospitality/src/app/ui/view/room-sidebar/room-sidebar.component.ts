import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

// models/service.model.ts
export interface ServiceItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  availableQuantity?: number;
}

export interface ServiceOrder {
  id?: string;
  items: ServiceOrderItem[];
  roomNumber?: number;
  guestName?: string;
  isExternal: boolean;
  customerName?: string;
  customerPhone?: string;
  orderDate: Date;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  paymentMethod?: string;
  serviceType: 'mini-bar' | 'spa' | 'kitchen' | 'laundry';
  notes?: string;
}

export interface ServiceOrderItem {
  item: ServiceItem;
  quantity: number;
  specialRequests?: string;
  subtotal: number;
}

// models/cart.model.ts
export interface CartItem extends ServiceOrderItem {
  serviceType: 'mini-bar' | 'spa' | 'kitchen' | 'laundry';
}

export interface Cart {
  items: CartItem[];
  roomNumber?: number;
  isExternal: boolean;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}
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
  selector: 'app-room-sidebar',
  templateUrl: './room-sidebar.component.html',
  styleUrl: './room-sidebar.component.scss',
})
export class RoomSidebarComponent {
  @Input() selectedRooms: Room[] = [];

  constructor(public router: Router) {}

  serviceTypes = [
    { name: 'Sport', path: 'sports' },
    { name: 'Laundry', path: 'laundry' },
    { name: 'Kitchen / Room Service', path: 'room sevice' },
    { name: 'Housekeeping Record', path: 'Housekeeping Record' },
    { name: 'Spa', path: 'room' },
    { name: 'Gym', path: 'admin' },
    { name: 'Bar', path: 'bar' },
  ];

  selectedService: string | null = null;

  getFilterClass(type: string): string {
    const baseClasses =
      'p-4 font-bold text-xl rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between';
    return this.selectedService === type
      ? `${baseClasses} bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg border-2 border-emerald-700`
      : `${baseClasses} bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-300`;
  }

  selectService(type: string, path: string): void {
    if (this.selectedService === type) {
      this.selectedService = null;
      this.router.navigate(['/user/hospitality/services/:uuid']);
    } else {
      // Select - navigate to the service
      this.selectedService = type;

      if (this.selectedRooms && this.selectedRooms.length > 0) {
        const roomNumbers = this.selectedRooms.map((room) => room.number);
        this.router.navigate(['/user/hospitality/services/:uuid', path], {
          queryParams: { rooms: roomNumbers.join(',') },
        });
      } else {
        this.router.navigate(['/user/hospitality/services/:uuid', path]);
      }
    }
  }

  isActive(path: string): boolean {
    return this.router.url.includes(path);
  }
}
