import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { DisabilityData } from '../domain/disability.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageDisabilityService {

  constructor(private http: HttpClient) { }

  createDisability(data): Observable<any>{
    console.log(data);
    return this.http.post<DisabilityData>(this.getBaseApiUrl()+'postdisabilities',data);
  }

  getDisabilitys():Observable<any>{
    return this.http.get<DisabilityData>(this.getBaseApiUrl()+'listdisabilities');
  }

  deleteDisability(data): Observable<any> {
    return this.http.delete<DisabilityData[]>(this.getBaseApiUrl()+'removedisabilities'+data);
   }


protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


