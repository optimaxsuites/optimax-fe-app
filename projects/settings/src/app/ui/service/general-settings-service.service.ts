import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError, Observable, of, tap } from 'rxjs';
import { environment } from '../sharedComponents/service/environments/environment';
import { CompanyProfileService } from '../sharedComponents/service/company-profile/company-profile.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class GeneralSettingsService {

  private baseUrl = environment.apiBaseUrl;
  
  private userApiUrl = `${this.baseUrl}/x/api/v2/us/ur/get/user/primary/info`;
  private userUpdateApiUrl = `${this.baseUrl}/x/api/v2/us/ur/create/user/primary/info`;

  constructor(
    private http: HttpClient,
    private companyProfileService: CompanyProfileService,
    private jwtHelper: JwtHelperService,
  ) {}

  getUserPrimaryInfo(userId: number): Observable<any> {
    const url = `${this.userApiUrl}/${userId}`;
    return this.http.get<any>(url);
  }

  // getSettingsReport(userId: number): Observable<any> {
  //   const url = `${this.reportApiUrl}/${userId}`;
  //   return this.http.get<any>(url);
  // }
  
  updateUserPrimaryInfo(id: number, userData: any): Observable<any> {
    const clean: any = {};
    for (const key of Object.keys(userData)) {
      if (userData[key] !== null && userData[key] !== undefined) {
        clean[key] = userData[key];
      }
    }

    // Decode JWT to get the actual user ID the backend issued the token for
    const token = sessionStorage.getItem('Token');
    let jwtId: number | null = null;
    if (token) {
      try {
        const decoded = this.jwtHelper.decodeToken(token);
        console.log('[JWT claims]', decoded);
        jwtId = decoded?.id ?? decoded?.userId ?? decoded?.user_id ?? decoded?.sub ?? null;
        if (jwtId) jwtId = +jwtId;
      } catch { /* ignore decode failures */ }
    }

    const resolvedId = jwtId || id;
    return this.http.post<any>(this.userUpdateApiUrl, { id: resolvedId, ...clean }).pipe(
      tap(() => this.companyProfileService.refresh()),
      catchError((error: HttpErrorResponse) => {
        const msg = error.error?.message || error.message || 'Something went wrong. Please try again.';
        return throwError(() => new Error(msg));
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