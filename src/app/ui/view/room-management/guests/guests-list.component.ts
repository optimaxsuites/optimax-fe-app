import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HotelserviceService, Guest } from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-guests-list',
  templateUrl: './guests-list.component.html',
})
export class GuestsListComponent implements OnInit {
  guests: Guest[] = [];
  filteredGuests: Guest[] = [];
  loading = false;
  searchQuery = '';
  showDrawer = false;
  showDeleteModal = false;
  isEditing = false;
  selectedGuest: Guest | null = null;
  form!: FormGroup;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
  genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  countries: string[] = [];

  constructor(
    private hotelService: HotelserviceService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.countries = this.hotelService.getCountries();
    this.initForm();
    this.loadGuests();
  }

  initForm(): void {
    this.form = this.fb.group({
      title: ['Mr', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      country: ['Nigeria', Validators.required],
      gender: ['Male', Validators.required],
      idNumber: ['', Validators.required],
    });
  }

  loadGuests(): void {
    this.loading = true;
    this.hotelService.getGuests().subscribe({
      next: (data) => {
        this.guests = data;
        this.applySearch();
        this.loading = false;
      },
      error: () => {
        this.showToastMessage('Failed to load guests', 'error');
        this.loading = false;
      },
    });
  }

  applySearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredGuests = [...this.guests];
      return;
    }
    this.filteredGuests = this.guests.filter(
      (g) =>
        g.firstName.toLowerCase().includes(q) ||
        g.lastName.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.phone.includes(q)
    );
  }

  viewProfile(guest: Guest): void {
    this.router.navigate(['/hospitality/guests', guest.id]);
  }

  openCreateDrawer(): void {
    this.isEditing = false;
    this.selectedGuest = null;
    this.form.reset({ title: 'Mr', country: 'Nigeria', gender: 'Male' });
    this.showDrawer = true;
  }

  openEditDrawer(guest: Guest): void {
    this.isEditing = true;
    this.selectedGuest = guest;
    this.form.patchValue(guest);
    this.showDrawer = true;
  }

  closeDrawer(): void {
    this.showDrawer = false;
    this.form.reset();
  }

  saveGuest(): void {
    if (this.form.invalid) return;
    const data = this.form.value as Guest;

    const guestId = this.hotelService.getId(this.selectedGuest);
    if (this.isEditing && guestId) {
      this.hotelService.updateGuest(guestId, data).subscribe({
        next: () => {
          this.showToastMessage('Guest updated successfully', 'success');
          this.closeDrawer();
          this.loadGuests();
        },
        error: () => this.showToastMessage('Failed to update guest', 'error'),
      });
    } else {
      this.hotelService.createGuest(data).subscribe({
        next: (created) => {
          const id = this.hotelService.getId(created);
          this.showToastMessage('Guest created successfully', 'success');
          this.closeDrawer();
          this.loadGuests();
        },
        error: () => this.showToastMessage('Failed to create guest', 'error'),
      });
    }
  }

  confirmDelete(guest: Guest): void {
    this.selectedGuest = guest;
    this.showDeleteModal = true;
  }

  deleteGuest(): void {
    if (!this.selectedGuest?.id) return;
    this.hotelService.deleteGuest(this.selectedGuest.id).subscribe({
      next: () => {
        this.showToastMessage('Guest deleted successfully', 'success');
        this.showDeleteModal = false;
        this.selectedGuest = null;
        this.loadGuests();
      },
      error: () => this.showToastMessage('Failed to delete guest', 'error'),
    });
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }
}
