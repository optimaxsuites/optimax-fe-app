import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';
import { HeirarchyUnitsData } from '../domain/heirarchyunits.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManageHeirarchyUnitService {

   

  constructor(private http: HttpClient) { }

  createHeirachyunit(data): Observable<any> {
    console.log(JSON.stringify(data));
    return this.http.post<HeirarchyUnitsData>(this.getBaseApiUrl() + 'postheirarchyunits', data);
  }

  getHeirachyunit(): Observable<any> {
    return this.http.get<HeirarchyUnitsData>(this.getBaseApiUrl() + 'listheirarchyunits');
  }

  updateHeirachyunit(data) {
    return this.http.post<HeirarchyUnitsData>(this.getBaseApiUrl() + 'postheirarchyunits', data);
  }

  getHeirachyunitt() {
    return this.http.get<any>(this.getBaseApiUrl() + 'listheirarchyunits')
      .toPromise()
      .then(res => res.data as HeirarchyUnitsData)
      .then(data => data);
  }

  

  getImport(importurl): Observable<any> {
  /* const httpOptions = {
      headers: new HttpHeaders({ 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*'
      })
    };*/
    return this.http.get<any>(importurl);
  }

  getData(importurl): Observable<any> {
    return from(
      fetch(
        importurl, // the url you are trying to access
        {
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'GET', // GET, POST, PUT, DELETE
          mode: 'no-cors' // the most important option
        }
      ));
  }

  private getBaseApiUrl(): string {
    return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  onstructor() { }
}
