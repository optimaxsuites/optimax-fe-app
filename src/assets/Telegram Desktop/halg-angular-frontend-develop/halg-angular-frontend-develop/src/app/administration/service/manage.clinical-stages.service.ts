import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ClinicalStagesData } from '../domain/clinicalstage.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageClinicalStagesService{

  constructor(private http: HttpClient){ }

  createClinicalStage(data): Observable<any>{
    console.log(data);
    return this.http.post<ClinicalStagesData>(this.getBaseApiUrl()+'postclinicalstages',data);
  }

  getClinicalStage():Observable<any>{
    return this.http.get<ClinicalStagesData>(this.getBaseApiUrl()+'listclinicalstages');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


