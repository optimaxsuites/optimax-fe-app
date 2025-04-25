import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';
import { CustomerDTO } from '../models/interface';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  constructor(
      private http: HttpClient,
  ) { }

    createCustomer(data: CustomerDTO) {
        return this.http
          .post<any>(this.getBaseApiUrl() + '/x/api/v2/pos/customers', data)
          .pipe(catchError(this.handleError));
      }
    
   private getBaseApiUrl(): string {
        return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
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
