import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { HivStatusAtRegistrationData } from '../domain/hivstatusatregistration.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManageHivstatusatregistrationService {

  constructor(private http: HttpClient) { }

  createHivStatusAtRegistration(data): Observable<any>{
    console.log(data);
    return this.http.post<HivStatusAtRegistrationData>(this.getBaseApiUrl()+'posthivstatusatregistration',data);
  }

  getHivStatusAtRegistrations():Observable<any>{
    return this.http.get<HivStatusAtRegistrationData>(this.getBaseApiUrl()+'listhivstatusatregistration');
  }

  updateHivStatusAtRegistration(data){
    return this.http.post<HivStatusAtRegistrationData>(this.getBaseApiUrl()+'posthivstatusatregistration',data);
  }

  getHivStatusAtRegistration() {
    return this.http.get<any>(this.getBaseApiUrl()+'listhivstatusatregistration')
    .toPromise()
    .then(res => res.data as HivStatusAtRegistrationData)
    .then(data => data);
}

private getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}

