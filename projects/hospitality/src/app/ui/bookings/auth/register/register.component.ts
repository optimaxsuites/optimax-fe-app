import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../../../sharedComponent/service/auth-service/authentication.service';
import { HotelserviceService } from '../../../hospitality/hotelservice.service';

@Component({
  selector: 'app-e-booking-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class EBookingRegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  uuid = '';
  showPassword = false;

  titles: string[] = [];
  genders: string[] = [];
  countries: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private hotelService: HotelserviceService
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    
    this.registerForm = this.formBuilder.group({
      fullname: ['', [Validators.required, Validators.maxLength(100)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      phonenumber: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.mustMatch('password', 'confirmPassword')
    });
  }

  get f() { return this.registerForm.controls; }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  mustMatch(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];
      if (matchingControl.errors && !matchingControl.errors['mustMatch']) return;
      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mustMatch: true });
      } else {
        matchingControl.setErrors(null);
      }
    };
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.error = '';

    const payload = this.registerForm.value;

    console.log('DEBUG: E-Booking Register — Payload:', payload);

    this.authService.userRegistration(payload).subscribe({
      next: (res: any) => {
        console.log('DEBUG: E-Booking Register — SUCCESS:', res);
        
        // Pass returnUrl to login if present
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const extras = returnUrl ? { queryParams: { returnUrl: returnUrl } } : {};
        this.router.navigate(['/e-bookings/auth/login', this.uuid], extras);
      },
      error: (err: any) => {
        console.error('DEBUG: E-Booking Register — FAILED:', err);
        this.loading = false;
        this.error = 'Registration failed. Please check your details and try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/e-bookings/home', this.uuid]);
  }
}
