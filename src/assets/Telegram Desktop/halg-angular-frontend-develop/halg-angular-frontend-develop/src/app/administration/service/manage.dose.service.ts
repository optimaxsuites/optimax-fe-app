import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { DoseData } from '../domain/dose.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageDoseService {

  constructor(private http: HttpClient) { }

  createDose(data): Observable<any>{
    console.log(data);
    return this.http.post<DoseData>(this.getBaseApiUrl()+'postdrugdoseform',data);
  }

  getDoses():Observable<any>{
    return this.http.get<DoseData>(this.getBaseApiUrl()+'listdrugdoseforms');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}



