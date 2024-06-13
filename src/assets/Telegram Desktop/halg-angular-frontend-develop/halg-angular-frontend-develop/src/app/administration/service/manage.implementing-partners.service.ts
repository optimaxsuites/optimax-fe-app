import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ImplementingPartnersData } from '../domain/implementing-partners.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageImplementingPartnersService {

  constructor(private http: HttpClient) { }

  createImplementingPartners(data): Observable<any>{
    console.log(data);
    return this.http.post<ImplementingPartnersData>(this.getBaseApiUrl()+'postimplementingpartners',data);
  }

  getImplementingPartnerss():Observable<any>{
    return this.http.get<ImplementingPartnersData>(this.getBaseApiUrl()+'listimplementingpartners');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


