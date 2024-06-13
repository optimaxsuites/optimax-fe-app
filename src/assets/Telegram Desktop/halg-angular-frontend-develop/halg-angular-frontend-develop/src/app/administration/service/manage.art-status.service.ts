import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { ArtStatusData } from '../domain/artstatus.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageArtStatusService{

  constructor(private http: HttpClient){ }

  createArtStatus(data): Observable<any>{
    console.log(data);
    return this.http.post<ArtStatusData>(this.getBaseApiUrl()+'postartstatus',data);
  }

  getArtStatus():Observable<any>{
    return this.http.get<ArtStatusData>(this.getBaseApiUrl()+'listartstatus');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}







