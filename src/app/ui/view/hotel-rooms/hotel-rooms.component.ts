import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  HotelserviceService,
  Room,
  RoomTypeDTO,
  RoomStatus,
} from '../../hospitality/hotelservice.service';

@Component({
  selector: 'app-hotel-rooms',
  templateUrl: './hotel-rooms.component.html',
  styleUrls: ['./hotel-rooms.component.scss'],
  providers: [MessageService],
})
export class HotelRoomsComponent {
  @Output() roomCreated = new EventEmitter<Room>();
  @Output() cancel = new EventEmitter<void>();

  // Room Form Properties
  roomForm!: FormGroup;
  roomStatuses: RoomStatus[] = [];
  roomTypes: RoomTypeDTO[] = [];
  selectedAmenities: string[] = [];
  newAmenity: string = '';
  uploadedFiles: any[] = [];
  previewImages: string[] = [];
  loading = false;
  roomTypeLoading = false;
  openRoomForm = false;

  // Room Type Form Properties
  showRoomTypeModal = false;
  roomTypeForm!: FormGroup;
  creatingRoomType = false;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private hotelService: HotelserviceService
  ) {
    this.roomStatuses = this.hotelService.getRoomStatuses();
    this.createForms();
    this.loadRoomTypes();
  }

  createForms(): void {
    // Room Form
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
      description: [''],
      amenities: [this.selectedAmenities],
      accessible: [false],
      isSmokingAllowed: [false],
      images: [[]],
    });

    // Room Type Form
    this.roomTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: [''],
    });
  }

  loadRoomTypes(): void {
    this.roomTypeLoading = true;
    this.hotelService.getRoomTypes().subscribe({
      next: (types) => {
        this.roomTypes = types;
        this.roomTypeLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load room types',
        });
        this.roomTypeLoading = false;
        console.error('Error loading room types:', err);
      },
    });
  }

  // Room Type Methods
  openRoomTypeModal(): void {
    this.showRoomTypeModal = true;
  }

  closeRoomTypeModal(): void {
    this.showRoomTypeModal = false;
    this.roomTypeForm.reset();
  }

  onCreateRoomType(): void {
    if (this.roomTypeForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Form Error',
        detail: 'Please provide a valid room type name',
      });
      return;
    }
    this.creatingRoomType = true;
    const newRoomType: RoomTypeDTO = {
      id: 0,
      name: this.roomTypeForm.value.name,
      description: this.roomTypeForm.value.description,
    };
    this.hotelService.createRoomType(newRoomType).subscribe({
      next: (createdRoomType) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Room type "${createdRoomType.name}" created successfully`,
        });
        this.loadRoomTypes();
        this.roomForm.get('roomType')?.setValue(createdRoomType.id);
        this.closeRoomTypeModal();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create room type',
        });
        console.error('Error creating room type:', err);
      },
      complete: () => {
        this.creatingRoomType = false;
      },
    });
  }

  // Room Methods (existing)

  onSubmit(): void {
    if (this.roomForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Form Error',
        detail: 'Please complete all required fields correctly.',
      });
      this.markFormGroupTouched(this.roomForm);
      return;
    }

    this.loading = true;
    const selectedTypeId = this.roomForm.value.roomType;

    const selectedType = this.roomTypes.find((rt) => rt.id === selectedTypeId);

    const newRoom: Room = {
      id: 0,
      roomNumber: this.roomForm.value.roomNumber,
      roomType: selectedType!,
      roomStatus: this.roomForm.value.roomStatus,
      floor: this.roomForm.value.floor,
      rate: this.roomForm.value.rate,
      beds: this.roomForm.value.beds,
      maxOccupancy: this.roomForm.value.maxOccupancy,
      description: this.roomForm.value.description,
      amenities: [...this.selectedAmenities],
      imageURLs: this.previewImages,
      accessible: this.roomForm.value.accessible,
      isSmokingAllowed: this.roomForm.value.isSmokingAllowed,
    };

    this.hotelService.createRoom(newRoom).subscribe({
      next: (createdRoom) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Room Created',
          detail: `Room ${createdRoom.roomNumber} has been successfully created.`,
        });
        this.roomCreated.emit(createdRoom);
        this.resetForm();
        this.closeRoomModal();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Creation Failed',
          detail: 'Failed to create room. Please try again.',
        });
        console.error('Error creating room:', err);
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  onFileUpload(event: any): void {
    const files = event.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImages.push(e.target.result);
        this.roomForm.get('images')?.setValue(this.previewImages);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number): void {
    this.previewImages.splice(index, 1);
    this.roomForm.get('images')?.setValue(this.previewImages);
  }

  resetForm(): void {
    this.roomForm.reset({
      roomStatus: 'AVAILABLE',
      accessible: false,
      isSmokingAllowed: false,
    });
    this.selectedAmenities = [];
    this.previewImages = [];
    this.updateAmenitiesFormControl();
  }

  openRoomModal() {
    this.openRoomForm = true;
    document.body.classList.add('overflow-hidden');
  }

  closeRoomModal() {
    this.openRoomForm = false;
    document.body.classList.remove('overflow-hidden');
  }

  addAmenity(): void {
    const trimmedAmenity = this.newAmenity.trim();
    if (trimmedAmenity && !this.selectedAmenities.includes(trimmedAmenity)) {
      this.selectedAmenities.push(trimmedAmenity);
      this.updateAmenitiesFormControl();
    }
    this.newAmenity = '';
  }

  removeAmenity(index: number): void {
    this.selectedAmenities.splice(index, 1);
    this.updateAmenitiesFormControl();
  }

  private updateAmenitiesFormControl(): void {
    this.roomForm.get('amenities')?.setValue(this.selectedAmenities);
    this.roomForm.get('amenities')?.updateValueAndValidity();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
