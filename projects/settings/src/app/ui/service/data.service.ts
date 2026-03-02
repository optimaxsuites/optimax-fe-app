import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(  private http: HttpClient,) { }
  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  addBranch(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/pos/branches', data)
      .pipe(catchError(this.handleError));
  }
  getBranches() {
    return this.http
         .get<any>(this.getBaseApiUrl() + '/x/api/v2/pos/branches')
         .pipe(
           catchError(this.handleError),
         );
 
   }
 
   deleteBranch(id: number) {
     return this.http
       .delete<any>(
         this.getBaseApiUrl() + `/x/api/v2/pos/branches/${id}`
       )
       .pipe(catchError(this.handleError));
   }

   addPaymentKeys(data: any){
    return this.http.post<any>(this.getBaseApiUrl() + '/x/api/v2/pos/paymentKeyss', data)
    .pipe(catchError(this.handleError));
   }

   getPaymentKeys(){
    return this.http.get<any>(this.getBaseApiUrl() + '/x/api/v2/pos/paymentKeyss')
    .pipe(catchError(this.handleError));
   }


  addDeliveryNote(data: any){
    return this.http.post<any>(this.getBaseApiUrl() + '/x/api/v2/pos/deliveryTypes', data)
    .pipe(catchError(this.handleError));
   }

  getDeliveryNote(){
    return this.http.get<any>(this.getBaseApiUrl() + '/x/api/v2/pos/deliveryTypes')
    .pipe(catchError(this.handleError));
   }

  getGender() {
    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/hr/genders')
      .pipe(catchError(this.handleError));
  }

  addGender(data: { id?: number; name: string; description?: string; code?: string }) {
    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/hr/genders', data)
      .pipe(catchError(this.handleError));
  }

  getMaritalStatus() {
    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/hr/maritalStatuses')
      .pipe(catchError(this.handleError));
  }

  addMaritalStatus(data: { id?: number; name: string; description?: string; code?: string }) {
    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/hr/maritalStatuses', data)
      .pipe(catchError(this.handleError));
  }

  getReligion() {
    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/hr/religions')
      .pipe(catchError(this.handleError));
  }

  addReligion(data: { id?: number; name: string; description?: string; code?: string }) {
    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/hr/religions', data)
      .pipe(catchError(this.handleError));
  }

  getDepartment() {
    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/hr/departments')
      .pipe(catchError(this.handleError));
  }

  addDepartment(data: { id?: number; name: string; description?: string; code?: string }) {
    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/hr/departments', data)
      .pipe(catchError(this.handleError));
  }

  getJobType() {
    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/hr/jobTypes')
      .pipe(catchError(this.handleError));
  }

  addJobType(data: { id?: number; name: string; description?: string; code?: string }) {
    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/hr/jobTypes', data)
      .pipe(catchError(this.handleError));
  }

  getRelationship() {
    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/hr/relationships')
      .pipe(catchError(this.handleError));
  }

  addRelationship(data: { id?: number; name: string; description?: string; code?: string }) {
    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/hr/relationships', data)
      .pipe(catchError(this.handleError));
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
