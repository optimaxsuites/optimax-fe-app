import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AuthenticationService } from '../../../sharedComponent/service/auth-service/authentication.service';
import { HotelserviceService } from '../../../hospitality/hotelservice.service';
import { UrlValidatorService } from '../../../../shared/services/url-validator.service';
import { LoggerService } from '../../../../shared/services/logger.service';
import { AppConstants } from '../../../../shared/constants/app.constants';
import { AuthPayload } from '../../../../shared/models/index';

@Component({
  selector: 'app-e-booking-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class EBookingLoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';
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
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(AppConstants.USERNAME_MIN_LENGTH)]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = '';

    const payload: AuthPayload = {
      username: this.f['username'].value,
      password: this.f['password'].value
    };

    this.authService.userLogin(payload)
      .pipe(
        switchMap(res => this.authService.getRegDataByUsername(payload.username)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (userData) => {
          this.handleLoginSuccess(payload.username, userData);
        },
        error: (err) => {
          this.handleLoginError(err);
        }
      });
  }

  private handleLoginSuccess(username: string, userData: any): void {
    sessionStorage.setItem(AppConstants.STORAGE_USER_ID, this.hotelService.getId(userData));
    sessionStorage.setItem(AppConstants.STORAGE_USERNAME, username);

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const safeReturnUrl = this.urlValidator.getSafeReturnUrl(
      returnUrl,
      ['/e-bookings/home', this.uuid]
    );

    this.logger.info('Login successful', { username });
    this.loading = false;

    if (typeof safeReturnUrl === 'string') {
      this.router.navigateByUrl(safeReturnUrl);
    } else {
      this.router.navigate(safeReturnUrl);
    }
  }

  private handleLoginError(error: any): void {
    this.loading = false;
    this.logger.error('Login failed', error);

    const errorMessage = this.parseErrorMessage(error);
    this.error = errorMessage;
  }

  private parseErrorMessage(error: any): string {
    if (error?.status === 401) {
      return AppConstants.ERROR_INVALID_CREDENTIALS;
    }
    if (error?.status === 0) {
      return AppConstants.ERROR_NETWORK;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    return AppConstants.ERROR_INVALID_CREDENTIALS;
  }

  goBack(): void {
    this.router.navigate(['/user/e-bookings/home', this.uuid]);
  }
}
