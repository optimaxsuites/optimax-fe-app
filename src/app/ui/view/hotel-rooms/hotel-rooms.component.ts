// hotel-rooms.component.ts
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

export interface Room {
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

@Component({
  selector: 'app-hotel-rooms',
  templateUrl: './hotel-rooms.component.html',
  styleUrls: ['./hotel-rooms.component.scss'],
})
export class HotelRoomsComponent implements OnInit {
  @Output() roomCreated = new EventEmitter<Room>();
  @Output() cancel = new EventEmitter<void>();

  roomForm!: FormGroup;
  roomStatuses = ['available', 'maintenance', 'dirty'];
  selectedAmenities: string[] = [];
  newAmenity: string = '';

  constructor(private fb: FormBuilder, private messageService: MessageService) {
    this.createForm();
  }

  ngOnInit(): void {}

  createForm(): void {
    this.roomForm = this.fb.group({
      number: [
        '',
        [Validators.required, Validators.min(100), Validators.max(9999)],
      ],
      type: ['', Validators.required],
      status: ['available', Validators.required],
      floor: ['', [Validators.required, Validators.min(1), Validators.max(99)]],
      rate: ['', [Validators.required, Validators.min(1000)]],
      beds: ['', [Validators.required, Validators.min(1), Validators.max(4)]],
      maxOccupancy: [
        '',
        [Validators.required, Validators.min(1), Validators.max(10)],
      ],
      description: [''],
      amenities: [this.selectedAmenities],
    });
  }

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

    const storedRooms = localStorage.getItem('rooms');
    const rooms: Room[] = storedRooms ? JSON.parse(storedRooms) : [];

    if (rooms.some((room) => room.number === this.roomForm.value.number)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Duplicate Room',
        detail: `Room number ${this.roomForm.value.number} already exists.`,
      });
      return;
    }

    const maxId =
      rooms.length > 0 ? Math.max(...rooms.map((room) => room.id)) : 0;
    const newId = maxId + 1;

    const newRoom: Room = {
      id: newId,
      number: this.roomForm.value.number,
      type: this.roomForm.value.type,
      status: this.roomForm.value.status,
      floor: this.roomForm.value.floor,
      rate: this.roomForm.value.rate,
      beds: this.roomForm.value.beds,
      maxOccupancy: this.roomForm.value.maxOccupancy,
      description: this.roomForm.value.description,
      amenities: [...this.selectedAmenities],
    };

    rooms.push(newRoom);
    localStorage.setItem('rooms', JSON.stringify(rooms));

    // Emit the new room to the parent component
    this.roomCreated.emit(newRoom);

    this.messageService.add({
      severity: 'success',
      summary: 'Room Created',
      detail: `Room ${newRoom.number} has been successfully created.`,
    });

    this.resetForm();
  }

  resetForm(): void {
    this.roomForm.reset({
      type: '',
      status: 'available',
    });
    this.selectedAmenities = [];
    this.updateAmenitiesFormControl();
  }

  onCancel(): void {
    this.cancel.emit();
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

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
