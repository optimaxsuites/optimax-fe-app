import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { HotelServiceService } from '../hotel-service.service';

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
  currentKey?: RoomKey;
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
  accessType?: string; // 'GUEST' | 'STAFF' | 'MASTER'
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
  selector: 'app-hotel-keycard',
  templateUrl: './hotel-keycard.component.html',
  styleUrls: ['./hotel-keycard.component.scss'],
})
export class HotelKeycardComponent implements OnInit {
  @Input() room: Room | null = null;
  @Input() guest: Guest | null = null;
  @Input() checkinDate: Date = new Date();
  @Input() checkoutDate: Date = new Date();
  @Output() keyAssigned = new EventEmitter<RoomKey>();
  displayKeyCardModal: boolean = false; // Initially hidden

  assignedKey: RoomKey | null = null;
  isAssigning = false;
  displayAssignDialog = false;
  accessLogs: KeyCardLog[] = [];

  // Key type options
  keyTypes = [
    { label: 'Guest Key', value: 'guest' },
    { label: 'Master Key', value: 'master' },
    { label: 'Staff Key', value: 'staff' },
  ];
  selectedKeyType = 'guest';

  // Master key levels
  masterKeyLevels = [
    { label: 'Floor Master', value: 'floor' },
    { label: 'Section Master', value: 'section' },
    { label: 'Full Master', value: 'full' },
  ];
  selectedMasterKeyLevel = 'floor';

  availableKeys: RoomKey[] = [];
  selectedExistingKey: string | null = null;

  constructor(
    private keyCardService: HotelServiceService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadKeyData();
    this.loadAccessLogs();
  }

  private loadKeyData(): void {
    if (this.room?.currentKey) {
      this.assignedKey = this.room.currentKey;
    } else if (this.room?.id) {
      const activeKey = this.keyCardService
        .getActiveKeys()
        .find((k) => k.roomId === this.room?.id);
      if (activeKey) {
        this.assignedKey = activeKey;
      }
    }
  }

  private loadAccessLogs(): void {
    if (this.room?.id) {
      this.accessLogs = this.keyCardService
        .getAccessLogs(this.room.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
  }

  createNewKey(): void {
    if (!this.room || !this.guest) return;

    this.isAssigning = true;
    try {
      let newKey: RoomKey;

      if (this.selectedKeyType === 'master') {
        newKey = this.keyCardService.createMasterKey(
          this.room,
          this.selectedMasterKeyLevel,
          this.guest
        );
      } else {
        newKey = this.keyCardService.assignKey(
          this.room,
          this.guest,
          this.checkinDate,
          this.checkoutDate
        );
      }

      this.assignedKey = newKey;
      this.keyAssigned.emit(newKey);
      this.messageService.add({
        severity: 'success',
        summary: 'Key Created',
        detail: `New ${this.getKeyTypeLabel(
          newKey.accessType || 'Unknown'
        )} key created for Room ${this.room.number}`,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Key Creation Failed',
        detail: 'Failed to create new key card',
      });
    } finally {
      this.isAssigning = false;
    }
  }

  openKeyCardModal(): void {
    this.displayKeyCardModal = true; // Show the dialog
  }

  closeKeyCardModal(): void {
    this.displayKeyCardModal = false; // Hide the dialog
  }

  showAssignDialog(): void {
    this.availableKeys = this.keyCardService.getAvailableKeys(this.room?.id);
    this.displayAssignDialog = true;
  }

  assignExistingKey(): void {
    if (!this.selectedExistingKey || !this.room || !this.guest) return;

    this.isAssigning = true;
    try {
      const assignedKey = this.keyCardService.assignExistingKey(
        this.selectedExistingKey,
        this.room.id,
        this.guest.idNumber,
        `${this.guest.firstName} ${this.guest.lastName}`
      );

      this.assignedKey = assignedKey;
      this.displayAssignDialog = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Key Assigned',
        detail: `Key ${assignedKey.id} assigned to Room ${this.room.number}`,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Assignment Failed',
        detail: 'Failed to assign existing key card',
      });
    } finally {
      this.isAssigning = false;
    }
  }

  deactivateKey(): void {
    if (this.assignedKey) {
      this.keyCardService.deactivateKey(this.assignedKey.id);
      this.messageService.add({
        severity: 'warn',
        summary: 'Key Deactivated',
        detail: `Key ${this.assignedKey.id} has been deactivated`,
      });
      this.assignedKey = null;
    }
  }

  // printKeyCard(): void {
  //   if (this.assignedKey) {
  //     this.keyCardService.printKeyCard(this.assignedKey);
  //     this.messageService.add({
  //       severity: 'info',
  //       summary: 'Printing Key Card',
  //       detail: 'Sending key card to printer...',
  //     });
  //   }
  // }

  getKeyTypeLabel(accessType: string): string {
    switch (accessType) {
      case 'GUEST':
        return 'Guest Key';
      case 'STAFF':
        return 'Staff Key';
      case 'MASTER':
        return 'Master Key';
      default:
        return 'Unknown Key Type';
    }
  }
}
