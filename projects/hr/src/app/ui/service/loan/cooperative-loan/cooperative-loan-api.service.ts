import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

// Minimal type stubs for API compatibility
export type CooperativeLoanApiMemberRef = any;
export type CooperativeGroupApiResponse = any;
export type CooperativeLoanApiResponse = any;
export type CooperativeLoanApiCreatePayload = any;
export type CooperativeLoanApiUpdatePayload = any;
export type CooperativeLoanApiMemberPayload = any;

@Injectable({ providedIn: 'root' })
export class CooperativeLoanApiService {
  getAllMembers(): Observable<CooperativeLoanApiMemberRef[]> {
    return of([]); // Stub: replace with real API call
  }
  createMember(payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    return of({} as CooperativeLoanApiMemberRef);
  }
  updateMember(id: number, payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    return of({} as CooperativeLoanApiMemberRef);
  }
  getMemberById(id: number): Observable<CooperativeLoanApiMemberRef> {
    return of({} as CooperativeLoanApiMemberRef);
  }
  getAllLoans(): Observable<CooperativeLoanApiResponse[]> {
    return of([]); // Stub: replace with real API call
  }
  createLoan(payload: CooperativeLoanApiCreatePayload): Observable<CooperativeLoanApiResponse> {
    return of({} as CooperativeLoanApiResponse);
  }
  updateLoan(id: number, payload: CooperativeLoanApiUpdatePayload): Observable<CooperativeLoanApiResponse> {
    return of({} as CooperativeLoanApiResponse);
  }
  getLoanById(id: number): Observable<CooperativeLoanApiResponse> {
    return of({} as CooperativeLoanApiResponse);
  }
}

