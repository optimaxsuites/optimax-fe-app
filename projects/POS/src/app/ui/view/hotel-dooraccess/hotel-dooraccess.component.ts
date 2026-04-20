import { Component, Input, OnInit } from '@angular/core';
import { HotelServiceService } from '../hotel-service.service';
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
  selector: 'app-hotel-dooraccess',
  templateUrl: './hotel-dooraccess.component.html',
  styleUrls: ['./hotel-dooraccess.component.scss'],
})
export class HotelDooraccessComponent implements OnInit {
  @Input() room: Room | null = null;
  keyCardId: string = '';
  isProcessing = false;
  lastAccessMessage: string | null = null;
  lastAccessGranted: boolean | null = null;
  lastSync = new Date();
  isOnline = true;

  constructor(
    private keyCardService: HotelServiceService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.simulateLockStatus();
  }

  tryAccess(): void {
    if (!this.room || !this.keyCardId) return;

    this.isProcessing = true;
    this.lastAccessMessage = null;
    this.lastAccessGranted = null;

    setTimeout(() => {
      try {
        const accessResult = this.keyCardService.tryDoorAccess(
          this.keyCardId,
          this.room?.id ?? 0
        );

        this.lastAccessGranted = accessResult.granted;
        this.lastAccessMessage = accessResult.message;

        if (accessResult.granted) {
          this.messageService.add({
            severity: 'success',
            summary: 'Access Granted',
            detail: `Door to Room ${this.room?.number} unlocked`,
            life: 3000,
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Access Denied',
            detail: accessResult.message,
            life: 3000,
          });
        }
      } catch (error) {
        this.lastAccessGranted = false;
        this.lastAccessMessage = 'System Error';
        this.messageService.add({
          severity: 'error',
          summary: 'System Error',
          detail: 'Could not process access request',
          life: 3000,
        });
      } finally {
        this.isProcessing = false;
        this.keyCardId = '';
      }
    }, 800); // Simulate processing delay
  }

  useMobileKey(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Mobile Key',
      detail: 'Sending mobile key request to guest...',
      life: 3000,
    });
  }

  syncLock(): void {
    this.isProcessing = true;
    setTimeout(() => {
      this.lastSync = new Date();
      this.isOnline = Math.random() > 0.2; // 80% chance of being online
      this.isProcessing = false;

      this.messageService.add({
        severity: this.isOnline ? 'success' : 'warn',
        summary: 'Lock Sync',
        detail: this.isOnline
          ? 'Lock synchronized successfully'
          : 'Could not connect to lock',
        life: 3000,
      });
    }, 1500);
  }

  private simulateLockStatus(): void {
    // Simulate changing lock status
    setInterval(() => {
      if (Math.random() > 0.9) {
        // 10% chance of status change
        this.isOnline = !this.isOnline;
      }
    }, 30000);
  }
}
