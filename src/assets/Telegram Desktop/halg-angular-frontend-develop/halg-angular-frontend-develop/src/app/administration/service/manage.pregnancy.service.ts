import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { PregnancyData } from '../domain/pregnancy.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManagePregnancyService {
    getOpportunisticInfections() {
        throw new Error('Method not implemented.');
    }
    getopportunisticInfections() {
        throw new Error('Method not implemented.');
    }

  constructor(private http: HttpClient) { }

  createPregnancy(data): Observable<any>{
    console.log(data);
    return this.http.post<PregnancyData>(this.getBaseApiUrl()+'postpregnancy',data);
  }

  getPregnancys():Observable<any>{
    return this.http.get<PregnancyData>(this.getBaseApiUrl()+'listpregnancy');
  }


protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}



