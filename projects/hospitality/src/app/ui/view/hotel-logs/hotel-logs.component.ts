import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PrimeNGConfig } from 'primeng/api';
import {
  HotelserviceService,
  Booking,
  Guest,
  Room,
  BookingStatus,
  RoomTypeDTO,
  RoomStatus,
} from '../../hospitality/hotelservice.service';

interface BookingLog {
  id: string;
  roomNumber: string;
  roomType: string;
  roomStatus: RoomStatus;
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  guestIdNumber?: string;
  checkinDate: Date;
  checkoutDate: Date;
  status: BookingStatus;
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  specialRequests?: string;
  createdAt: Date;
}

interface Statistics {
  totalBookings: number;
  activeStays: number;
  upcomingCheckins: number;
  totalAvailableRooms: number;
  totalRevenue: number;
}

@Component({
  selector: 'app-hotel-logs',
  templateUrl: './hotel-logs.component.html',
  styleUrls: ['./hotel-logs.component.scss'],
  providers: [MessageService],
})
export class HotelLogsComponent implements OnInit {
  @Output() back = new EventEmitter();
  loading = false;
  logs: BookingLog[] = [];
  filteredLogs: BookingLog[] = [];
  selectedLog: BookingLog | null = null;
  displayDialog = false;
  currentDate = new Date();
  allRooms: Room[] = [];
  allGuests: Guest[] = [];
  roomTypes: RoomTypeDTO[] = [];
  availableRooms: Room[] = [];

  statistics: Statistics = {
    totalBookings: 0,
    activeStays: 0,
    upcomingCheckins: 0,
    totalAvailableRooms: 0,
    totalRevenue: 0,
  };

  selectedStatus: any = { value: 'all', label: 'All Statuses' };
  statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'CHECKED_IN', label: 'Checked In' },
    { value: 'CHECKED_OUT', label: 'Checked Out' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'NO_SHOW', label: 'No Show' },
  ];

  filterValues: { [key: string]: string } = {
    roomNumber: '',
    guestName: '',
    status: '',
  };

  constructor(
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loading = true;

    // Load room types first since we need them for room type names
    this.hotelService.getRoomTypes().subscribe({
      next: (types) => {
        this.roomTypes = types;
        this.loadRoomsAndBookings();
      },
      error: (err) => {
        console.error('Error loading room types:', err);
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load room types',
        });
      },
    });
  }

  private loadRoomsAndBookings(): void {
    // Load rooms, bookings, and available rooms in parallel
    Promise.all([
      this.hotelService.getRooms().toPromise(),
      this.hotelService.getBookings().toPromise(),
      this.hotelService.getAvailableRooms().toPromise(),
      this.hotelService.getGuests().toPromise(),
    ])
      .then(([rooms, bookings, availableRooms, guests]) => {
        this.allRooms = rooms || [];
        this.availableRooms = availableRooms || [];
        this.allGuests = guests || [];

        // Process bookings into logs
        this.logs = this.mapBookingsToLogs(
          bookings || [],
          this.allRooms,
          this.allGuests
        );

        this.filteredLogs = [...this.logs];
        this.calculateStatistics();
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load booking data',
        });
      })
      .finally(() => {
        this.loading = false;
      });
  }

  private mapBookingsToLogs(
    bookings: Booking[],
    rooms: Room[],
    guests: Guest[]
  ): BookingLog[] {
    return bookings
      .map((booking) => {
        // Find guest information
        const guest = this.findGuest(booking.guest, guests);

        // Find the primary room (first room in booking)
        const room = rooms.find((r) => r.id === booking.rooms[0]);

        return {
          id: `${booking.id}`,
          roomNumber: room?.roomNumber?.toString() || 'N/A',
          roomType: room?.roomType?.toString() || 'N/A',
          roomStatus: room?.roomStatus || 'UNDER_MAINTENANCE',
          guestName: guest
            ? `${guest.title} ${guest.firstName} ${guest.lastName}`
            : 'N/A',
          guestEmail: guest?.email,
          guestPhone: guest?.phone || 'N/A',
          guestIdNumber: guest?.idNumber,
          checkinDate: new Date(booking.checkinDate),
          checkoutDate: new Date(booking.checkoutDate),
          status: booking.status,
          paymentMethod: 'N/A', // Replace with actual payment method if available
          totalAmount: booking.total || 0,
          paidAmount: booking.depositAmount || 0,
          balanceAmount: booking.balanceAmount || 0,
          specialRequests: booking.specialRequests,
          createdAt: new Date(booking.checkinDate),
        };
      })
      .sort((a, b) => b.checkinDate.getTime() - a.checkinDate.getTime());
  }

  private findGuest(
    guestRef: Guest | number,
    guests: Guest[]
  ): Guest | undefined {
    return typeof guestRef === 'number'
      ? guests.find((g) => g.id === guestRef)
      : guestRef;
  }

  private calculateStatistics(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.statistics = {
      totalBookings: this.logs.length,
      activeStays: this.logs.filter((log) => log.status === 'CHECKED_IN')
        .length,
      upcomingCheckins: this.logs.filter(
        (log) => log.status === 'CONFIRMED' && log.checkinDate > today
      ).length,
      totalAvailableRooms: this.availableRooms.length,
      totalRevenue: this.logs.reduce(
        (sum, log) => sum + (log.totalAmount || 0),
        0
      ),
    };
  }

  getRoomTypeName(roomTypeId: number): string {
    const type = this.roomTypes.find((rt) => rt.id === roomTypeId);
    return type?.name || 'N/A';
  }

  applyFilters(): void {
    this.filteredLogs = this.logs.filter((log) => {
      // Status filter
      const statusMatch =
        this.selectedStatus.value === 'all' ||
        log.status === this.selectedStatus.value;

      // Text filters
      const roomNumberMatch =
        !this.filterValues['roomNumber'] ||
        log.roomNumber.toString().includes(this.filterValues['roomNumber']);

      const guestNameMatch =
        !this.filterValues['guestName'] ||
        log.guestName
          .toLowerCase()
          .includes(this.filterValues['guestName'].toLowerCase());

      return statusMatch && roomNumberMatch && guestNameMatch;
    });
  }

  resetFilters(): void {
    this.selectedStatus = { value: 'all', label: 'All Statuses' };
    this.filterValues = {
      roomNumber: '',
      guestName: '',
      status: '',
    };
    this.filteredLogs = [...this.logs];
  }

  viewDetails(log: BookingLog): void {
    this.selectedLog = log;
    this.displayDialog = true;
  }

  getStatusClass(status: RoomStatus | BookingStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-300';
      case 'CONFIRMED':
        return 'bg-amber-300';
      case 'CHECKED_IN':
        return 'bg-blue-300';
      case 'UNDER_MAINTENANCE':
        return 'bg-gray-300';
      case 'CHECKED_OUT':
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'bg-red-300';
      case 'BOOKED':
        return 'bg-purple-300';
      case 'CLEANING':
        return 'bg-yellow-300';
      case 'OCCUPIED':
        return 'bg-indigo-300';
      default:
        return 'bg-gray-300';
    }
  }

  getStatusBadgeClass(status: RoomStatus | BookingStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'CONFIRMED':
        return 'bg-amber-100 text-amber-800';
      case 'CHECKED_IN':
        return 'bg-blue-100 text-blue-800';
      case 'UNDER_MAINTENANCE':
        return 'bg-gray-100 text-gray-800';
      case 'CHECKED_OUT':
      case 'CANCELLED':
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800';
      case 'BOOKED':
        return 'bg-purple-100 text-purple-800';
      case 'CLEANING':
        return 'bg-yellow-100 text-yellow-800';
      case 'OCCUPIED':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  goBack(): void {
    this.back.emit();
  }

  printLogs(): void {
    window.print();
  }

  printBooking(log?: BookingLog): void {
    const printLog = log || this.selectedLog;
    if (!printLog) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Booking Receipt - ${printLog.guestName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .hotel-name { font-size: 24px; font-weight: bold; }
              .receipt-title { font-size: 18px; margin: 10px 0; }
              .section { margin-bottom: 15px; }
              .section-title { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 5px; }
              .info-row { display: flex; margin-bottom: 5px; }
              .info-label { width: 150px; font-weight: bold; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
              .status-badge { 
                display: inline-block; 
                padding: 2px 8px; 
                border-radius: 10px; 
                font-size: 12px; 
                font-weight: bold; 
                ${this.getStatusBadgeClass(printLog.status).replace('.', '')}
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="hotel-name">Optimas Suites</div>
              <div class="receipt-title">Booking Receipt</div>
              <div>${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="section">
              <div class="section-title">Guest Information</div>
              <div class="info-row">
                <div class="info-label">Name:</div>
                <div>${printLog.guestName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Phone:</div>
                <div>${printLog.guestPhone}</div>
              </div>
              <div class="info-row">
                <div class="info-label">ID Number:</div>
                <div>${printLog.guestIdNumber || 'N/A'}</div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">Booking Details</div>
              <div class="info-row">
                <div class="info-label">Room:</div>
                <div>${printLog.roomNumber} (${this.getRoomTypeName(
        Number(printLog.roomType)
      )})</div>
              </div>
              <div class="info-row">
                <div class="info-label">Check-in:</div>
                <div>${printLog.checkinDate.toLocaleDateString()}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Check-out:</div>
                <div>${printLog.checkoutDate.toLocaleDateString()}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Duration:</div>
                <div>${this.calculateNights(
                  printLog.checkinDate,
                  printLog.checkoutDate
                )} nights</div>
              </div>
              <div class="info-row">
                <div class="info-label">Status:</div>
                <div><span class="status-badge">${printLog.status}</span></div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">Payment Information</div>
              <div class="info-row">
                <div class="info-label">Total Amount:</div>
                <div>${printLog.totalAmount.toLocaleString('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                })}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Paid Amount:</div>
                <div>${printLog.paidAmount.toLocaleString('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                })}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Balance:</div>
                <div>${printLog.balanceAmount.toLocaleString('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                })}</div>
              </div>
            </div>
            
            ${
              printLog.specialRequests
                ? `
            <div class="section">
              <div class="section-title">Special Requests</div>
              <div>${printLog.specialRequests}</div>
            </div>
            `
                : ''
            }
            
            <div class="footer">
              Thank you for choosing Optimas Suites!
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  }
}
