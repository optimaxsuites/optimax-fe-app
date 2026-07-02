import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError, Observable, of, tap } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment';
import { CompanyProfileService } from '../sharedComponents/service/company-profile/company-profile.service';

@Injectable({
  providedIn: 'root'
})
export class GeneralSettingsService {

  private baseUrl = environment.apiBaseUrl;
  
  private userApiUrl = `${this.baseUrl}/x/api/v2/us/ur/get/user/primary/info`;
  // private reportApiUrl = `${this.baseUrl}/x/api/v2/us/ur/get/settings/report`;
  private userUpdateApiUrl = `${this.baseUrl}/x/api/v2/us/ur/create/user/primary/info`; 

  constructor(private http: HttpClient, private companyProfileService: CompanyProfileService) {}

  getUserPrimaryInfo(userId: number): Observable<any> {
    const url = `${this.userApiUrl}/${userId}`;
    return this.http.get<any>(url);
  }

  // getSettingsReport(userId: number): Observable<any> {
  //   const url = `${this.reportApiUrl}/${userId}`;
  //   return this.http.get<any>(url);
  // }
  
  updateUserPrimaryInfo(id: number, userData: any): Observable<any> {
    // Strip nulls and send userId instead of id — backend validates against JWT identity
    const clean: any = {};
    for (const key of Object.keys(userData)) {
      if (userData[key] !== null && userData[key] !== undefined) {
        clean[key] = userData[key];
      }
    }
    const dataToSend = { userId: id, ...clean };
    console.log('[ProfileUpdate] Sending payload:', JSON.stringify(dataToSend, null, 2));
    return this.http.post<any>(this.userUpdateApiUrl, dataToSend).pipe(
      tap(() => this.companyProfileService.refresh()),
      catchError((error: HttpErrorResponse) => {
        console.error('[ProfileUpdate] Status:', error.status);
        console.error('[ProfileUpdate] StatusText:', error.statusText);
        console.error('[ProfileUpdate] Error body:', JSON.stringify(error.error));
        return throwError(() => new Error('Something bad happened; please try again later.'));
      })
    );
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