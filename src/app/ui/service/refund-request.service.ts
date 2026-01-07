import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment';

export interface RefundRequest {
  id: number;
  transactionId: string;
  reasonForRefund: string;
  cashierComment: string;
  cashierId: string;
  refundMeans: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdDate: string;
  status?: string;
  refundAmount?: number;
  processedBy?: string;
  updatedDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RefundRequestService {
  private apiUrl = `${environment.apiBaseUrl}/x/api/v2/pos/refundRequests`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  // GET all refund requests
getRefundRequests(): Observable<RefundRequest[]> {
  return this.http.get<RefundRequest[]>(this.apiUrl, {
    headers: this.getHeaders()
  }).pipe(
    catchError(error => {
      console.error('Error fetching refund requests:', error);
      return of([]); // Return empty array on error
    })
  );
}

  // GET single refund request by ID
  getRefundRequestById(id: number): Observable<RefundRequest> {
    return this.http.get<RefundRequest>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // POST create new refund request
  createRefundRequest(refundRequest: Partial<RefundRequest>): Observable<RefundRequest> {
    return this.http.post<RefundRequest>(this.apiUrl, refundRequest, {
      headers: this.getHeaders()
    });
  }

  // PUT update refund request
  updateRefundRequest(id: number, refundRequest: Partial<RefundRequest>): Observable<RefundRequest> {
    return this.http.put<RefundRequest>(`${this.apiUrl}/${id}`, refundRequest, {
      headers: this.getHeaders()
    });
  }

  // DELETE refund request
  deleteRefundRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    });
  }

  // GET refund requests by customer (you might need to implement this endpoint)
  getRefundRequestsByCustomer(customerEmail: string): Observable<RefundRequest[]> {
    return this.http.get<RefundRequest[]>(`${this.apiUrl}/customer/${customerEmail}`, {
      headers: this.getHeaders()
    });
  }
}