import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// interfaces/hotel.interfaces.ts
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
  roomRates: number;
  subtotal: number;
  taxes: number;
  total: number;
  balanceAmount: number;
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
  masterKeyLevel?: string; // Added property
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

@Injectable({
  providedIn: 'root',
})
export class HotelServiceService {
  private readonly STORAGE_KEY = 'hotel_key_system';
  private readonly MASTER_KEY_ID = 'MASTER-0000';
  private data!: {
    roomKeys: RoomKey[];
    keyLogs: KeyCardLog[];
    masterKey: RoomKey;
  };

  private keysSubject = new BehaviorSubject<RoomKey[]>([]);

  constructor() {
    this.loadFromStorage();
    this.initializeMasterKey();
  }

  private loadFromStorage(): void {
    const storedData = localStorage.getItem(this.STORAGE_KEY);
    if (storedData) {
      this.data = JSON.parse(storedData);
      // Convert string dates back to Date objects
      this.data.roomKeys = this.data.roomKeys.map((key) => ({
        ...key,
        assignedDate: new Date(key.assignedDate),
        deactivationDate: new Date(key.deactivationDate),
      }));
      this.data.keyLogs = this.data.keyLogs.map((log) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
      this.data.masterKey = {
        ...this.data.masterKey,
        assignedDate: new Date(this.data.masterKey.assignedDate),
        deactivationDate: new Date(this.data.masterKey.deactivationDate),
      };
      this.keysSubject.next([...this.data.roomKeys]);
    } else {
      this.data = {
        roomKeys: [],
        keyLogs: [],
        masterKey: this.createMasterKey(
          { id: 0, number: 0, type: 'default', status: 'available', rate: 0 }, // Default Room
          'full', // Default Level
          {
            id: '0',
            title: 'Mr.',
            firstName: 'Default',
            lastName: 'Guest',
            email: 'default@example.com',
            phone: '0000000000',
            country: 'Defaultland',
            idNumber: '0000',
            gender: 'Other',
          } // Default Guest
        ),
      };
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    this.keysSubject.next([...this.data.roomKeys]);
  }

  private initializeMasterKey(): void {
    if (!this.data.masterKey) {
      const defaultRoom: Room = {
        id: 0,
        number: 0,
        type: 'default',
        status: 'available',
        rate: 0,
      };
      const defaultGuest: Guest = {
        id: '0',
        title: 'Mr.',
        firstName: 'Default',
        lastName: 'Guest',
        email: 'default@example.com',
        phone: '0000000000',
        country: 'Defaultland',
        idNumber: '0000',
        gender: 'Other',
      };
      this.data.masterKey = this.createMasterKey(
        defaultRoom,
        'full',
        defaultGuest
      );
      this.saveToStorage();
    }
  }

  assignKey(
    room: Room,
    guest: Guest,
    checkinDate: Date,
    checkoutDate: Date
  ): RoomKey {
    // Deactivate any existing key for this room
    this.deactivateRoomKeys(room.id);

    const newKey: RoomKey = {
      id: this.generateKeyId(),
      roomNumber: room.number,
      roomId: room.id,
      isActive: true,
      assignedDate: new Date(),
      deactivationDate: checkoutDate,
      guestIdNumber: guest.idNumber,
      guestName: `${guest.firstName} ${guest.lastName}`,
    };

    this.data.roomKeys.push(newKey);
    this.saveToStorage();
    return newKey;
  }

  deactivateKey(keyId: string): void {
    const key = this.data.roomKeys.find((k) => k.id === keyId);
    if (key) {
      key.isActive = false;
      key.deactivationDate = new Date();
      this.saveToStorage();
    }
  }

  deactivateRoomKeys(roomId: number): void {
    this.data.roomKeys
      .filter((k) => k.roomId === roomId && k.isActive)
      .forEach((k) => {
        k.isActive = false;
        k.deactivationDate = new Date();
      });
    this.saveToStorage();
  }

  reportLostCard(keyId: string): void {
    this.deactivateKey(keyId);
  }

  getAccessLogs(roomId?: number): KeyCardLog[] {
    if (roomId) {
      return this.data.keyLogs.filter((log) => log.roomId === roomId);
    }
    return [...this.data.keyLogs];
  }

  isKeyValid(keyId: string, roomId: number): boolean {
    if (keyId === this.MASTER_KEY_ID) return true;

    const key = this.data.roomKeys.find(
      (k) => k.id === keyId && k.roomId === roomId
    );
    if (!key) return false;

    const now = new Date();
    return (
      key.isActive && now >= key.assignedDate && now <= key.deactivationDate
    );
  }

  getMasterKey(): RoomKey {
    return { ...this.data.masterKey };
  }

  getActiveKeys(): RoomKey[] {
    const now = new Date();
    return this.data.roomKeys.filter(
      (k) => k.isActive && now >= k.assignedDate && now <= k.deactivationDate
    );
  }

  getKeys(): Observable<RoomKey[]> {
    return this.keysSubject.asObservable();
  }

  private generateKeyId(): string {
    return 'KEY-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private generateLogId(): string {
    return 'LOG-' + Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  // For cleanup - deactivate expired keys
  cleanupExpiredKeys(): void {
    const now = new Date();
    let changed = false;

    this.data.roomKeys.forEach((key) => {
      if (key.isActive && now > key.deactivationDate) {
        key.isActive = false;
        changed = true;
      }
    });

    if (changed) {
      this.saveToStorage();
    }
  }

  createMasterKey(room: Room, level: string, guest: Guest): RoomKey {
    const masterKeyPrefix = this.getMasterKeyPrefix(level);
    const newKey: RoomKey = {
      id: `${masterKeyPrefix}-${this.generateKeyId()}`,
      roomNumber: room.number,
      roomId: room.id,
      isActive: true,
      assignedDate: new Date(),
      deactivationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week validity
      guestIdNumber: guest.idNumber,
      guestName: `${guest.firstName} ${guest.lastName}`,
      accessType: 'MASTER',
      masterKeyLevel: level,
    };

    this.data.roomKeys.push(newKey);
    this.saveToStorage();
    return newKey;
  }

  private getMasterKeyPrefix(level: string): string {
    switch (level) {
      case 'floor':
        return 'MFLOOR';
      case 'section':
        return 'MSECT';
      case 'full':
        return 'MFULL';
      default:
        return 'MMAST';
    }
  }

  assignExistingKey(
    keyId: string,
    roomId: number,
    guestIdNumber: string,
    guestName: string
  ): RoomKey {
    const key = this.data.roomKeys.find((k) => k.id === keyId);
    if (!key) {
      throw new Error('Key not found');
    }

    // Deactivate any existing key for this room
    this.deactivateRoomKeys(roomId);

    // Update the key with new assignment
    const room = this.getRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    key.roomId = roomId;
    key.roomNumber = room.number;
    key.guestIdNumber = guestIdNumber;
    key.guestName = guestName;
    key.isActive = true;
    key.assignedDate = new Date();
    key.deactivationDate = this.calculateDefaultDeactivationDate();

    this.saveToStorage();
    return key;
  }
  calculateDefaultDeactivationDate(): Date {
    throw new Error('Method not implemented.');
  }

  getRoomById(roomId: number): Room | undefined {
    // Implement logic to retrieve a room by its ID
    // For now, return undefined as a placeholder
    return undefined;
  }

  getAvailableKeys(roomId?: number): RoomKey[] {
    const now = new Date();
    return this.data.roomKeys.filter(
      (key) =>
        (!key.roomId || key.roomId === roomId) &&
        key.isActive &&
        now <= key.deactivationDate &&
        key.id !== this.MASTER_KEY_ID
    );
  }

  tryDoorAccess(
    keyId: string,
    roomId: number
  ): { granted: boolean; message: string } {
    if (keyId === this.MASTER_KEY_ID) {
      this.logAccess(0, 0, keyId, 'SYSTEM', true);
      return { granted: true, message: 'Master Access Granted' };
    }

    const key = this.data.roomKeys.find((k) => k.id === keyId);
    const now = new Date();

    if (!key) {
      this.logAccess(0, roomId, keyId, 'UNKNOWN', false);
      return { granted: false, message: 'Invalid Key Card' };
    }

    if (!key.isActive) {
      this.logAccess(key.roomNumber, roomId, keyId, key.guestIdNumber, false);
      return { granted: false, message: 'Key Deactivated' };
    }

    if (now < key.assignedDate) {
      this.logAccess(key.roomNumber, roomId, keyId, key.guestIdNumber, false);
      return { granted: false, message: 'Key Not Yet Active' };
    }

    if (now > key.deactivationDate) {
      this.logAccess(key.roomNumber, roomId, keyId, key.guestIdNumber, false);
      return { granted: false, message: 'Key Expired' };
    }

    if (key.roomId !== roomId && key.accessType !== 'MASTER') {
      this.logAccess(key.roomNumber, roomId, keyId, key.guestIdNumber, false);
      return { granted: false, message: 'Key Not Valid For This Room' };
    }

    // If we get here, access is granted
    this.logAccess(
      key.roomNumber,
      roomId,
      keyId,
      key.guestIdNumber,
      true,
      key.accessType as 'GUEST' | 'MASTER' | 'STAFF' | undefined
    );

    return {
      granted: true,
      message:
        key.accessType === 'MASTER'
          ? 'Master Access Granted'
          : 'Access Granted',
    };
  }

  logAccess(
    roomNumber: number,
    roomId: number,
    keyCardId: string,
    guestIdNumber: string,
    accessGranted: boolean,
    accessType?: 'GUEST' | 'MASTER' | 'STAFF'
  ): void {
    const determinedAccessType =
      keyCardId === this.MASTER_KEY_ID ? 'MASTER' : accessType || 'GUEST';

    const log: KeyCardLog = {
      id: this.generateLogId(),
      roomNumber,
      roomId,
      keyCardId,
      guestIdNumber,
      accessType: determinedAccessType,
      timestamp: new Date(),
      accessGranted,
    };

    this.data.keyLogs.push(log);
    this.saveToStorage();
  }
}
