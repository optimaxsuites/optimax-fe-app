// hotel-admintable.component.ts
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PrimeNGConfig } from 'primeng/api';
import {
  HotelserviceService,
  Room,
  RoomStatus,
  RoomTypeDTO,
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

  // Existing properties
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

  // New properties for edit functionality
  showRoomModal = false;
  showRoomTypeModal = false;
  isEditMode = false;
  currentRoom: Room | null = null;
  roomForm!: FormGroup;
  roomTypeForm!: FormGroup;
  roomTypes: RoomTypeDTO[] = [];
  roomTypeLoading = false;
  creatingRoomType = false;

  // Room status options for dropdown
  roomStatuses = [
    'AVAILABLE',
    'OCCUPIED',
    'BOOKED',
    'UNDER_MAINTENANCE',
    'CLEANING',
  ];

  // Amenities management
  selectedAmenities: string[] = [];
  newAmenity: string = '';

  // Image management
  previewImages: string[] = [];

  constructor(
    private messageService: MessageService,
    private primengConfig: PrimeNGConfig,
    private hotelService: HotelserviceService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    this.loadRooms();
    this.loadRoomTypes();
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'available':
        return 'status-available';
      case 'occupied':
        return 'status-occupied';
      case 'booked':
        return 'status-booked';
      case 'maintenance':
        return 'status-maintenance';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  initializeForms(): void {
    this.roomForm = this.fb.group({
      roomNumber: [
        '',
        [Validators.required, Validators.min(100), Validators.max(9999)],
      ],
      roomType: ['', Validators.required],
      roomStatus: ['AVAILABLE', Validators.required],
      floor: ['', [Validators.required, Validators.min(1), Validators.max(99)]],
      rate: ['', [Validators.required, Validators.min(1000)]],
      beds: ['', [Validators.required, Validators.min(1), Validators.max(10)]],
      maxOccupancy: [
        '',
        [Validators.required, Validators.min(1), Validators.max(10)],
      ],
      accessible: [false],
      isSmokingAllowed: [false],
      description: [''],
    });

    this.roomTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: [''],
    });
  }

  // Existing methods
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

  loadRoomTypes(): void {
    this.roomTypeLoading = true;
    this.hotelService.getRoomTypes().subscribe({
      next: (types) => {
        this.roomTypes = types;
        this.roomTypeLoading = false;
      },
      error: (error) => {
        console.error('Error loading room types:', error);
        this.roomTypeLoading = false;
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

  // Modal management methods
  openCreateRoomModal(): void {
    this.isEditMode = false;
    this.currentRoom = null;
    this.resetForm();
    this.showRoomModal = true;
  }

  openEditRoomModal(room: Room): void {
    this.isEditMode = true;
    this.currentRoom = room;
    this.populateFormWithRoom(room);
    this.showRoomModal = true;
  }

  closeRoomModal(): void {
    this.showRoomModal = false;
    this.resetForm();
    this.currentRoom = null;
  }

  openRoomTypeModal(): void {
    this.showRoomTypeModal = true;
    this.roomTypeForm.reset();
  }

  closeRoomTypeModal(): void {
    this.showRoomTypeModal = false;
    this.roomTypeForm.reset();
  }

  resetForm(): void {
    this.roomForm.reset({
      roomStatus: 'AVAILABLE',
      accessible: false,
      isSmokingAllowed: false,
    });
    this.selectedAmenities = [];
    this.previewImages = [];
    this.newAmenity = '';
  }

  populateFormWithRoom(room: Room): void {
    this.roomForm.patchValue({
      roomNumber: room.roomNumber,
      roomType:
        typeof room.roomType === 'object' ? room.roomType.id : room.roomType,
      roomStatus: room.roomStatus,
      floor: room.floor,
      rate: room.rate,
      beds: room.beds,
      maxOccupancy: room.maxOccupancy,
      accessible: room.accessible || false,
      isSmokingAllowed: room.isSmokingAllowed || false,
      description: room.description || '',
    });

    // Populate amenities if available
    this.selectedAmenities = room.amenities || [];
  }

  // Form submission methods
  onSubmit(): void {
    if (this.roomForm.valid) {
      this.loading = true;
      const formData = this.prepareFormData();

      if (this.isEditMode && this.currentRoom) {
        this.updateRoom(this.currentRoom.id, formData);
      } else {
        this.createRoom(formData);
      }
    } else {
      this.markFormGroupTouched(this.roomForm);
    }
  }

  prepareFormData(): any {
    const formValue = this.roomForm.value;
    // Find the full roomType object by id
    const selectedType = this.roomTypes.find(
      (rt) => rt.id === formValue.roomType
    );
    return {
      ...formValue,
      roomType: selectedType
        ? selectedType
        : { id: formValue.roomType, name: '' },
      amenities: this.selectedAmenities,
      images: this.previewImages,
    };
  }

  createRoom(roomData: any): void {
    this.hotelService.createRoom(roomData).subscribe({
      next: (room) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Room created successfully',
        });
        this.closeRoomModal();
        this.loadRooms();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create room',
        });
        console.error('Error creating room:', error);
        this.loading = false;
      },
    });
  }

  updateRoom(roomId: number, roomData: any): void {
    this.hotelService.updateRoom(roomId, roomData).subscribe({
      next: (room) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Room updated successfully',
        });
        this.closeRoomModal();
        this.loadRooms();
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update room',
        });
        console.error('Error updating room:', error);
        this.loading = false;
      },
    });
  }

  onCreateRoomType(): void {
    if (this.roomTypeForm.valid) {
      this.creatingRoomType = true;
      const roomTypeData = this.roomTypeForm.value;

      this.hotelService.createRoomType(roomTypeData).subscribe({
        next: (roomType) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Room type created successfully',
          });
          this.closeRoomTypeModal();
          this.loadRoomTypes();
          this.creatingRoomType = false;

          // Auto-select the newly created room type
          this.roomForm.patchValue({ roomType: roomType.id });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create room type',
          });
          console.error('Error creating room type:', error);
          this.creatingRoomType = false;
        },
      });
    } else {
      this.markFormGroupTouched(this.roomTypeForm);
    }
  }

  // Amenity management methods
  addAmenity(): void {
    if (
      this.newAmenity.trim() &&
      !this.selectedAmenities.includes(this.newAmenity.trim())
    ) {
      this.selectedAmenities.push(this.newAmenity.trim());
      this.newAmenity = '';
    }
  }

  removeAmenity(index: number): void {
    this.selectedAmenities.splice(index, 1);
  }

  // Image management methods
  onFileUpload(event: any): void {
    const files = event.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImages.push(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number): void {
    this.previewImages.splice(index, 1);
  }

  // Utility methods
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Existing methods (keep unchanged)
  navigateToCreateRoom() {
    this.openRoomForm = true;
  }

  closeRoomForm() {
    this.openRoomForm = false;
  }

  applyFilters(): void {
    this.filteredRooms = this.rooms.filter((room) => {
      const statusMatch =
        this.selectedStatus.value === 'all' ||
        room.roomStatus === this.selectedStatus.value;

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
