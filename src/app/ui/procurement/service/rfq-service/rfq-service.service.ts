import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject, catchError, Observable, throwError } from 'rxjs';
import { RfqDTO } from '../../domain/procurement.dto';
import { environment } from 'src/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class RfqServiceService { // Replace with your actual API URL

  constructor(private http: HttpClient) {}

  // Get all RFQs
  getAllRfqs(): Observable<RfqDTO[]> {
    return this.http.get<RfqDTO[]>(this.getBaseApiUrl() + "/x/api/v2/").pipe(catchError(this.handleError));
  }

  // Get RFQ by ID
  getRfqById(id: string): Observable<RfqDTO> {
    return this.http.get<RfqDTO>(this.getBaseApiUrl() + `/x/api/v2//${id}`).pipe(catchError(this.handleError));
  }

  // Update RFQ
  updateRfq(rfqData: RfqDTO): Observable<RfqDTO> {
    return this.http.put<RfqDTO>(this.getBaseApiUrl() + "/x/api/v2/", rfqData).pipe(catchError(this.handleError));
  }

  // Create a new RFQ (if needed)
  createRfq(rfqData: RfqDTO): Observable<RfqDTO> {
    return this.http.post<RfqDTO>(this.getBaseApiUrl() + "/x/api/v2/", rfqData).pipe(catchError(this.handleError));
  }

  // Delete RFQ (if needed)
  deleteRfq(id: string): Observable<void> {
    return this.http.delete<void>(this.getBaseApiUrl() + `/x/api/v2//${id}`).pipe(catchError(this.handleError));
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






























  // private itemSubject: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  // getItem1(): Observable<any[]> {
  //   return this.itemSubject.asObservable();
  // }

  // addItem(item: any) {
  //   const currentItem = this.itemSubject.value;
  //   item.id = Date.now().toString();
  //   this.itemSubject.next([...currentItem, item]);
  // }

  // updateItem(item: any) {
  //   const currentItem = this.itemSubject.value.map(i => (i.id === item.id ? item : i));
  //   this.itemSubject.next(currentItem);
  // }

  // deleteItem(id: string) {
  //   const currentItem = this.itemSubject.value.filter(i => i.id !== id);
  //   this.itemSubject.next(currentItem);
  // }

  // getItemById1(id: string): any {
  //   return this.itemSubject.value.find(i => i.id === id);
  // }
}
