import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PrimeNGConfig } from 'primeng/api';

interface BookingLog {
  id: string;
  roomNumber: number;
  roomType: string;
  roomStatus: string;
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  guestIdNumber?: string;
  checkinDate: Date;
  checkoutDate: Date;
  status: string;
  paymentMethod: string;
  specialRequests?: string;
  createdAt: Date;
  housekeepingStatus: string;
  lastCleaned?: Date;
  maintenanceReason?: string; // Add maintenance reason
  maintenanceTasks?: string[]; // Add maintenance tasks
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
  housekeepingStatus?: string;
  lastCleaned?: Date;
  maintenanceReason?: string; // Add maintenance reason
  maintenanceTasks?: string[]; // Add maintenance tasks
}

interface Statistics {
  totalBookings: number;
  activeStays: number;
  upcomingCheckins: number;
  totalAvailableRooms: number; // Total available rooms
  roomsNeedingCleaning: number; // New statistic
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
}

export interface Booking {
  guest: Guest;
  checkinDate: Date;
  checkoutDate: Date;
  adults: number;
  children: number;
  specialRequests: string;
  paymentMethod: string;
  roomIds: number[];
  roomTypes: string[];
  status?: string;
}

@Component({
  selector: 'app-housekeeping-records',
  templateUrl: './housekeeping-records.component.html',
  styleUrl: './housekeeping-records.component.scss',
})
export class HousekeepingRecordsComponent implements OnInit {
  @Output() back = new EventEmitter();
  loading = false;
  logs: BookingLog[] = [];
  filteredLogs: BookingLog[] = [];
  selectedLog: BookingLog | null = null;
  displayDialog = false;
  currentDate = new Date();
  allRooms: Room[] = [];

  dateRange: Date[] | null = null;
  selectedStatus: any = { value: 'all', label: 'All Statuses' };

  statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'checked-in', label: 'Checked In' },
    { value: 'checked-out', label: 'Checked Out' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no-show', label: 'No Show' },
  ];

  housekeepingOptions = [
    { value: 'clean', label: 'Clean' },
    { value: 'dirty', label: 'Dirty' },
    { value: 'inspected', label: 'Inspected' },
    { value: 'under-maintenance', label: 'Under Maintenance' },
  ];

  statistics: Statistics = {
    totalBookings: 0,
    activeStays: 0,
    upcomingCheckins: 0,
    totalAvailableRooms: 0,
    roomsNeedingCleaning: 0,
  };

  filterValues: { [key: string]: string } = {
    roomNumber: '',
    guestName: '',
    status: '',
    housekeepingStatus: '',
  };

  constructor(
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig
  ) {}

  getRoomsByFloor(): { [floor: number]: Room[] } {
    return this.allRooms.reduce((acc, room) => {
      const floor = room.floor || 0;
      if (!acc[floor]) {
        acc[floor] = [];
      }
      acc[floor].push(room);
      return acc;
    }, {} as { [floor: number]: Room[] });
  }

  getFloors(): number[] {
    return Object.keys(this.getRoomsByFloor()).map(Number).sort();
  }

  getRoomStatusTextColor(status: string): string {
    switch (status) {
      case 'available':
        return 'text-green';
      case 'booked':
        return 'text-white';
      case 'occupied':
        return 'text-white';
      case 'maintenance':
        return 'text-white';
      case 'dirty':
        return 'text-white';
      default:
        return 'text-white';
    }
  }

  getHousekeepingStatusClass(status: string): string {
    switch (status) {
      case 'clean':
        return 'bg-green-300';
      case 'dirty':
        return 'bg-red-300';
      case 'inspected':
        return 'bg-purple-300';
      case 'under-maintenance':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  }

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    this.allRooms = this.getAllRooms();
    this.loadLogs();

    // Check every hour if it's 6 AM
    setInterval(() => {
      this.checkAndUpdateMorningStatus();
    }, 60 * 60 * 1000); // Check every hour

    // Also check immediately in case the app starts at 6 AM
    this.checkAndUpdateMorningStatus();
  }

  private loadLogs(): void {
    this.loading = true;

    try {
      const storedRooms = localStorage.getItem('rooms');
      if (!storedRooms) {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Data',
          detail: 'No room data found in local storage',
        });
        return;
      }

      const rooms: Room[] = JSON.parse(storedRooms);

      this.logs = rooms
        .filter(
          (room) =>
            room.status === 'available' ||
            room.status === 'maintenance' ||
            room.status === 'dirty' ||
            (room.bookingDetails && room.guest)
        )
        .map((room) => this.createBookingLog(room));

      this.logs.sort(
        (a, b) => b.checkinDate.getTime() - a.checkinDate.getTime()
      );

      this.filteredLogs = [...this.logs];
      this.calculateStatistics();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load booking logs',
      });
      console.error('Error loading logs:', error);
    } finally {
      this.loading = false;
    }
  }

  private getAllRooms(): Room[] {
    const storedRooms = localStorage.getItem('rooms');
    if (!storedRooms) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'No room data found in local storage',
      });
      return [];
    }
    return JSON.parse(storedRooms);
  }

  private determineBookingStatus(room: Room): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkinDate = new Date(room.bookingDetails?.checkinDate || today);
    const checkoutDate = new Date(room.bookingDetails?.checkoutDate || today);

    if (room.status === 'cancelled') return 'cancelled';
    if (room.status === 'maintenance') return 'maintenance';
    if (room.status === 'occupied') return 'checked-in';
    if (room.status === 'dirty') return 'checked-out';
    if (room.status === 'booked') {
      if (checkinDate > today) return 'confirmed';
      if (checkinDate <= today && checkoutDate >= today) return 'no-show';
    }
    if (room.status === 'available') {
      if (checkoutDate < today) return 'dirt';
      return 'available';
    }
    return 'unknown';
  }

  private calculateStatistics(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const occupiedRooms = this.logs.filter(
      (log) => log.roomStatus === 'occupied'
    ).length;

    this.statistics = {
      totalBookings: this.logs.length,
      activeStays: occupiedRooms,
      upcomingCheckins: this.logs.filter(
        (log) =>
          log.roomStatus === 'booked' && new Date(log.checkinDate) > today
      ).length,
      totalAvailableRooms: this.allRooms.filter(
        (room) => room.status === 'available'
      ).length,
      roomsNeedingCleaning: this.logs.filter(
        (log) => log.housekeepingStatus === 'dirty'
      ).length,
    };
  }

  applyFilters(): void {
    this.filteredLogs = this.logs.filter((log) => {
      // Status filter
      const statusMatch =
        this.selectedStatus.value === 'all' ||
        log.status === this.selectedStatus.value;

      // Date range filter
      let dateMatch = true;
      if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
        const startDate = new Date(this.dateRange[0]);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(this.dateRange[1]);
        endDate.setHours(23, 59, 59, 999);

        const logCheckin = new Date(log.checkinDate);
        logCheckin.setHours(0, 0, 0, 0);

        const logCheckout = new Date(log.checkoutDate);
        logCheckout.setHours(0, 0, 0, 0);

        dateMatch =
          (logCheckin >= startDate && logCheckin <= endDate) ||
          (logCheckout >= startDate && logCheckout <= endDate) ||
          (logCheckin <= startDate && logCheckout >= endDate);
      }

      // Text filters
      const roomNumberMatch =
        !this.filterValues['roomNumber'] ||
        log.roomNumber.toString().includes(this.filterValues['roomNumber']);

      const guestNameMatch =
        !this.filterValues['guestName'] ||
        log.guestName
          .toLowerCase()
          .includes(this.filterValues['guestName'].toLowerCase());

      const statusTextMatch =
        !this.filterValues['status'] ||
        log.status
          .toLowerCase()
          .includes(this.filterValues['status'].toLowerCase());

      const housekeepingMatch =
        !this.filterValues['housekeepingStatus'] ||
        log.housekeepingStatus
          .toLowerCase()
          .includes(this.filterValues['housekeepingStatus'].toLowerCase());

      return (
        statusMatch &&
        dateMatch &&
        roomNumberMatch &&
        guestNameMatch &&
        statusTextMatch &&
        housekeepingMatch
      );
    });

    this.calculateStatistics();
  }

  onFilter(event: Event, field: string): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterValues[field] = value;
    this.applyFilters();
  }

  clearDateFilter(): void {
    this.dateRange = null;
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedStatus = { value: 'all', label: 'All Statuses' };
    this.dateRange = null;
    this.filterValues = {
      roomNumber: '',
      guestName: '',
      status: '',
      housekeepingStatus: '',
    };
    this.applyFilters();
  }

  viewDetails(log: BookingLog): void {
    console.log('Selected log:', log);
    this.selectedLog = log;
    this.displayDialog = true;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-green-300';
      case 'confirmed':
        return 'bg-amber-300';
      case 'checked-in':
        return 'bg-blue-300';
      case 'maintenance':
        return 'bg-gray-300';
      case 'checked-out':
        return 'bg-red-300';
      case 'no-show':
        return 'bg-red-300';
      default:
        return 'bg-gray-300';
    }
  }

  goBack(): void {
    this.back.emit();
  }

  getRoomStatusColor(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'booked':
        return 'bg-amber-500';
      case 'occupied':
        return 'bg-blue-500';
      case 'maintenance':
        return 'bg-gray-500';
      case 'dirty':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  getDayDifference(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  }

  calculateNights(checkinDate: Date, checkoutDate: Date): number {
    const diffTime = checkoutDate.getTime() - checkinDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  onRowClick(log: BookingLog) {
    if (
      log.roomStatus === 'booked' ||
      log.roomStatus === 'occupied' ||
      log.roomStatus === 'available' ||
      log.roomStatus === 'maintenance'
    ) {
      this.viewDetails(log);
    } else {
      console.log(
        'Room is not booked or occupied:',
        log.roomNumber,
        log.roomStatus
      );
    }
  }

  printLogs(): void {
    window.print();
  }

  updateHousekeepingStatus(log: BookingLog, status: string): void {
    if (log.roomStatus === 'maintenance') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Update',
        detail:
          'Housekeeping status cannot be changed for rooms under maintenance',
      });
      return;
    }

    log.housekeepingStatus = status;
    log.lastCleaned = new Date();

    // Update the room in local storage
    const rooms: Room[] = JSON.parse(localStorage.getItem('rooms') || '[]');
    const roomIndex = rooms.findIndex((r) => r.number === log.roomNumber);
    if (roomIndex !== -1) {
      rooms[roomIndex].housekeepingStatus = status;
      rooms[roomIndex].lastCleaned = new Date();
      localStorage.setItem('rooms', JSON.stringify(rooms));
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Status Updated',
      detail: `Housekeeping status updated to ${status}`,
    });

    this.calculateStatistics();
  }

  private createBookingLog(room: Room): BookingLog {
    const guestName = room.guest
      ? `${room.guest.title} ${room.guest.firstName} ${room.guest.lastName}`
      : 'N/A';

    // Determine housekeeping status - maintenance rooms should show as 'under-maintenance'
    const housekeepingStatus =
      room.status === 'maintenance'
        ? 'under-maintenance'
        : room.housekeepingStatus || 'clean';

    return {
      id: `${room.id}-${
        room.bookingDetails?.checkinDate || new Date().toISOString()
      }`,
      roomNumber: room.number,
      roomType: room.type,
      roomStatus: room.status,
      guestName: guestName,
      guestEmail: room.guest?.email,
      guestPhone: room.guest?.phone || 'N/A',
      guestIdNumber: room.guest?.idNumber,
      checkinDate: room.bookingDetails
        ? new Date(room.bookingDetails.checkinDate)
        : new Date(),
      checkoutDate: room.bookingDetails
        ? new Date(room.bookingDetails.checkoutDate)
        : new Date(),
      status: this.determineBookingStatus(room),
      paymentMethod: room.bookingDetails?.paymentMethod || 'N/A',
      specialRequests: room.bookingDetails?.specialRequests,
      createdAt: new Date(),
      housekeepingStatus: housekeepingStatus,
      lastCleaned: room.lastCleaned ? new Date(room.lastCleaned) : undefined,
      maintenanceReason: room.maintenanceReason,
      maintenanceTasks: room.maintenanceTasks,
    };
  }
  private checkAndUpdateMorningStatus(): void {
    const now = new Date();
    const hours = now.getHours();

    // Check if it's 6 AM (you might want to make this configurable)
    if (hours === 6) {
      const rooms: Room[] = JSON.parse(localStorage.getItem('rooms') || '[]');
      let updated = false;

      // Mark all occupied rooms as dirty
      const updatedRooms = rooms.map((room) => {
        if (room.status === 'occupied') {
          if (room.housekeepingStatus !== 'dirty') {
            room.housekeepingStatus = 'dirty';
            room.lastCleaned = undefined;
            updated = true;
          }
        }
        return room;
      });

      if (updated) {
        localStorage.setItem('rooms', JSON.stringify(updatedRooms));
        this.loadLogs(); // Refresh the logs

        this.messageService.add({
          severity: 'info',
          summary: 'Morning Update',
          detail: 'All occupied rooms have been marked as dirty for cleaning',
          life: 5000,
        });
      }
    }
  }
}
