import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  HotelserviceService,
  AdditionalDetail,
} from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-services-list',
  templateUrl: './services-list.component.html',
})
export class ServicesListComponent implements OnInit {
  services: AdditionalDetail[] = [];
  loading = false;
  showDrawer = false;
  showDeleteModal = false;
  isEditing = false;
  selectedService: AdditionalDetail | null = null;
  form!: FormGroup;
  uuid = '';

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  measurements = [
    { value: 'UNIT', label: 'Unit' },
    { value: 'PER_HOUR', label: 'Per Hour' },
    { value: 'PER_DAY', label: 'Per Day' },
    { value: 'PER_NIGHT', label: 'Per Night' },
    { value: 'PER_MONTH', label: 'Per Month' },
    { value: 'PER_WEEK', label: 'Per Week' },
    { value: 'PER_PERSON', label: 'Per Person' },
    { value: 'PER_ROOM', label: 'Per Room' },
    { value: 'KG', label: 'Kilogram' },
    { value: 'GRAM', label: 'Gram' },
    { value: 'POUND', label: 'Pound' },
    { value: 'LITER', label: 'Liter' },
    { value: 'MILLILITER', label: 'Milliliter' },
    { value: 'PIECE', label: 'Piece' },
    { value: 'BOX', label: 'Box' },
    { value: 'DOZEN', label: 'Dozen' },
    { value: 'PACK', label: 'Pack' },
    { value: 'INCH', label: 'Inch' },
    { value: 'CENTIMETER', label: 'Centimeter' },
    { value: 'METER', label: 'Meter' },
    { value: 'FOOT', label: 'Foot' },
    { value: 'YARD', label: 'Yard' },
    { value: 'TON', label: 'Ton' },
    { value: 'CUBIC_METER', label: 'Cubic Meter' },
  ];

  serviceIcons: Record<string, string> = {
    breakfast: 'fa-solid fa-mug-hot',
    meal: 'fa-solid fa-utensils',
    lunch: 'fa-solid fa-bowl-food',
    dinner: 'fa-solid fa-plate-wheat',
    pool: 'fa-solid fa-water-ladder',
    laundry: 'fa-solid fa-shirt',
    pickup: 'fa-solid fa-car-side',
    airport: 'fa-solid fa-plane-departure',
    spa: 'fa-solid fa-spa',
    gym: 'fa-solid fa-dumbbell',
    bar: 'fa-solid fa-martini-glass',
    wifi: 'fa-solid fa-wifi',
    parking: 'fa-solid fa-square-parking',
    room: 'fa-solid fa-concierge-bell',
    default: 'fa-solid fa-star',
  };

  constructor(
    private hotelService: HotelserviceService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.uuid =
      this.route.snapshot.paramMap.get('uuid') ||
      this.route.parent?.snapshot.paramMap.get('uuid') ||
      '';
    this.initForm();
    this.loadServices();
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      price: [0, [Validators.required, Validators.min(0)]],
      measurements: ['UNIT', Validators.required],
    });
  }

  loadServices(): void {
    this.loading = true;
    this.hotelService.getAdditionalDetails().subscribe({
      next: (data) => {
        this.services = data;
        this.loading = false;
      },
      error: () => {
        this.showToastMessage('Failed to load services', 'error');
        this.loading = false;
      },
    });
  }

  getServiceIcon(name: string): string {
    const lower = name.toLowerCase();
    for (const key of Object.keys(this.serviceIcons)) {
      if (lower.includes(key)) return this.serviceIcons[key];
    }
    return this.serviceIcons['default'];
  }

  getMeasurementLabel(value: string): string {
    const measurement = this.measurements.find((m) => m.value === value);
    return measurement ? measurement.label : value;
  }

  openCreateDrawer(): void {
    this.isEditing = false;
    this.selectedService = null;
    this.form.reset({ measurements: 'UNIT', price: 0 });
    this.showDrawer = true;
  }

  openEditDrawer(service: AdditionalDetail): void {
    this.isEditing = true;
    this.selectedService = service;
    this.form.patchValue(service);
    this.showDrawer = true;
  }

  closeDrawer(): void {
    this.showDrawer = false;
    this.form.reset();
  }

  saveService(): void {
    if (this.form.invalid) return;
    const data: AdditionalDetail = this.form.value;

    if (this.isEditing && this.selectedService?.id) {
      this.hotelService
        .updateAdditionalDetail(this.selectedService.id, data)
        .subscribe({
          next: () => {
            this.showToastMessage('Service updated successfully', 'success');
            this.closeDrawer();
            this.loadServices();
          },
          error: () =>
            this.showToastMessage('Failed to update service', 'error'),
        });
    } else {
      this.hotelService.createAdditionalDetail(data).subscribe({
        next: () => {
          this.showToastMessage('Service created successfully', 'success');
          this.closeDrawer();
          this.loadServices();
        },
        error: () => this.showToastMessage('Failed to create service', 'error'),
      });
    }
  }

  confirmDelete(service: AdditionalDetail): void {
    this.selectedService = service;
    this.showDeleteModal = true;
  }

  deleteService(): void {
    if (!this.selectedService?.id) return;
    this.hotelService
      .deleteAdditionalDetail(this.selectedService.id)
      .subscribe({
        next: () => {
          this.showToastMessage('Service deleted successfully', 'success');
          this.showDeleteModal = false;
          this.selectedService = null;
          this.loadServices();
        },
        error: () => this.showToastMessage('Failed to delete service', 'error'),
      });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }
}
