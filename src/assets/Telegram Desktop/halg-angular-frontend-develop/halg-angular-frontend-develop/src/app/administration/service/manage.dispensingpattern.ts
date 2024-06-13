import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { DispensingPatternData } from '../domain/dispensingpattern.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageDispensingPatternService{

  constructor(private http: HttpClient){ }

  createDispensingPattern(data): Observable<any>{
    console.log(data);
    return this.http.post<DispensingPatternData>(this.getBaseApiUrl()+'postdrugdispensepattern',data);
  }

  getDispensingPattern():Observable<any>{
    return this.http.get<DispensingPatternData>(this.getBaseApiUrl()+'listdrugdispensepattern');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


