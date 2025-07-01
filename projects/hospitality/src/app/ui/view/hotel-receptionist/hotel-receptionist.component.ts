import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';

interface Receptionist {
  id: string;
  name: string;
  email: string;
  phone: string;
  isOnDuty: boolean;
  password: string; // For authentication
  commissionRate?: number; // For commission calculations
}

interface ReceptionistLog {
  receptionistId: string;
  receptionistName: string;
  loginTime: Date;
  logoutTime?: Date;
  sales: BookingLog[];
  notes?: string;
  totalSales?: number;
  commissionEarned?: number;
}

interface BookingLog {
  id: string;
  roomNumber: number;
  roomType: string;
  roomStatus: string; // Current room status (available, booked, occupied)
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  guestIdNumber?: string;
  checkinDate: Date;
  checkoutDate: Date;
  status: string; // Booking status (confirmed, checked-in, etc.)
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  specialRequests?: string;
  createdAt: Date;
  receptionistId?: string;
  receptionistName?: string;
  bookingTime?: Date;
}

@Component({
  selector: 'app-hotel-receptionist',
  templateUrl: './hotel-receptionist.component.html',
  styleUrl: './hotel-receptionist.component.scss',
  providers: [MessageService],
})
export class HotelReceptionistComponent {
  receptionists: any[] = [];
  selectedReceptionist: any = null;
  dateRange: Date[] = [];
  salesData: any[] = [];
  totalSales = 0;
  totalCommission = 0;

  constructor(private messageService: MessageService) {}

  loadReport() {
    if (!this.selectedReceptionist) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a receptionist',
      });
      return;
    }

    // In a real app, you would filter by date range
    this.salesData = this.getSalesData(this.selectedReceptionist.id);
    this.totalSales = this.salesData.reduce(
      (sum, sale) => sum + sale.totalAmount,
      0
    );
    this.totalCommission =
      this.totalSales * (this.selectedReceptionist.commissionRate || 0);
  }

  private getSalesData(receptionistId: string): any[] {
    // In a real app, fetch from service
    const logs = JSON.parse(localStorage.getItem('receptionistLogs') || '[]');
    return logs
      .filter((log: any) => log.receptionistId === receptionistId)
      .flatMap((log: any) => log.sales);
  }

  printReport() {
    window.print();
  }
}
