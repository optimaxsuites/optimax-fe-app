import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../../../sharedComponent/service/auth-service/authentication.service';
import { HotelserviceService } from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-e-booking-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class EBookingLoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  uuid = '';
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  get f() { return this.loginForm.controls; }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = '';

    const payload = {
      username: this.f['username'].value,
      password: this.f['password'].value
    };

    console.log('DEBUG: E-Booking Login — Payload:', payload);

    this.authService.userLogin(payload).subscribe({
      next: (res: any) => {
        console.log('DEBUG: E-Booking Login — SUCCESS:', res);
        
        this.authService.getRegDataByUsername(payload.username).subscribe({
          next: (userData: any) => {
            sessionStorage.setItem('userid', this.hotelService.getId(userData));
            sessionStorage.setItem('username', payload.username);
            
            // Redirect to returnUrl if present
            const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
            if (returnUrl) {
              this.router.navigateByUrl(returnUrl);
            } else {
              this.router.navigate(['/e-bookings/home', this.uuid]);
            }
          },
          error: (err: any) => {
            this.loading = false;
            this.error = 'Login successful but user profile not found.';
          }
        });
      },
      error: (err: any) => {
        console.error('DEBUG: E-Booking Login — FAILED:', err);
        this.loading = false;
        this.error = 'Invalid credentials. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/e-bookings/home', this.uuid]);
  }
}
