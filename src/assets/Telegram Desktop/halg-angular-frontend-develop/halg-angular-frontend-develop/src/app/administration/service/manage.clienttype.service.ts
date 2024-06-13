import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ClientTypeData } from '../domain/clienttype.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageClientTypeService{

  constructor(private http: HttpClient){ }

  createClientType(data): Observable<any>{
    console.log(data);
    return this.http.post<ClientTypeData>(this.getBaseApiUrl()+'postclienttype',data);
  }

  getClientType():Observable<any>{
    return this.http.get<ClientTypeData>(this.getBaseApiUrl()+'listclienttype');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}






