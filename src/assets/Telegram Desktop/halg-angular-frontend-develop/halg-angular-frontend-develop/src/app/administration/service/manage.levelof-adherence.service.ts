import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { LevelofAdherenceData } from '../domain/levelofadherence.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageLevelofAdherenceService{

  constructor(private http: HttpClient){ }

  createLevelofAdherence(data): Observable<any>{
    console.log(data);
    return this.http.post<LevelofAdherenceData>(this.getBaseApiUrl()+'postlevelofadherence',data);
  }

  getLevelofAdherence():Observable<any>{
    return this.http.get<LevelofAdherenceData>(this.getBaseApiUrl()+'listlevelofadherence');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}








