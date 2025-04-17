import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { Room } from '../hotel-message/hotel-message.component';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-hotel-extendstay',
  templateUrl: './hotel-extendstay.component.html',
  styleUrls: ['./hotel-extendstay.component.scss'],
  providers: [MessageService],
})
export class HotelExtendstayComponent implements OnChanges, OnInit {
  @Input() selectedRoom!: Room;
  @Output() back = new EventEmitter<void>();
  @Output() stayExtended = new EventEmitter<Room>();

  extendedDays: number = 1;
  newCheckoutDate: Date = new Date();
  additionalCost: number = 0;
  taxAmount: number = 0;
  totalWithTax: number = 0;
  readonly TAX_RATE = 0.075;
  isSaving: boolean = false;
  lastExtendedDays: number = 0; // Track last successful extension

  constructor(
    private messageService: MessageService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFromLocalStorage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedRoom'] && this.selectedRoom?.bookingDetails) {
      this.calculateExtensionDetails();
    }
  }

  saveToLocalStorage(): void {
    if (this.selectedRoom) {
      localStorage.setItem('selectedRoom', JSON.stringify(this.selectedRoom));
    }
  }

  calculateExtensionDetails(): void {
    if (!this.selectedRoom?.bookingDetails) return;

    const currentCheckout = new Date(
      this.selectedRoom.bookingDetails.checkoutDate
    );
    this.newCheckoutDate = new Date(currentCheckout);
    this.newCheckoutDate.setDate(currentCheckout.getDate() + this.extendedDays);
    this.calculateAdditionalCost();
  }

  calculateAdditionalCost(): void {
    if (!this.selectedRoom) return;

    const baseCost = this.selectedRoom.rate * this.extendedDays;
    this.taxAmount = baseCost * this.TAX_RATE;
    this.totalWithTax = baseCost + this.taxAmount;
    this.additionalCost = this.totalWithTax;
  }

  onDaysChange(): void {
    this.extendedDays = Math.max(1, this.extendedDays);
    this.calculateExtensionDetails();
    this.cdRef.detectChanges();
  }

  extendStay(): void {
    if (this.isSaving) return;
    this.isSaving = true;

    if (!this.selectedRoom?.bookingDetails) {
      this.isSaving = false;
      return;
    }

    try {
      this.onDaysChange(); // Ensure latest calculations

      const newCheckout = new Date(this.newCheckoutDate);
      this.lastExtendedDays = this.extendedDays; // Store for success message

      const updatedRoom: Room = {
        ...this.selectedRoom,
        bookingDetails: {
          ...this.selectedRoom.bookingDetails,
          checkoutDate: newCheckout,
          totalAmount:
            this.selectedRoom.bookingDetails.totalAmount + this.additionalCost,
          balanceAmount:
            this.selectedRoom.bookingDetails.totalAmount +
            this.additionalCost -
            (this.selectedRoom.bookingDetails.paidAmount || 0),
        },
        extendedStayDays:
          (this.selectedRoom.extendedStayDays || 0) + this.extendedDays,
      };

      this.updateMainRoomsArray(updatedRoom);

      // Show success message but don't navigate away
      this.showSuccessMessage(updatedRoom);

      // Update local state without resetting the form
      this.selectedRoom = updatedRoom;
      this.extendedDays = 1; // Reset for next extension
      this.calculateExtensionDetails(); // Recalculate with new base date

      // Emit the updated room
      this.stayExtended.emit(updatedRoom);
    } catch (error) {
      console.error('Error extending stay:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not extend stay. Please try again.',
      });
    } finally {
      this.isSaving = false;
    }
  }

  private showSuccessMessage(updatedRoom: Room): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Stay Extended',
      detail: `Stay extended by ${
        this.lastExtendedDays
      } day(s) until ${this.formatDate(
        this.newCheckoutDate
      )}. New balance: ${this.formatAsNaira(
        updatedRoom.bookingDetails?.balanceAmount ?? 0
      )}`,
      life: 3000, // Show for 3 seconds
    });
  }

  private updateMainRoomsArray(updatedRoom: Room): void {
    try {
      const storedRooms = localStorage.getItem('rooms');
      if (storedRooms) {
        const rooms: Room[] = JSON.parse(storedRooms);
        const updatedRooms = rooms.map((room) =>
          room.id === updatedRoom.id ? updatedRoom : room
        );
        localStorage.setItem('rooms', JSON.stringify(updatedRooms));
      }
      localStorage.setItem('selectedRoom', JSON.stringify(updatedRoom));
    } catch (error) {
      console.error('Error updating localStorage:', error);
      throw error;
    }
  }

  goBack(): void {
    this.back.emit();
  }

  formatAsNaira(amount: number): string {
    return (
      '₦' +
      amount.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  loadFromLocalStorage(): void {
    if (!this.selectedRoom) {
      const storedRoomData = localStorage.getItem('selectedRoom');
      if (storedRoomData) {
        try {
          const parsedRoom = JSON.parse(storedRoomData);
          if (parsedRoom.bookingDetails) {
            parsedRoom.bookingDetails.checkinDate = new Date(
              parsedRoom.bookingDetails.checkinDate
            );
            parsedRoom.bookingDetails.checkoutDate = new Date(
              parsedRoom.bookingDetails.checkoutDate
            );
          }
          this.selectedRoom = parsedRoom;
          this.calculateExtensionDetails();
          this.cdRef.detectChanges();
        } catch (error) {
          console.error('Error parsing localStorage:', error);
        }
      }
    }
  }
}
