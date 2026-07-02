import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment';


export interface SmtpConfig {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: string;
  authEnabled: boolean;
  startTlsEnabled: boolean;
  sslEnabled: boolean;
  fromAddress: string;
  connectionTimeoutMs: number;
  timeoutMs: number;
  writeTimeoutMs: number;
  active: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class SmtpConfigService {

    private baseUrl = environment.apiBaseUrl;
  
  constructor(private http: HttpClient) {}

  createConfig(payload: SmtpConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/us/smtp-config`, payload).pipe(catchError(this.handleError));;
  }

  testConfig(payload: SmtpConfig): Observable<any> {
    return this.http.post(`${this.baseUrl}/x/api/v2/us/smtp-config/test-connection`, payload).pipe(catchError(this.handleError));;
  }
  
  getConfig(): Observable<any> {
    return this.http.get(`${this.baseUrl}/x/api/v2/us/smtp-config`).pipe(catchError(this.handleError));;
  }

  private handleError(error: HttpErrorResponse) {
      let errorMessage = 'An unknown error occurred!';
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.status === 500) {
          errorMessage =
            'Server error: ' + error.error.message ||
            'Check form details and try again.';
        } else if (error.status === 404) {
          errorMessage = 'Resource not found. Please try again.';
        } else if (error.status === 0) {
          errorMessage =
            'Unable to connect to the server. Please check your internet connection.';
        } else {
          errorMessage = error.error.message || 'An unexpected error occurred.';
        }
      }
      return throwError(() => errorMessage);
    }
}
