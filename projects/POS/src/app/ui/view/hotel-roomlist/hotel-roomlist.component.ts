import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MessageService } from 'primeng/api';

interface Room {
  id: number;
  type: string;
  status: string;
  floor?: number;
  guest?: string;
  selected?: boolean;
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
  selector: 'app-hotel-roomlist',
  templateUrl: './hotel-roomlist.component.html',
  styleUrls: ['./hotel-roomlist.component.scss'],
  providers: [MessageService],
})
export class HotelRoomlistComponent {
  @Input() showFilters = false;
  @Output() roomSelected = new EventEmitter<Room | Room[]>();

  roomTypes = [
    'All Rooms',
    'Standard',
    'Deluxe',
    'Suite',
    'Executive',
    'Presidential',
  ];
  selectedRoomTypes: string[] = ['All Rooms'];
  searchQuery = '';
  searchDate: Date | null = null;
  viewingAvailableRooms = false;
  selectAll = false;
  selectedRooms: Room[] = [];
  openForm: boolean = false;

  rooms: Room[] = [
    {
      id: 101,
      type: 'Standard',
      status: 'occupied',
      floor: 1,
      guest: 'John Doe',
      bookingDetails: {
        title: 'Mr.',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+2348012345678',
        checkinDate: new Date('2023-06-01'),
        checkoutDate: new Date('2023-06-05'),
        adults: 2,
        children: 1,
        specialRequests: 'Please provide extra towels and a baby cot',
        paymentMethod: 'Credit Card',
        totalAmount: 75000,
        paidAmount: 75000,
        balanceAmount: 0,
      },
      beds: 1,
      maxOccupancy: 3,
      rate: 15000,
      description: 'Cozy standard room with city view',
      amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Hair Dryer'],
    },
    {
      id: 102,
      type: 'Standard',
      status: 'dirty',
      floor: 1,
      beds: 2,
      maxOccupancy: 4,
      rate: 18000,
      description: 'Spacious standard room with twin beds',
      amenities: ['WiFi', 'TV', 'AC', 'Coffee Maker'],
    },
    {
      id: 103,
      type: 'Standard',
      status: 'occupied',
      floor: 1,
      guest: 'Michael Brown',
      bookingDetails: {
        title: 'Dr.',
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'm.brown@example.com',
        phone: '+2348023456789',
        checkinDate: new Date('2023-06-03'),
        checkoutDate: new Date('2023-06-08'),
        adults: 1,
        children: 0,
        specialRequests: 'Quiet room preferred',
        paymentMethod: 'Bank Transfer',
        totalAmount: 90000,
        paidAmount: 45000,
        balanceAmount: 45000,
      },
      beds: 1,
      maxOccupancy: 2,
      rate: 18000,
      description: 'Standard room with garden view',
      amenities: ['WiFi', 'TV', 'AC', 'Work Desk'],
    },
    {
      id: 201,
      type: 'Deluxe',
      status: 'booked',
      floor: 2,
      guest: 'Sarah Johnson',
      bookingDetails: {
        title: 'Mrs.',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.j@example.com',
        phone: '+2348098765432',
        checkinDate: new Date('2023-06-10'),
        checkoutDate: new Date('2023-06-15'),
        adults: 2,
        children: 0,
        specialRequests: 'High floor preferred',
        paymentMethod: 'Credit Card',
        totalAmount: 125000,
        paidAmount: 62500,
        balanceAmount: 62500,
      },
      rate: 25000,
      description: 'Luxurious deluxe room with king bed',
      amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony'],
    },
    {
      id: 202,
      type: 'Deluxe',
      status: 'maintenance',
      floor: 2,
      rate: 25000,
      description: 'Luxurious deluxe room with king bed',
      amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony'],
    },
    {
      id: 205,
      type: 'Deluxe',
      status: 'occupied',
      floor: 2,
      guest: 'Emily Wilson',
      bookingDetails: {
        title: 'Ms.',
        firstName: 'Emily',
        lastName: 'Wilson',
        email: 'emily.w@example.com',
        phone: '+2348034567890',
        checkinDate: new Date('2023-06-02'),
        checkoutDate: new Date('2023-06-07'),
        adults: 2,
        children: 2,
        specialRequests: 'Connecting rooms if possible',
        paymentMethod: 'Cash',
        totalAmount: 175000,
        paidAmount: 175000,
        balanceAmount: 0,
      },
      beds: 2,
      maxOccupancy: 4,
      rate: 35000,
      description: 'Deluxe room with king bed and sofa bed',
      amenities: ['WiFi', 'TV', 'AC', 'Mini Bar', 'Balcony', 'Coffee Maker'],
    },
    {
      id: 301,
      type: 'Suite',
      status: 'occupied',
      floor: 3,
      guest: 'Robert Johnson',
      bookingDetails: {
        title: 'Mr.',
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'r.johnson@example.com',
        phone: '+2348045678901',
        checkinDate: new Date('2023-06-01'),
        checkoutDate: new Date('2023-06-10'),
        adults: 2,
        children: 0,
        specialRequests: 'Anniversary celebration - please arrange flowers',
        paymentMethod: 'Credit Card',
        totalAmount: 450000,
        paidAmount: 450000,
        balanceAmount: 0,
      },
      beds: 1,
      maxOccupancy: 2,
      rate: 50000,
      description: 'Luxury suite with separate living area',
      amenities: [
        'WiFi',
        'TV',
        'AC',
        'Mini Bar',
        'Jacuzzi',
        'Balcony',
        'Kitchenette',
      ],
    },
    {
      id: 401,
      type: 'Presidential',
      status: 'occupied',
      floor: 4,
      guest: 'David Thompson',
      bookingDetails: {
        title: 'Hon.',
        firstName: 'David',
        lastName: 'Thompson',
        email: 'd.thompson@example.com',
        phone: '+2348056789012',
        checkinDate: new Date('2023-06-05'),
        checkoutDate: new Date('2023-06-12'),
        adults: 3,
        children: 0,
        specialRequests: 'VIP treatment required',
        paymentMethod: 'Corporate Account',
        totalAmount: 840000,
        paidAmount: 840000,
        balanceAmount: 0,
      },
      beds: 2,
      maxOccupancy: 4,
      rate: 120000,
      description: 'Presidential suite with panoramic views',
      amenities: [
        'WiFi',
        'TV',
        'AC',
        'Mini Bar',
        'Jacuzzi',
        'Balcony',
        'Kitchen',
        'Butler Service',
      ],
    },
  ];

  filteredRooms: Room[] = [];
  availableRooms: Room[] = [];

  statusColors: { [key: string]: string } = {
    available: 'bg-green-400',
    booked: 'bg-amber-300',
    occupied: 'bg-blue-400',
    maintenance: 'bg-gray-400',
    dirty: 'bg-red-400',
  };

  constructor(private messageService: MessageService) {
    this.filteredRooms = [...this.rooms];
  }

  navigateToForm() {
    this.openForm = !this.openForm;
  }

  openRoomDetails(room: Room): void {
    this.roomSelected.emit(room);
  }

  getFilterClass(type: string): string {
    const baseClasses =
      'p-4 font-bold text-xl rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-between';
    return this.selectedRoomTypes.includes(type)
      ? `${baseClasses} bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg border-2 border-emerald-700`
      : `${baseClasses} bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-300`;
  }

  toggleRoomTypeSelection(type: string): void {
    if (type === 'All Rooms') {
      this.selectedRoomTypes = ['All Rooms'];
    } else {
      if (this.selectedRoomTypes.includes(type)) {
        this.selectedRoomTypes = this.selectedRoomTypes.filter(
          (t) => t !== type
        );
        if (this.selectedRoomTypes.length === 0) {
          this.selectedRoomTypes = ['All Rooms'];
        }
      } else {
        this.selectedRoomTypes = this.selectedRoomTypes.filter(
          (t) => t !== 'All Rooms'
        );
        this.selectedRoomTypes.push(type);
      }
    }
    this.applyFilters();
  }

  showAvailableRooms(): void {
    this.availableRooms = this.rooms.filter(
      (room) =>
        room.status === 'available' &&
        (this.selectedRoomTypes.includes('All Rooms') ||
          this.selectedRoomTypes.includes(room.type))
    );
    this.availableRooms.forEach((room) => (room.selected = false));
    this.viewingAvailableRooms = true;
    this.selectedRooms = [];
    this.selectAll = false;
  }

  applyFilters(): void {
    this.filteredRooms = this.rooms.filter((room) => {
      const typeMatch =
        this.selectedRoomTypes.includes('All Rooms') ||
        this.selectedRoomTypes.includes(room.type);
      const searchMatch =
        !this.searchQuery ||
        room.id.toString().includes(this.searchQuery) ||
        (room.guest &&
          room.guest.toLowerCase().includes(this.searchQuery.toLowerCase()));

      let dateMatch = true;
      if (this.searchDate) {
        dateMatch =
          !room.bookingDetails ||
          new Date(room.bookingDetails.checkoutDate) <=
            new Date(this.searchDate) ||
          new Date(room.bookingDetails.checkinDate) >=
            new Date(this.searchDate);
      }

      return typeMatch && searchMatch && dateMatch;
    });
  }

  clearDateFilter(): void {
    this.searchDate = null;
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedRoomTypes = ['All Rooms'];
    this.searchQuery = '';
    this.searchDate = null;
    this.applyFilters();
  }

  getStatusKeys(): string[] {
    return Object.keys(this.statusColors);
  }

  closeAvailableRoomsModal(): void {
    this.viewingAvailableRooms = false;
  }

  showCheckInModal(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Check-In',
      detail: 'Check-in form would open here',
    });
  }

  isRoomSelected(room: Room): boolean {
    return this.selectedRooms.some((r) => r.id === room.id);
  }

  toggleRoomSelection(room: Room): void {
    if (this.isRoomSelected(room)) {
      this.selectedRooms = this.selectedRooms.filter((r) => r.id !== room.id);
      room.selected = false;
    } else {
      this.selectedRooms.push(room);
      room.selected = true;
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedRooms = [...this.availableRooms];
      this.availableRooms.forEach((room) => (room.selected = true));
    } else {
      this.selectedRooms = [];
      this.availableRooms.forEach((room) => (room.selected = false));
    }
  }

  updateSelectAllState(): void {
    this.selectAll = this.selectedRooms.length === this.availableRooms.length;
  }

  calculateTotal(): number {
    return this.selectedRooms.reduce((total, room) => total + room.rate, 0);
  }

  clearSelection(): void {
    this.selectedRooms = [];
    this.selectAll = false;
    this.availableRooms.forEach((room) => (room.selected = false));
  }
}
