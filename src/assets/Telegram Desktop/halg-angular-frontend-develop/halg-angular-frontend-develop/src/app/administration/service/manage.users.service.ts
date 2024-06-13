import { Injectable,isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { UserData, UserInformation } from '../domain/users.data';
import { environment } from '../../../environments/environment';



@Injectable({
  providedIn: 'root'
})
export class ManageUsersService {


  constructor(private http: HttpClient) { }

  createUpdateUser(data): Observable<any>{
    return this.http.post<UserData>(this.getBaseApiUrl()+'postusers',data);
  }

  createUserData(data): Observable<any> {
    return this.http.post<UserInformation>(this.getBaseApiUrl() + 'postusersinformation', data);
  }

  getUsers():Observable<any>{
    return this.http.get<UserData>(this.getBaseApiUrl()+'listusers');
  }

  updateUser(data){
    return this.http.post<UserData>(this.getBaseApiUrl()+'postusers',data);
  }

  getUser() {
    return this.http.get<any>(this.getBaseApiUrl()+'listusers')
    .toPromise()
    .then(res => res.data as UserData)
    .then(data => data);
}

private getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}
