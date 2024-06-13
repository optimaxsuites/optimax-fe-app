import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ConfirmSampleData } from '../domain/confirmsampledata.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageConfirmsampleService {

  constructor(private http: HttpClient) { }

  createConfirmSample(data): Observable<any>{
    console.log(data);
    return this.http.post<ConfirmSampleData>(this.getBaseApiUrl()+'postConfirmSamples',data);
  }

  getConfirmSamples():Observable<any>{
    return this.http.get<ConfirmSampleData>(this.getBaseApiUrl()+'listConfirmSamples');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}



