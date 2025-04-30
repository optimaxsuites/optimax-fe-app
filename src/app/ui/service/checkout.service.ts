import { Injectable, isDevMode } from '@angular/core';
import { environment } from '../sharedComponent/service/environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckoutService {

  constructor(
        private http: HttpClient,
    
  ) { }

   processCheckout(data: any) {
      return this.http
        .post<any>(this.getBaseApiUrl() + '/x/api/v2/pos/payments', data)
        .pipe(catchError(this.handleError));
    }
  
    saveOrder(data: any){
      return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/pos/orders', data)
      .pipe(catchError(this.handleError));
    }

    getOrders(){
      return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/pos/orders')
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
