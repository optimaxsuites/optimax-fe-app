import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PrimeNGConfig } from 'primeng/api';

interface Room {
  id: number;
  number: number;
  type: string;
  status: string;
  floor?: number;
  rate: number;
  beds?: number;
  maxOccupancy?: number;
  description?: string;
  amenities?: string[];
}

interface Statistics {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  bookedRooms: number;
  maintenanceRooms: number;
}

@Component({
  selector: 'app-hotel-admintable',
  templateUrl: './hotel-admintable.component.html',
  styleUrls: ['./hotel-admintable.component.scss'],
  providers: [MessageService],
})
export class HotelAdmintableComponent implements OnInit {
  @Output() back = new EventEmitter();
  loading = false;
  rooms: Room[] = [];
  openRoomForm = false;
  filteredRooms: Room[] = [];
  statistics: Statistics = {
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    bookedRooms: 0,
    maintenanceRooms: 0,
  };

  statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Available', value: 'available' },
    { label: 'Occupied', value: 'occupied' },
    { label: 'Booked', value: 'booked' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Dirty', value: 'dirty' },
  ];

  selectedStatus: any = this.statusOptions[0];
  searchText: string = '';
  confirmDelete: any;

  constructor(
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig
  ) {}

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading = true;
    try {
      const storedRooms = localStorage.getItem('rooms');
      if (storedRooms) {
        this.rooms = JSON.parse(storedRooms);
        this.filteredRooms = [...this.rooms];
        this.calculateStatistics();
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'No Data',
          detail: 'No room data found in local storage',
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load room data',
      });
      console.error('Error loading rooms:', error);
    } finally {
      this.loading = false;
    }
  }

  calculateStatistics(): void {
    this.statistics = {
      totalRooms: this.rooms.length,
      availableRooms: this.rooms.filter((room) => room.status === 'available')
        .length,
      occupiedRooms: this.rooms.filter((room) => room.status === 'occupied')
        .length,
      bookedRooms: this.rooms.filter((room) => room.status === 'booked').length,
      maintenanceRooms: this.rooms.filter(
        (room) => room.status === 'maintenance'
      ).length,
    };
  }
  navigateToCreateRoom() {
    this.openRoomForm = !this.openRoomForm;
  }

  applyFilters(): void {
    this.filteredRooms = this.rooms.filter((room) => {
      // Status filter
      const statusMatch =
        this.selectedStatus.value === 'all' ||
        room.status === this.selectedStatus.value;

      // Search text filter
      const searchMatch =
        !this.searchText ||
        room.number.toString().includes(this.searchText) ||
        room.type.toLowerCase().includes(this.searchText.toLowerCase()) ||
        room.status.toLowerCase().includes(this.searchText.toLowerCase());

      return statusMatch && searchMatch;
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'booked':
        return 'bg-amber-100 text-amber-800';
      case 'maintenance':
        return 'bg-gray-100 text-gray-800';
      case 'dirty':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  goBack(): void {
    this.back.emit();
  }

  clearFilters(): void {
    this.selectedStatus = this.statusOptions[0];
    this.searchText = '';
    this.applyFilters();
  }
}
