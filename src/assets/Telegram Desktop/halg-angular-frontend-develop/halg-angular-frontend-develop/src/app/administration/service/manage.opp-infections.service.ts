import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { OppInfectionsData } from '../domain/oppinfections.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageOppInfectionsService{

  constructor(private http: HttpClient){ }

  createOppInfections(data): Observable<any>{
    console.log(data);
    return this.http.post<OppInfectionsData>(this.getBaseApiUrl()+'postopportunisticinfections',data);
  }

  getOppInfections():Observable<any>{
    return this.http.get<OppInfectionsData>(this.getBaseApiUrl()+'listopportunisticinfections');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}








