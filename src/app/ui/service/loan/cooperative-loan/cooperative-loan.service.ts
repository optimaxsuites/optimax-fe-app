
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';

export interface CooperativeMember {
  id: number;
  employeeId: number;
  status: string;
  cooperativeGroup: any[];
  contributionHistory: any[];
  loanHistory: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeLoanService {
  private baseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/cooperativeLoans';
  private memberUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/cooperativeMembers';

  constructor(private http: HttpClient) {}

  getAllLoans(): Observable<CooperativeLoan[]> {
    return this.http.get<CooperativeLoan[]>(`${this.baseUrl}`);
  }

  // Cooperative Member Endpoints
  getAllMembers(): Observable<CooperativeMember[]> {
    return this.http.get<CooperativeMember[]>(`${this.memberUrl}`);
  }

  getMemberById(id: number): Observable<CooperativeMember> {
    return this.http.get<CooperativeMember>(`${this.memberUrl}/${id}`);
  }

  createMember(payload: CooperativeMember): Observable<CooperativeMember> {
    return this.http.post<CooperativeMember>(`${this.memberUrl}`, payload);
  }

  updateMember(id: number, payload: CooperativeMember): Observable<CooperativeMember> {
    return this.http.put<CooperativeMember>(`${this.memberUrl}/${id}`, payload);
  }

  getLoanById(id: number): Observable<CooperativeLoan> {
    return this.http.get<CooperativeLoan>(`${this.baseUrl}/${id}`);
  }

  createLoan(payload: CooperativeLoan): Observable<CooperativeLoan> {
    return this.http.post<CooperativeLoan>(`${this.baseUrl}`, payload);
  }

  updateLoan(id: number, payload: any): Observable<CooperativeLoan> {
    return this.http.put<CooperativeLoan>(`${this.baseUrl}/${id}`, payload);
  }

  getLoanStats(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/stats`, payload);
  }
}
