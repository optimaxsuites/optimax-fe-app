
import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { HeirarchyData } from '../domain/heirarchy.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageHeirarchyService {

  constructor(private http: HttpClient) { }

  createHierarchy(data): Observable<any> {
    console.log(data);
    return this.http.post<HeirarchyData>(this.getBaseApiUrl() + 'postheirarchy', data);
  }

  getHierarchy(): Observable<any> {
    return this.http.get<HeirarchyData>(this.getBaseApiUrl() + 'listheirarchies');
  }

  updateHierarchy(data) {
    return this.http.post<HeirarchyData>(this.getBaseApiUrl() + 'postheirarchy', data);
  }

  getHierarchyy() {
    return this.http.get<any>(this.getBaseApiUrl() + 'listheirarchies')
      .toPromise()
      .then(res => res.data as HeirarchyData)
      .then(data => data);
  }


  private getBaseApiUrl(): string {
    return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}
