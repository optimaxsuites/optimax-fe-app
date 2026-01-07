import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';
import { CustomerDTO } from '../models/interface';

@Injectable({
  providedIn: 'root'
})
export class StoreCustomerService {

  constructor(
      private http: HttpClient,
  ) { }

    createCustomer(data: CustomerDTO) {
        return this.http
          .post<any>(this.getBaseApiUrl() + '/x/api/v2/pos/customers', data, { headers: this.getHeaders() })
          .pipe(catchError(this.handleError));
      }

      getCustomerById(id: number) {
        return this.http
          .get<any>(this.getBaseApiUrl() + `/x/api/v2/pos/customers/${id}`, { headers: this.getHeaders() })
          .pipe(catchError(this.handleError));
      }

      getCustomerByPhone(phone: string) {
        return this.http
          .get<any>(this.getBaseApiUrl() + `/x/api/v2/pos/customers/get/by/phoneNumber?phoneNumber=${phone}`, { headers: this.getHeaders() })
          .pipe(catchError(this.handleError));
      } 

      getCustomerByEmail(email: string) {
        return this.http
          .get<any>(this.getBaseApiUrl() + `/x/api/v2/pos/customers/get/by/email?email=${email}`, { headers: this.getHeaders() })
          .pipe(catchError(this.handleError));
      }
    
   private getBaseApiUrl(): string {
        return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
      }

   private getHeaders(): any {
     const headers: any = {
       'Content-Type': 'application/json',
       'X-Project': environment.project || 'ERP',
       'X-Api-Key': environment.apiKey || ''
     };

     let tenantId = localStorage.getItem('tenantId');
     
     // Fallback: try to get ecode from user_data
     if (!tenantId) {
       const userDataStr = localStorage.getItem('user_data');
       if (userDataStr) {
         try {
           const userData = JSON.parse(userDataStr);
           tenantId = userData.ecode;
         } catch (e) {}
       }
     }

      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId;
      } else {
        headers['X-Tenant-ID'] = 'optimax';
      }

     const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
     if (token) {
       headers['Authorization'] = `Bearer ${token}`;
     }

     return headers;
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
                
                // Append status code
                errorMessage = `${errorMessage} (${error.status})`;
              }
              return throwError(() => errorMessage);
       }
}
