// auth.service.ts
import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';

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
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string[];
    verified: boolean;
    upi: {
      fullname: string;
      email: string;
      phoneNumber: string;
      city: string;
      state: string;
      country: string;
      profileImage: string;
      address: string;
      clientType: string;
      companyName: string;
      industry: string;
      bio: string;
      postalCode: string;
      currency: string;
      language: string;
      timeZone: string;
    };
  };
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
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) {}

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private validateAndFormatSignupData(userData: SignupData): any {
    const formattedPhone = userData.phonenumber.replace(/\D/g, '').substring(0, 15);
    const username = userData.username.substring(0, 20);
    const clientType = "Individual".substring(0, 10);
    const currentDate = new Date().toISOString();
    
    const apiKey = environment.apiKey || 'default-store-api-key';
    const project = environment.project || 'store';

    return {
      username: username,
      email: userData.email,
      role: ["user"],
      password: userData.password,
      project: project,
      apiKey: apiKey,
      createdDate: currentDate,
      lastLoginDate: currentDate,
      createdBy: "system",
      upi: {
        fullname: userData.fullname.substring(0, 100),
        email: userData.email,
        phoneNumber: formattedPhone,
        username: username,
        city: "",
        state: "",
        country: "",
        profileImage: "",
        address: "",
        clientType: clientType,
        companyName: "",
        industry: "",
        bio: "",
        postalCode: "",
        currency: "NGN",
        language: "en",
        timeZone: "Africa/Lagos"
      }
    };
  }

  signup(userData: SignupData): Observable<SignupResponse> {
    const validatedPayload = this.validateAndFormatSignupData(userData);

    console.log('Sending signup payload:', validatedPayload);

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/auth/signup', 
      validatedPayload
    ).pipe(
      map((response: any) => {
        return {
          success: true,
          message: 'Account created successfully! Please check your email for verification.',
          requiresVerification: true,
          userId: response.user?.id || 0,
          username: userData.username,
          email: userData.email
        };
      }),
      catchError((error: HttpErrorResponse) => {
        // Handle email service errors gracefully
        if (error.status === 500 && error.error?.message?.includes('MailAuthenticationException')) {
          const response: SignupResponse = {
            success: true,
            message: 'Account created! Please check your email for verification.',
            requiresVerification: true,
            username: userData.username,
            email: userData.email
          };
          return of(response);
        }
        
        let errorMessage = 'An unknown error occurred!';
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Error: ${error.error.message}`;
        } else {
          if (error.status === 500) {
            errorMessage = 'Server error. Please check your details and try again.';
          } else if (error.status === 0) {
            errorMessage = 'Unable to connect to server. Check your internet connection.';
          } else if (error.status === 400) {
            errorMessage = error.error?.message || 'Invalid request. Please check your input.';
          } else {
            errorMessage = error.error?.message || `Error: ${error.status}`;
          }
        }
        return throwError(() => errorMessage);
      })
    );
  }

  login(loginData: LoginData): Observable<AuthResponse> {
    const loginPayload = {
      username: loginData.username,
      password: loginData.password,
      project: environment.project || 'ERP',
      apiKey: environment.apiKey || 'ApiKey 6f4fc8aefc712b4e45b2c78fa472c870'
    };

    return this.http.post<AuthResponse>(
      this.getBaseApiUrl() + '/x/api/v2/auth/signin', 
      loginPayload
    ).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('user_data', JSON.stringify(response.user));
        }
      }),
      catchError(this.handleError)
    );
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.get<any>(
      this.getBaseApiUrl() + `/x/api/v2/us/register/verify?token=${token}`
    ).pipe(
      tap(() => {
        console.log('Email verification successful');
      }),
      catchError(this.handleError)
    );
  }

  resendVerificationEmail(username: string): Observable<any> {
    const payload = {
      username: username,
      project: environment.project || 'store',
      apiKey: environment.apiKey || 'default-store-api-key'
    };

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/us/register/resetpasswordlink',
      payload
    ).pipe(
      tap(() => {
        console.log('Verification email resent successfully');
      }),
      catchError(this.handleError)
    );
  }

  checkVerificationStatus(username: string): Observable<VerificationStatus> {
    return this.http.get<VerificationStatus>(
      this.getBaseApiUrl() + `/x/api/v2/us/ur/get/user/verified/${username}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Password reset functionality
  requestPasswordReset(email: string): Observable<any> {
    const payload = {
      email: email,
      project: environment.project || 'store',
      apiKey: environment.apiKey || 'default-store-api-key'
    };

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/us/register/resetpasswordlink',
      payload
    ).pipe(catchError(this.handleError));
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('pending_verification_user');
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
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
        errorMessage = 'Unable to connect to server. Check your internet connection.';
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