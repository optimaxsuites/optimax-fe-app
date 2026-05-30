// auth.service.ts
import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map, switchMap } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { StoreCustomerService } from './store-customer.service';

export interface SignupData {
  fullname: string;
  username: string;
  email: string;
  password: string;
  phonenumber: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  id: number;
  username: string;
  email: string;
  roles: string[];
  provider: string;
  accountId: string;
  project: string;
  ecode: string;
  tokenType: string;
  accessToken: string;
  verified?: boolean; // Optional since it's not in the response
  posCustomerId?: number; // Added for sticky POS identification
}

export interface SignupResponse {
  success: boolean;
  message: string;
  requiresVerification: boolean;
  userId?: number;
  username?: string;
  email?: string;
}

export interface VerificationStatus {
  verified: boolean;
}

export interface PendingVerification {
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient,
    private storeCustomerService: StoreCustomerService
  ) {}

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private validateAndFormatSignupData(userData: SignupData): any {
    const formattedPhone = userData.phonenumber
      .replace(/\D/g, '')
      .substring(0, 15);
    const username = userData.username.substring(0, 20);
    const clientType = 'Group';
    const currentDate = new Date().toISOString();

    const apiKey = environment.apiKey || '';
    const project = environment.project || 'ERP';

    // Dynamic domain extraction
    let domain = 'optimax';
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      domain = hostname.split('.')[0];
    }

    return {
      username: username,
      email: userData.email,
      role: ['ROLE_USER'],
      password: userData.password,
      project: project,
      apiKey: apiKey,
      createdDate: currentDate,
      lastLoginDate: currentDate,
      createdBy: 'system',
      upi: {
        fullname: userData.fullname.substring(0, 100),
        email: userData.email,
        phoneNumber: formattedPhone,
        username: username,
        city: '',
        state: '',
        country: '',
        profileImage: '',
        address: '',
        domain: domain,
        clientType: clientType,
        companyName: '',
        industry: '',
        bio: '',
        postalCode: '',
        currency: 'NGN',
        language: 'en',
        timeZone: 'Africa/Lagos',
      },
    };
  }

  signup(userData: SignupData): Observable<SignupResponse> {
    const validatedPayload = this.validateAndFormatSignupData(userData);

    console.log('Sending signup payload:', validatedPayload);

    return this.http
      .post<any>(
        this.getBaseApiUrl() + '/x/api/v2/auth/signup',
        validatedPayload
      )
      
      .pipe(
        switchMap((response: any) => {
          // Create POS Customer record immediately
          const customerData = {
            name: userData.fullname,
            email: userData.email,
            phoneNumber: userData.phonenumber
              .replace(/\D/g, '')
              .substring(0, 15),
            loyaltyPoints: 0
          };
          
          console.log('Creating POS customer record for new user...');
          
          return this.storeCustomerService.createCustomer(customerData).pipe(
            map((customerResponse) => {
              console.log('POS Customer created on signup:', customerResponse);
              return response; // Return original auth response
            }),
            catchError(err => {
              console.warn('Failed to create POS customer on signup (non-blocking):', err);
              // Return original response anyway
              return of(response);
            })
          );
        }),
        map((response: any) => {
          return {
            success: true,
            message:
              'Account created successfully! Please check your email for verification.',
            requiresVerification: true,
            userId: response.user?.id || 0,
            username: userData.username,
            email: userData.email,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          // Handle email service errors gracefully
          if (
            error.status === 500 &&
            error.error?.message?.includes('MailAuthenticationException')
          ) {
            const response: SignupResponse = {
              success: true,
              message:
                'Account created! Please check your email for verification.',
              requiresVerification: true,
              username: userData.username,
              email: userData.email,
            };
            return of(response);
          }

          let errorMessage = 'An unknown error occurred!';
          if (error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
          } else {
            if (error.status === 500) {
              errorMessage =
                'Server error. Please check your details and try again.';
            } else if (error.status === 0) {
              errorMessage =
                'Unable to connect to server. Check your internet connection.';
            } else if (error.status === 400) {
              errorMessage =
                error.error?.message ||
                'Invalid request. Please check your input.';
            } else {
              errorMessage = error.error?.message || `Error: ${error.status}`;
            }
          }
          return throwError(() => errorMessage);
        })
      );
  }

 // Update the login method
login(loginData: LoginData): Observable<AuthResponse> {
	  const loginPayload = {
	    username: loginData.username,
	    password: loginData.password,
	    project: environment.project || 'ERP',
	    clientId: environment.clientId,
	    appVersion: environment.appVersion
	  };
	
	  return this.http.post<AuthResponse>(
	    this.getBaseApiUrl() + '/x/api/v2/auth/signin', 
	    loginPayload,
	    { withCredentials: true }
	  ).pipe(
	    tap(response => {
	      localStorage.removeItem('auth_token');
	      localStorage.removeItem('token');
	      sessionStorage.removeItem('Token');

      if (response.ecode && response.ecode !== 'null') {
        localStorage.setItem('tenantId', response.ecode);
      } else {
        localStorage.removeItem('tenantId'); // Clear if null/invalid
      }
      
      // Store user data
      const userData = {
        id: response.id,
        username: response.username,
        email: response.email,
        role: response.roles,
        verified: response.verified !== false, // Default to true if not provided
        accountId: response.accountId,
        project: response.project,
        ecode: response.ecode
      };
      localStorage.setItem('user_data', JSON.stringify(userData));
    }),
    catchError(this.handleError)
  );
}

  verifyEmail(token: string): Observable<any> {
    return this.http
      .get<any>(
        this.getBaseApiUrl() + `/x/api/v2/us/register/verify?token=${token}`
      )
      .pipe(
        tap(() => {
          console.log('Email verification successful');
        }),
        catchError(this.handleError)
      );
  }

  resendVerificationEmail(username: string): Observable<any> {
    const payload = {
      username: username,
      project: environment.project || 'ERP',
      apiKey: environment.apiKey || '',
    };

    return this.http
      .post<any>(
        this.getBaseApiUrl() + '/x/api/v2/us/register/resend',
        payload
      )
      .pipe(
        tap(() => {
          console.log('Verification email resent successfully');
        }),
        catchError(this.handleError)
      );
  }

  checkVerificationStatus(username: string): Observable<VerificationStatus> {
    return this.http
      .get<VerificationStatus>(
        this.getBaseApiUrl() + `/x/api/v2/us/ur/get/user/verified/${username}`
      )
      .pipe(catchError(this.handleError));
  }

  // Password reset functionality
  requestPasswordReset(email: string): Observable<any> {
    const payload = {
      email: email,
      project: environment.project || 'store',
    };

    return this.http
      .post<any>(
        this.getBaseApiUrl() + '/x/api/v2/us/register/resetpasswordlink',
        payload
      )
      .pipe(catchError(this.handleError));
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('pending_verification_user');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
    const user = this.getCurrentUser();
    return !!token && !!user && user.verified;
  }

  getCurrentUser(): any {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isVerified(): boolean {
    const user = this.getCurrentUser();
    return user ? user.verified : false;
  }

  storePendingVerification(userData: PendingVerification): void {
    localStorage.setItem('pending_verification_user', JSON.stringify(userData));
  }

  getPendingVerification(): PendingVerification | null {
    const data = localStorage.getItem('pending_verification_user');
    return data ? JSON.parse(data) : null;
  }

  clearPendingVerification(): void {
    localStorage.removeItem('pending_verification_user');
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 500) {
        errorMessage = 'Server error. Please try again.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found. Please try again.';
      } else if (error.status === 0) {
        errorMessage =
          'Unable to connect to server. Check your internet connection.';
      } else if (error.status === 401) {
        errorMessage = 'Invalid username or password.';
      } else if (error.status === 400) {
        errorMessage = error.error?.message || 'Invalid request.';
      } else if (error.status === 403) {
        errorMessage = 'Access denied. Please verify your email.';
      } else {
        errorMessage = error.error?.message || 'An unexpected error occurred.';
      }
    }
    return throwError(() => errorMessage);
  }
}
