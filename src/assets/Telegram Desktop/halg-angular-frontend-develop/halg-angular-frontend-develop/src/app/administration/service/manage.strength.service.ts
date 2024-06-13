import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { StrengthData } from '../domain/strength.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageStrengthService {

  constructor(private http: HttpClient) { }

  createStrength(data): Observable<any>{
    console.log(data);
    return this.http.post<StrengthData>(this.getBaseApiUrl()+'poststrength',data);
  }

  getStrengths():Observable<any>{
    return this.http.get<StrengthData>(this.getBaseApiUrl()+'liststrength');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


