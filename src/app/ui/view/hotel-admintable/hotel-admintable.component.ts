import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PrimeNGConfig } from 'primeng/api';
import {
  HotelserviceService,
  Room,
  RoomStatus,
} from '../../hospitality/hotelservice.service';
import { ConfirmationService } from 'primeng/api';

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
  providers: [MessageService, ConfirmationService],
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
    { label: 'Available', value: 'AVAILABLE' },
    { label: 'Occupied', value: 'OCCUPIED' },
    { label: 'Booked', value: 'BOOKED' },
    { label: 'Maintenance', value: 'UNDER_MAINTENANCE' },
    { label: 'Cleaning', value: 'CLEANING' },
  ];

  selectedStatus: any = this.statusOptions[0];
  searchText: string = '';

  constructor(
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig,
    private hotelService: HotelserviceService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading = true;
    this.hotelService.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.filteredRooms = [...this.rooms];
        this.calculateStatistics();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load room data',
        });
        console.error('Error loading rooms:', error);
        this.loading = false;
      },
    });
  }

  calculateStatistics(): void {
    this.statistics = {
      totalRooms: this.rooms.length,
      availableRooms: this.rooms.filter(
        (room) => room.roomStatus === 'AVAILABLE'
      ).length,
      occupiedRooms: this.rooms.filter((room) => room.roomStatus === 'OCCUPIED')
        .length,
      bookedRooms: this.rooms.filter((room) => room.roomStatus === 'BOOKED')
        .length,
      maintenanceRooms: this.rooms.filter(
        (room) => room.roomStatus === 'UNDER_MAINTENANCE'
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
        room.roomStatus === this.selectedStatus.value;

      // Search text filter
      const searchMatch =
        !this.searchText ||
        room.roomNumber.toString().includes(this.searchText) ||
        (typeof room.roomType === 'object'
          ? room.roomType.name
              .toLowerCase()
              .includes(this.searchText.toLowerCase())
          : String(room.roomType)
              .replace(/_/g, ' ')
              .toLowerCase()
              .includes(this.searchText.toLowerCase())) ||
        room.roomStatus.toLowerCase().includes(this.searchText.toLowerCase());

      return statusMatch && searchMatch;
    });
  }

  getStatusClass(status: RoomStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-800';
      case 'OCCUPIED':
        return 'bg-blue-100 text-blue-800';
      case 'BOOKED':
        return 'bg-amber-100 text-amber-800';
      case 'UNDER_MAINTENANCE':
        return 'bg-gray-100 text-gray-800';
      case 'CLEANING':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: RoomStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'OCCUPIED':
        return 'Occupied';
      case 'BOOKED':
        return 'Booked';
      case 'UNDER_MAINTENANCE':
        return 'Maintenance';
      case 'CLEANING':
        return 'Cleaning';
      default:
        return status;
    }
  }

  getRoomTypeName(roomType: any): string {
    if (typeof roomType === 'object' && roomType !== null) {
      return roomType.name;
    }
    return `Room Type ${roomType}`;
  }

  confirmDeleteRoom(room: Room): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete room ${room.roomNumber}?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteRoom(room.id);
      },
    });
  }

  deleteRoom(roomId: number): void {
    this.loading = true;
    this.hotelService.deleteRoom(roomId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Room deleted successfully',
        });
        this.loadRooms();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete room',
        });
        this.loading = false;
      },
    });
  }

  goBack(): void {
    this.back.emit();
  }

  clearFilters(): void {
    this.selectedStatus = this.statusOptions[0];
    this.searchText = '';
    this.applyFilters();
  }

  onRoomCreated(): void {
    this.openRoomForm = false;
    this.loadRooms();
  }
}
