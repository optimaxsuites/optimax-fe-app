import { Injectable, isDevMode  } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { PriorArtData, ModeOfHivTestData } from '../domain/priorart.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManagePriorartService {

  constructor(private http: HttpClient) { }

  createpriorart(data): Observable<any>{
    console.log(data);
    return this.http.post<PriorArtData>(this.getBaseApiUrl()+'postpriorart',data);
  }


  confirm(confirmation: PriorArtData) {};


  getpriorarts():Observable<any>{
    return this.http.get<PriorArtData>(this.getBaseApiUrl()+'listpriorart');
  }



  //Mode Of Hiv Test

  createModeOfHivTest(data): Observable<any>{
    console.log(data);
    return this.http.post<ModeOfHivTestData>(this.getBaseApiUrl()+'posthivtestmodes',data);
  }

  getModeOfHivTests():Observable<any>{
    return this.http.get<ModeOfHivTestData>(this.getBaseApiUrl()+'listhivtestmodes');
  }


protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


