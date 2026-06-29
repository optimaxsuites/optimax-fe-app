import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-e-booking-confirmation',
  templateUrl: './e-booking-confirmation.component.html',
  styleUrls: ['./e-booking-confirmation.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class EBookingConfirmationComponent implements OnInit {
  bookingData: any = null;
  uuid = 'default';
  branding: any = { companyName: 'OptimaxHospitality', logo: null };

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    this.loadBranding();

    // Get booking data from router state (passed from checkout)
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state && navigation.extras.state['booking']) {
      this.bookingData = navigation.extras.state['booking'];
    }

    // If no data in state, try to get from localStorage
    if (!this.bookingData) {
      const stored = localStorage.getItem('lastBooking');
      if (stored) {
        this.bookingData = JSON.parse(stored);
      }
    }
  }

  private loadBranding(): void {
    const saved = localStorage.getItem('optimax_settings');
    if (saved) this.branding = JSON.parse(saved);
  }

  goHome(): void {
    this.router.navigate(['/user/e-bookings/home', this.uuid]);
  }

  viewBookingDetails(): void {
    // For future integration with booking history/details page
    this.goHome();
  }

  downloadConfirmation(): void {
    // For future PDF download functionality
    console.log('Download confirmation PDF');
  }
}
