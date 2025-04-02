import { Component, EventEmitter, Output } from '@angular/core';
import { MessageService } from 'primeng/api';

interface Room {
  id: number;
  type: string;
  status: string;
  floor?: number;
  guest?: string;
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
  selector: 'app-hotel-roomdetails',
  templateUrl: './hotel-roomdetails.component.html',
  styleUrls: ['./hotel-roomdetails.component.scss'],
  providers: [MessageService],
})
export class HotelRoomdetailsComponent {
  previousRoom: Room | null | undefined;
  onExtendStay() {
    throw new Error('Method not implemented.');
  }
  onAddMaintenanceNotes() {
    throw new Error('Method not implemented.');
  }

  showDetails: boolean = false;
  detailedRoom: Room | null = null;
  isAdminView: boolean = true;
  openForm: boolean = false;
  openMessage: boolean = false;

  statusColors: any = {
    available: 'bg-emerald-500',
    booked: 'bg-amber-500',
    occupied: 'bg-blue-500',
    maintenance: 'bg-gray-500',
    dirty: 'bg-red-500',
  };

  constructor(private messageService: MessageService) {}

  get isAvailable(): boolean {
    return this.detailedRoom?.status === 'available';
  }

  get isBooked(): boolean {
    return this.detailedRoom?.status === 'booked';
  }

  get isOccupied(): boolean {
    return this.detailedRoom?.status === 'occupied';
  }

  get isMaintenance(): boolean {
    return this.detailedRoom?.status === 'maintenance';
  }

  get isDirty(): boolean {
    return this.detailedRoom?.status === 'dirty';
  }

  showRoomDetailsModal(room: Room): void {
    this.previousRoom = this.detailedRoom;
    this.detailedRoom = room;
    this.showDetails = true;
  }

  closeModal(): void {
    this.showDetails = false;
    this.detailedRoom = null;
    this.openForm = false;
    if (this.previousRoom) {
      this.detailedRoom = this.previousRoom;
      this.previousRoom = null;
    }
    this.showDetails = true;
  }

  navigateToForm() {
    this.openForm = !this.openForm;
  }

  navigateToMessage() {
    this.openMessage = !this.openMessage;
  }

  onCompleteCleaning(): void {
    if (this.detailedRoom) {
      this.detailedRoom.status = 'available';
      this.messageService.add({
        severity: 'success',
        summary: 'Cleaning Complete',
        detail: `Room ${this.detailedRoom.id} is now available for booking`,
      });
    }
    this.closeModal();
  }

  onCancelBooking(): void {
    if (this.detailedRoom) {
      this.detailedRoom.status = 'available';
      delete this.detailedRoom.guest;
      delete this.detailedRoom.bookingDetails;
      this.messageService.add({
        severity: 'warn',
        summary: 'Booking Cancelled',
        detail: `Booking for Room ${this.detailedRoom.id} has been cancelled`,
      });
    }
    this.closeModal();
  }

  onCompleteMaintenance(): void {
    if (this.detailedRoom) {
      this.detailedRoom.status = 'available';
      this.messageService.add({
        severity: 'success',
        summary: 'Maintenance Complete',
        detail: `Room ${this.detailedRoom.id} is now available`,
      });
    }
    this.closeModal();
  }

  onStartMaintenance(): void {
    if (this.detailedRoom) {
      this.detailedRoom.status = 'maintenance';
      this.messageService.add({
        severity: 'info',
        summary: 'Maintenance Started',
        detail: `Maintenance started for Room ${this.detailedRoom.id}`,
      });
    }
    this.closeModal();
  }
}
