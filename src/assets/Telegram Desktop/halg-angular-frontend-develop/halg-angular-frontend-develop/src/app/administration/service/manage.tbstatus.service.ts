import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { TbstatusData } from '../domain/tbstatus.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageTbstatusService {

  constructor(private http: HttpClient) { }

  createTbstatus(data): Observable<any>{
    return this.http.post<TbstatusData>(this.getBaseApiUrl()+'posttbstatus',data);
  }

  getTbstatuss():Observable<any>{
    return this.http.get<TbstatusData>(this.getBaseApiUrl()+'listtbstatus');
  }

  

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}

