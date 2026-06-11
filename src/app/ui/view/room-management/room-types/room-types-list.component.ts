import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HotelserviceService, RoomTypeDTO, Room } from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-room-types-list',
  templateUrl: './room-types-list.component.html',
})
export class RoomTypesListComponent implements OnInit {
  roomTypes: RoomTypeDTO[] = [];
  rooms: Room[] = [];
  loading = false;
  showDrawer = false;
  showDeleteModal = false;
  isEditing = false;
  selectedRoomType: RoomTypeDTO | null = null;
  form!: FormGroup;
  uuid = '';

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  constructor(
    private hotelService: HotelserviceService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 
                this.route.parent?.snapshot.paramMap.get('uuid') || '';
    this.initForm();
    this.loadRoomTypes();
    this.loadRooms();
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
    });
  }

  loadRoomTypes(): void {
    this.loading = true;
    this.hotelService.getRoomTypes().subscribe({
      next: (data) => {
        this.roomTypes = data;
        this.loading = false;
      },
      error: () => {
        this.showToastMessage('Failed to load room types', 'error');
        this.loading = false;
      },
    });
  }

  loadRooms(): void {
    this.hotelService.getRooms().subscribe({
      next: (data) => (this.rooms = data),
      error: () => this.showToastMessage('Failed to load rooms for safety checks', 'error'),
    });
  }

  openCreateDrawer(): void {
    this.isEditing = false;
    this.selectedRoomType = null;
    this.form.reset();
    this.showDrawer = true;
  }

  openEditDrawer(roomType: RoomTypeDTO): void {
    this.isEditing = true;
    this.selectedRoomType = roomType;
    this.form.patchValue({
      name: roomType.name,
      description: roomType.description || '',
    });
    this.showDrawer = true;
  }

  closeDrawer(): void {
    this.showDrawer = false;
    this.form.reset();
  }

  saveRoomType(): void {
    if (this.form.invalid) return;

    const data: RoomTypeDTO = this.form.value;

    if (this.isEditing && this.selectedRoomType?.id) {
      this.hotelService.updateRoomType(this.selectedRoomType.id, data).subscribe({
        next: () => {
          this.showToastMessage('Room type updated successfully', 'success');
          this.closeDrawer();
          this.loadRoomTypes();
        },
        error: () => this.showToastMessage('Failed to update room type', 'error'),
      });
    } else {
      this.hotelService.createRoomType(data).subscribe({
        next: () => {
          this.showToastMessage('Room type created successfully', 'success');
          this.closeDrawer();
          this.loadRoomTypes();
        },
        error: () => this.showToastMessage('Failed to create room type', 'error'),
      });
    }
  }

  confirmDelete(roomType: RoomTypeDTO): void {
    this.selectedRoomType = roomType;
    this.showDeleteModal = true;
  }

  deleteRoomType(): void {
    if (!this.selectedRoomType?.id) return;

    // Safety check: Don't delete if any room is assigned to this type
    const roomsUsingThisType = this.rooms.filter(r => r.roomType === this.selectedRoomType?.id);
    if (roomsUsingThisType.length > 0) {
      this.showToastMessage(
        `Cannot delete: ${roomsUsingThisType.length} room(s) are still assigned to this type.`,
        'error'
      );
      this.showDeleteModal = false;
      return;
    }

    this.hotelService.deleteRoomType(this.selectedRoomType.id).subscribe({
      next: () => {
        this.showToastMessage('Room type deleted successfully', 'success');
        this.showDeleteModal = false;
        this.selectedRoomType = null;
        this.loadRoomTypes();
      },
      error: () => this.showToastMessage('Failed to delete room type', 'error'),
    });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }
}
