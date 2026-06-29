import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError, Observable, of } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeneralSettingsService {

  private baseUrl = environment.apiBaseUrl;
  
  private userApiUrl = `${this.baseUrl}/x/api/v2/us/ur/get/user/primary/info`;
  // private reportApiUrl = `${this.baseUrl}/x/api/v2/us/ur/get/settings/report`;
  private userUpdateApiUrl = `${this.baseUrl}/x/api/v2/us/ur/create/user/primary/info`; 

  constructor(private http: HttpClient) { }

  getUserPrimaryInfo(userId: number): Observable<any> {
    const url = `${this.userApiUrl}/${userId}`;
    return this.http.get<any>(url);
  }

  // getSettingsReport(userId: number): Observable<any> {
  //   const url = `${this.reportApiUrl}/${userId}`;
  //   return this.http.get<any>(url);
  // }
  
  // Method to update user data using POST
  updateUserPrimaryInfo(id: number, userData: any): Observable<any> {
    const url = this.userUpdateApiUrl; 
    const dataToSend = { id, ...userData };
    return this.http.post<any>(url, dataToSend).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.error);
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }

  getCountries(): Observable<any[]> {
    return of([]);
  }

  getIndustries(): Observable<any[]> {
    return of([]);
  }

  getCurrencies(): Observable<any[]> {
    return of([]);
  }

  getTimeZones(): Observable<any[]> {
    return of([]);
  }
}