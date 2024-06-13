import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { FunctionalStatusData } from '../domain/functionalstatus.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageFunctionalStatusService{

  constructor(private http: HttpClient){ }

  createFunctionalStatus(data): Observable<any>{
    console.log(data);
    return this.http.post<FunctionalStatusData>(this.getBaseApiUrl()+'postfunctionalstatus',data);
  }

  getFunctionalStatus():Observable<any>{
    return this.http.get<FunctionalStatusData>(this.getBaseApiUrl()+'listfunctionalstatus');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


