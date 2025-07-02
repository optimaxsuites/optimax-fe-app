import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PrimeNGConfig } from 'primeng/api';
import {
  HotelserviceService,
  Room,
  Booking,
  Guest,
} from '../../hospitality/hotelservice.service';

// Add interfaces at the top
interface BookingLog {
  id: string;
  roomNumber: number | string;
  roomType: string;
  roomStatus: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestIdNumber?: string;
  checkinDate: Date;
  checkoutDate: Date;
  status: string;
  paymentMethod?: string;
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
  totalRevenue: number;
  totalAvailableRooms: number;
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

  statistics: Statistics = {
    totalBookings: 0,
    activeStays: 0,
    upcomingCheckins: 0,
    totalRevenue: 0,
    totalAvailableRooms: 0,
  };

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
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    Promise.all([
      this.hotelService.getRooms().toPromise(),
      this.hotelService.getBookings().toPromise(),
      this.hotelService.getGuests().toPromise(),
    ])
      .then(([rooms, bookings, guests]) => {
        this.allRooms = rooms || [];
        this.logs = this.mapBookingsToLogs(
          bookings || [],
          rooms || [],
          guests || []
        );
        this.filteredLogs = [...this.logs];
        this.calculateStatistics();
      })
      .catch((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load booking logs',
        });
        console.error('Error loading logs:', error);
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
        const guest =
          typeof booking.guest === 'number'
            ? guests.find((g) => g.id === booking.guest)
            : (booking.guest as Guest);
        const roomId = booking.rooms[0];
        const room = rooms.find((r) => r.id === roomId);
        const guestName = guest
          ? `${guest.title} ${guest.firstName} ${guest.lastName}`
          : 'N/A';
        return {
          id: `${booking.id}`,
          roomNumber: room?.roomNumber || '',
          roomType: room?.roomType?.name || '',
          roomStatus: room?.roomStatus || '',
          guestName: guestName,
          guestEmail: guest?.email,
          guestPhone: guest?.phone || 'N/A',
          guestIdNumber: guest?.idNumber,
          checkinDate: new Date(booking.checkinDate),
          checkoutDate: new Date(booking.checkoutDate),
          status: booking.status.toLowerCase(),
          paymentMethod: 'N/A', // Add if available
          totalAmount: booking.total,
          paidAmount: booking.depositAmount || 0,
          balanceAmount: booking.balanceAmount || 0,
          specialRequests: booking.specialRequests,
          createdAt: new Date(booking.checkinDate),
        };
      })
      .sort((a, b) => b.checkinDate.getTime() - a.checkinDate.getTime());
  }

  private calculateStatistics(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.statistics = {
      totalBookings: this.logs.length,
      activeStays: this.logs.filter(
        (log) => log.status === 'checked_in' || log.status === 'occupied'
      ).length,
      upcomingCheckins: this.logs.filter(
        (log) => log.status === 'confirmed' && new Date(log.checkinDate) > today
      ).length,
      totalAvailableRooms: this.allRooms.filter(
        (room) => room.roomStatus === 'AVAILABLE'
      ).length,
      totalRevenue: this.logs.reduce(
        (sum, log) => sum + (log.totalAmount || 0),
        0
      ),
    };
  }

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

  // Get floors with rooms
  getFloors(): number[] {
    return Object.keys(this.getRoomsByFloor()).map(Number).sort();
  }

  // Get room status text color based on background
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

      return (
        statusMatch &&
        dateMatch &&
        roomNumberMatch &&
        guestNameMatch &&
        statusTextMatch
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
    // Simple print implementation
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
                ${this.getStatusClass(printLog.status).replace('.', '')}
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="hotel-name">Optimas</div>
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
                <div>${printLog.roomNumber} (${printLog.roomType})</div>
              </div>
              <div class="info-row">
                <div class="info-label">Check-in:</div>
                <div>${new Date(
                  printLog.checkinDate
                ).toLocaleDateString()}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Check-out:</div>
                <div>${new Date(
                  printLog.checkoutDate
                ).toLocaleDateString()}</div>
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
                <div class="info-label">Payment Method:</div>
                <div>${printLog.paymentMethod}</div>
              </div>
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
              Thank you for choosing our hotel. We hope you enjoy your stay!
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  }
}
