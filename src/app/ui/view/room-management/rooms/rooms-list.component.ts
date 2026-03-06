import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  HotelserviceService,
  Room,
  RoomTypeDTO,
  RoomStatus,
} from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-rooms-list',
  templateUrl: './rooms-list.component.html',
})
export class RoomsListComponent implements OnInit {
  rooms: Room[] = [];
  filteredRooms: Room[] = [];
  roomTypes: RoomTypeDTO[] = [];
  loading = false;
  showDrawer = false;
  showDeleteModal = false;
  isEditing = false;
  selectedRoom: Room | null = null;
  form!: FormGroup;
  viewMode: 'table' | 'grid' = 'table';
  uuid = '';

  // Filters
  filterStatus: string = '';
  filterFloor: string = '';
  filterRoomType: string = '';

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  // Amenity input
  amenityInput = '';

  statuses: RoomStatus[] = [
    'AVAILABLE',
    'OCCUPIED',
    'BOOKED',
    'UNDER_MAINTENANCE',
    'CLEANING',
  ];

  suggestedAmenities = [
    { name: 'WiFi', icon: 'fa-solid fa-wifi' },
    { name: 'AC', icon: 'fa-solid fa-snowflake' },
    { name: 'TV', icon: 'fa-solid fa-tv' },
    { name: 'Breakfast', icon: 'fa-solid fa-mug-hot' },
    { name: 'Pool', icon: 'fa-solid fa-person-swimming' },
    { name: 'Gym', icon: 'fa-solid fa-dumbbell' },
    { name: 'Parking', icon: 'fa-solid fa-car' },
    { name: 'Bar', icon: 'fa-solid fa-martini-glass-cocktail' },
    { name: 'Kitchen', icon: 'fa-solid fa-kitchen-set' },
    { name: 'Workspace', icon: 'fa-solid fa-briefcase' },
    { name: 'Lounge', icon: 'fa-solid fa-couch' },
    { name: 'Laundry', icon: 'fa-solid fa-shirt' }
  ];

  // Dummy images for grid view
  dummyImages: string[] = [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1590490360182-c33d955f4b48?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&h=300&fit=crop',
  ];

  constructor(
    private hotelService: HotelserviceService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 
                this.route.parent?.snapshot.paramMap.get('uuid') || '';
    this.initForm();
    this.loadRooms();
    this.loadRoomTypes();
  }

  initForm(): void {
    this.form = this.fb.group({
      roomNumber: [null, [Validators.required, Validators.min(1)]],
      roomStatus: ['AVAILABLE', Validators.required],
      floor: [1, [Validators.required, Validators.min(0)]],
      rate: [0, [Validators.required, Validators.min(0)]],
      beds: [1, [Validators.required, Validators.min(1)]],
      maxOccupancy: [1, [Validators.required, Validators.min(1)]],
      description: [''],
      amenities: [[]],
      imageURLs: [[]],
      accessible: [false],
      roomType: [null, Validators.required],
      isSmokingAllowed: [false],
    });
  }

  loadRooms(): void {
    this.loading = true;
    this.hotelService.getRooms().subscribe({
      next: (data) => {
        this.rooms = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.showToastMessage('Failed to load rooms', 'error');
        this.loading = false;
      },
    });
  }

  loadRoomTypes(): void {
    this.hotelService.getRoomTypes().subscribe({
      next: (data) => (this.roomTypes = data),
      error: () =>
        this.showToastMessage('Failed to load room types', 'error'),
    });
  }

  applyFilters(): void {
    this.filteredRooms = this.rooms.filter((r) => {
      const matchStatus = !this.filterStatus || r.roomStatus === this.filterStatus;
      const matchFloor = !this.filterFloor || r.floor === +this.filterFloor;
      const matchType = !this.filterRoomType || r.roomType === +this.filterRoomType;
      return matchStatus && matchFloor && matchType;
    });
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterFloor = '';
    this.filterRoomType = '';
    this.applyFilters();
  }

  getRoomTypeName(id: number): string {
    return this.hotelService.getRoomTypeNameById(id);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'AVAILABLE': return 'bg-customGreen text-white';
      case 'OCCUPIED': return 'bg-red-500 text-white';
      case 'BOOKED': return 'bg-customBlue text-white';
      case 'UNDER_MAINTENANCE': return 'bg-amber-500 text-white';
      case 'CLEANING': return 'bg-purple-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'AVAILABLE': return 'fa-solid fa-circle-check';
      case 'OCCUPIED': return 'fa-solid fa-user';
      case 'BOOKED': return 'fa-solid fa-calendar-check';
      case 'UNDER_MAINTENANCE': return 'fa-solid fa-wrench';
      case 'CLEANING': return 'fa-solid fa-broom';
      default: return 'fa-solid fa-circle-question';
    }
  }

  getDummyImage(index: number): string {
    return this.dummyImages[index % this.dummyImages.length];
  }

  getUniqueFloors(): number[] {
    return [...new Set(this.rooms.map((r) => r.floor))].sort((a, b) => a - b);
  }

  openCreateDrawer(): void {
    this.isEditing = false;
    this.selectedRoom = null;
    this.form.reset({
      roomStatus: 'AVAILABLE',
      floor: 1,
      rate: 0,
      beds: 1,
      maxOccupancy: 1,
      amenities: [],
      imageURLs: [],
      accessible: false,
      isSmokingAllowed: false,
    });
    this.amenityInput = '';
    this.showDrawer = true;
  }

  openEditDrawer(room: Room): void {
    this.isEditing = true;
    this.selectedRoom = room;
    this.form.patchValue({
      roomNumber: room.roomNumber,
      roomStatus: room.roomStatus,
      floor: room.floor,
      rate: room.rate,
      beds: room.beds,
      maxOccupancy: room.maxOccupancy,
      description: room.description || '',
      amenities: room.amenities || [],
      imageURLs: room.imageURLs || [],
      accessible: room.accessible,
      roomType: room.roomType,
      isSmokingAllowed: room.isSmokingAllowed,
    });
    this.amenityInput = '';
    this.showDrawer = true;
  }

  closeDrawer(): void {
    this.showDrawer = false;
    this.form.reset();
  }

  addAmenity(): void {
    const value = this.amenityInput.trim();
    if (!value) return;
    const amenities = this.form.get('amenities')?.value || [];
    if (!amenities.includes(value)) {
      this.form.patchValue({ amenities: [...amenities, value] });
    }
    this.amenityInput = '';
  }

  removeAmenity(index: number): void {
    const amenities = [...(this.form.get('amenities')?.value || [])];
    amenities.splice(index, 1);
    this.form.patchValue({ amenities });
  }

  toggleAmenity(name: string): void {
    const amenities = [...(this.form.get('amenities')?.value || [])];
    const index = amenities.indexOf(name);
    if (index > -1) {
      amenities.splice(index, 1);
    } else {
      amenities.push(name);
    }
    this.form.patchValue({ amenities });
  }

  isAmenitySelected(name: string): boolean {
    const amenities = this.form.get('amenities')?.value || [];
    return amenities.includes(name);
  }

  saveRoom(): void {
    if (this.form.invalid) return;
    const data = this.form.value;

    const roomId = this.hotelService.getId(this.selectedRoom);
    if (this.isEditing && roomId) {
      this.hotelService.updateRoom(roomId, data).subscribe({
        next: () => {
          this.showToastMessage('Room updated successfully', 'success');
          this.closeDrawer();
          this.loadRooms();
        },
        error: () => this.showToastMessage('Failed to update room', 'error'),
      });
    } else {
      this.hotelService.createRoom(data).subscribe({
        next: () => {
          this.showToastMessage('Room created successfully', 'success');
          this.closeDrawer();
          this.loadRooms();
        },
        error: () => this.showToastMessage('Failed to create room', 'error'),
      });
    }
  }

  confirmDelete(room: Room): void {
    this.selectedRoom = room;
    this.showDeleteModal = true;
  }

  deleteRoom(): void {
    if (!this.selectedRoom?.id) return;
    this.hotelService.deleteRoom(this.selectedRoom.id).subscribe({
      next: () => {
        this.showToastMessage('Room deleted successfully', 'success');
        this.showDeleteModal = false;
        this.selectedRoom = null;
        this.loadRooms();
      },
      error: () => this.showToastMessage('Failed to delete room', 'error'),
    });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }
}
