import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  HotelserviceService,
  Guest,
  Booking,
  BookingStatus,
} from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-guest-profile',
  templateUrl: './guest-profile.component.html',
})
export class GuestProfileComponent implements OnInit {
  guest: Guest | null = null;
  bookings: Booking[] = [];
  loading = false;
  loadingBookings = false;
  activeTab: 'details' | 'bookings' = 'details';
  showEditDrawer = false;
  form!: FormGroup;
  uuid = '';

  titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'];
  genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  countries: string[] = [];

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  rooms: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hotelService: HotelserviceService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.countries = this.hotelService.getCountries();
    this.initForm();
    this.loadRooms();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 
                this.route.parent?.snapshot.paramMap.get('uuid') || '';
    if (id) this.loadGuest(id);
  }

  loadRooms(): void {
    this.hotelService.getRooms().subscribe({ next: (r) => (this.rooms = r) });
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

  loadGuest(id: number): void {
    this.loading = true;
    this.hotelService.getGuest(id).subscribe({
      next: (data) => {
        this.guest = data;
        this.form.patchValue(data);
        this.loading = false;
        this.loadBookings(id);
      },
      error: () => {
        this.showToastMessage('Failed to load guest', 'error');
        this.loading = false;
      },
    });
  }

  loadBookings(guestId: number): void {
    this.loadingBookings = true;
    this.hotelService.getBookingsByGuest(guestId).subscribe({
      next: (data) => {
        this.bookings = data;
        this.loadingBookings = false;
      },
      error: () => {
        this.loadingBookings = false;
      },
    });
  }

  saveGuest(): void {
    const gId = this.hotelService.getId(this.guest);
    if (!gId || this.form.invalid) return;
    this.hotelService.updateGuest(gId, this.form.value).subscribe({
      next: (updated) => {
        this.guest = updated;
        this.showEditDrawer = false;
        this.showToastMessage('Guest updated successfully', 'success');
      },
      error: () => this.showToastMessage('Failed to update guest', 'error'),
    });
  }

  viewBooking(booking: Booking): void {
    this.router.navigate(['/hospitality/bookings', booking.id, this.uuid]);
  }

  goBack(): void {
    this.router.navigate(['/hospitality/guests', this.uuid]);
  }

  getStatusColor(status: BookingStatus): string {
    const map: Record<string, string> = {
      CONFIRMED: 'bg-customBlue text-white',
      PENDING: 'bg-amber-400 text-white',
      CANCELLED: 'bg-red-500 text-white',
      CHECKED_IN: 'bg-customGreen text-white',
      CHECKED_OUT: 'bg-gray-500 text-white',
      NO_SHOW: 'bg-orange-500 text-white',
    };
    return map[status] ?? 'bg-gray-300 text-gray-700';
  }

  getNights(checkin: string, checkout: string): number {
    return this.hotelService.calculateNights(checkin, checkout);
  }

  getGuestName(guest: Guest | number | string | null | undefined): string {
    if (!guest) return 'Unknown';
    if (typeof guest === 'number' || typeof guest === 'string') {
      return this.guest ? `${this.guest.firstName} ${this.guest.lastName}` : `Guest #${guest}`;
    }
    return `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Unnamed';
  }

  getRoomNumbers(rooms: any[] | null | undefined): string {
    if (!rooms || rooms.length === 0) return 'No Room';
    return (rooms || []).map((rId) => {
      const idToFind = this.hotelService.getId(rId);
      const room = (this.rooms || []).find((r) => String(this.hotelService.getId(r)) == String(idToFind));
      return room ? `#${room.roomNumber}` : `#${idToFind}`;
    }).join(', ');
  }

  showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }
}
