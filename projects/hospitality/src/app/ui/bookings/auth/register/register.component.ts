import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthenticationService } from '../../../sharedComponent/service/auth-service/authentication.service';
import { HotelserviceService } from '../../../hospitality/hotelservice.service';
import { UrlValidatorService } from '../../../../shared/services/url-validator.service';
import { LoggerService } from '../../../../shared/services/logger.service';
import { AppConstants } from '../../../../shared/constants/app.constants';
import { RegisterPayload } from '../../../../shared/models/index';

@Component({
  selector: 'app-e-booking-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class EBookingRegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  uuid = '';
  showPassword = false;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private hotelService: HotelserviceService,
    private urlValidator: UrlValidatorService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.uuid = this.route.snapshot.paramMap.get('uuid') || 'default';
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.registerForm = this.formBuilder.group({
      fullname: [
        '',
        [Validators.required, Validators.maxLength(AppConstants.FULLNAME_MAX_LENGTH)]
      ],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(AppConstants.USERNAME_MIN_LENGTH),
          Validators.maxLength(AppConstants.USERNAME_MAX_LENGTH)
        ]
      ],
      email: ['', [Validators.required, Validators.email]],
      phonenumber: ['', [Validators.required, Validators.pattern(AppConstants.PHONE_REGEX)]],
      password: [
        '',
        [Validators.required, Validators.minLength(AppConstants.PASSWORD_MIN_LENGTH)]
      ],
      confirmPassword: ['', Validators.required],
      agreeTerms: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  get f() {
    return this.registerForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Validator to ensure passwords match
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.errors && !confirmPassword.errors['mustMatch']) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mustMatch: true });
      return { mustMatch: true };
    }

    confirmPassword.setErrors(null);
    return null;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const payload: RegisterPayload = {
      ...this.registerForm.value
    };

    this.authService.userRegistration(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.handleRegistrationSuccess();
        },
        error: (err) => {
          this.handleRegistrationError(err);
        }
      });
  }

  private handleRegistrationSuccess(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const extras = returnUrl ? { queryParams: { returnUrl: returnUrl } } : {};

    this.logger.info('Registration successful');
    this.loading = false;
    this.router.navigate(['/user/e-bookings/auth/login', this.uuid], extras);
  }

  private handleRegistrationError(error: any): void {
    this.loading = false;
    this.logger.error('Registration failed', error);

    const errorMessage = this.parseErrorMessage(error);
    this.error = errorMessage;
  }

  private parseErrorMessage(error: any): string {
    if (error?.status === 409) {
      return AppConstants.ERROR_EMAIL_EXISTS;
    }
    if (error?.status === 400) {
      return AppConstants.ERROR_INVALID_FORM;
    }
    if (error?.status === 0) {
      return AppConstants.ERROR_NETWORK;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    return 'Registration failed. Please try again.';
  }

  goBack(): void {
    this.router.navigate(['/user/e-bookings/home', this.uuid]);
  }
}
