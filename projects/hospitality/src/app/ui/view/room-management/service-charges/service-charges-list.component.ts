import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HotelserviceService, ServiceCharge, Room } from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-service-charges-list',
  templateUrl: './service-charges-list.component.html',
})
export class ServiceChargesListComponent implements OnInit {
  charges: ServiceCharge[] = [];
  rooms: Room[] = [];
  loading = false;
  showDrawer = false;
  showDeleteModal = false;
  isEditing = false;
  selectedCharge: ServiceCharge | null = null;
  form!: FormGroup;
  uuid = '';

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
    this.loadCharges();
    this.loadRooms();
  }

  initForm(): void {
    this.form = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(2)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      applicableFrom: ['', Validators.required],
      applicableTo: ['', Validators.required],
      room: [null, Validators.required],
    });
  }

  loadCharges(): void {
    this.loading = true;
    this.hotelService.getServiceCharges().subscribe({
      next: (data) => { this.charges = data; this.loading = false; },
      error: () => { this.showToastMessage('Failed to load service charges', 'error'); this.loading = false; },
    });
  }

  loadRooms(): void {
    this.hotelService.getRooms().subscribe({
      next: (data) => (this.rooms = data),
      error: () => this.showToastMessage('Failed to load rooms', 'error'),
    });
  }

  getRoomLabel(id: number): string {
    const r = this.rooms.find(r => r.id === id);
    return r ? `Room ${r.roomNumber}` : `Room #${id}`;
  }

  openCreateDrawer(): void {
    this.isEditing = false;
    this.selectedCharge = null;
    this.form.reset({ amount: 0 });
    this.showDrawer = true;
  }

  openEditDrawer(charge: ServiceCharge): void {
    this.isEditing = true;
    this.selectedCharge = charge;
    this.form.patchValue(charge);
    this.showDrawer = true;
  }

  closeDrawer(): void {
    this.showDrawer = false;
    this.form.reset();
  }

  saveCharge(): void {
    if (this.form.invalid) return;
    const data: ServiceCharge = this.form.value;

    if (this.isEditing && this.selectedCharge?.id) {
      this.hotelService.updateServiceCharge(this.selectedCharge.id, data).subscribe({
        next: () => { this.showToastMessage('Charge updated successfully', 'success'); this.closeDrawer(); this.loadCharges(); },
        error: () => this.showToastMessage('Failed to update charge', 'error'),
      });
    } else {
      this.hotelService.createServiceCharge(data).subscribe({
        next: () => { this.showToastMessage('Charge created successfully', 'success'); this.closeDrawer(); this.loadCharges(); },
        error: () => this.showToastMessage('Failed to create charge', 'error'),
      });
    }
  }

  confirmDelete(charge: ServiceCharge): void {
    this.selectedCharge = charge;
    this.showDeleteModal = true;
  }

  deleteCharge(): void {
    if (!this.selectedCharge?.id) return;
    this.hotelService.deleteServiceCharge(this.selectedCharge.id).subscribe({
      next: () => { this.showToastMessage('Charge deleted successfully', 'success'); this.showDeleteModal = false; this.selectedCharge = null; this.loadCharges(); },
      error: () => this.showToastMessage('Failed to delete charge', 'error'),
    });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }
}
