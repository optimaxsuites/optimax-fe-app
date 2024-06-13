import { Injectable, isDevMode } from '@angular/core';
import { HttpClient,HttpHeaders } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, delay, retry, timeout } from 'rxjs/operators';
import { UserAuthData, UserData } from '../domain/users.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserAuthenticationService {
  
  constructor(private http: HttpClient) { }

getUserByUsernamePassword(username:string,password:string): Observable<any> {
  return this.http.get<UserAuthData>(this.getBaseApiUrl()+'userlogin?username='+username+'&password='+password);
  //.pipe(retry(3),
  //catchError(this.handleError)
  //);
  
}
userLogin(data): Observable<any>{
  console.log("Got data ")
  return this.http.post<UserAuthData>(this.getBaseApiUrl()+'authenticate',data).pipe(catchError(this.handleError));
  //return this.http.post<UserAuthData>(this.getBaseApiUrl()+'authenticate',data).pipe(delay(3000) ,timeout(4000), catchError(this.handleError));
}



private handleError(error: HttpErrorResponse) {
  if (error.error instanceof ErrorEvent) {
    console.error('An error occurred:', error.error.message);
  } else {
    console.error(
      `Backend returned code ${error.status}, ` +
      `body was: ${JSON.stringify(error.error)}`);
  }
  return throwError(
    `${error.status}`); 
   // 'Something bad happened; please try again later.');
}

private getBaseApiUrl(): string {
return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
}

}
