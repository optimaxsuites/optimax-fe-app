import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, Observable, throwError } from 'rxjs';
import { NavigationLinksService } from 'src/app/ui/shared/service/navigation-links/navigation-links.service';
import { environment } from 'src/environments/environment.prod';
import { QuotationDTO } from '../../domain/quotation.dto';

@Injectable({
  providedIn: 'root'
})
export class QuotationService {

  constructor(private http: HttpClient, private navigationLink: NavigationLinksService, private router: Router) {  }



  createQuotation(data: any): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/sales/quotation"+"---"+JSON.stringify(data)))

    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/sales/quotation", data)
        .pipe(catchError(this.handleError));
  }

  getQuotation(data: string): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/sales/quotation"+"---"+JSON.stringify(data)))

    return this.http
        .get<any>( this.getBaseApiUrl() + "/x/api/v2/sales/quotation" )
        .pipe(catchError(this.handleError));
  }

  getQuotationById (id: string): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/sales/quotation"+"---"+JSON.stringify(id)))

    return this.http
        .get<any>( this.getBaseApiUrl() + `/x/api/v2/sales/quotation/${id}`)
        .pipe(catchError(this.handleError));
  }

  deleteQuotationById (id: string): Observable<any> {
    return this.http
    .delete<any>( this.getBaseApiUrl() + `/x/api/v2/sales/quotation/${id}` )
    .pipe(catchError(this.handleError));
  }

  updateQuotationById(id: string, quotation: QuotationDTO): Observable<any> {
    return this.http
    .put<any>( this.getBaseApiUrl() + `/x/api/v2/sales/quotation/${id}`, quotation )
    .pipe(catchError(this.handleError));
  }



















  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  
  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
        console.error("An error occurred:", error.error.message);
    } else {
        console.error(
            `Backend returned code ${error.status}, ` +
                `body was: ${JSON.stringify(error.error)}`
        );
    }
    return throwError(`${error.status}`);
    // 'Something bad happened; please try again later.');
  }
































  private itemSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  getItem(): Observable<any[]> {
    return this.itemSubject.asObservable();
  }

  addItem(item: any) {
    const currentItem = this.itemSubject.value;
    item.id = Date.now().toString();
    this.itemSubject.next([...currentItem, item]);
  }

  updateItem(item: any) {
    const currentItem = this.itemSubject.value.map(i => (i.id === item.id ? item : i));
    this.itemSubject.next(currentItem);
  }

  deleteItem(id: string) {
    const currentItem = this.itemSubject.value.filter(i => i.id !== id);
    this.itemSubject.next(currentItem);
  }

  getItemById(id: string): any {
    return this.itemSubject.value.find(i => i.id === id);
  }
}
