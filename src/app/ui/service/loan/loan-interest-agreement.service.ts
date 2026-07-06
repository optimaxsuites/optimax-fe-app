import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdvanceLoanInterestAgreement } from '../../domain/loan/advance-loan.dto';

@Injectable({
  providedIn: 'root'
})
export class AdvanceInterestAgreementService {
  private readonly baseUrl = 'https://be.optimaxsuites.com/x/api/v2/hr/advanceLoans';

  constructor(private http: HttpClient) {}

  getAgreementByLoanId(loanId: number): Observable<AdvanceLoanInterestAgreement | null> {
    return this.http
      .get<AdvanceLoanInterestAgreement>(`${this.baseUrl}/${loanId}/interestAgreement`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }
          console.error('Failed to fetch interest agreement for loan', loanId, error);
          return of(null);
        })
      );
  }

  updateAgreement(
    id: number,
    data: Partial<AdvanceLoanInterestAgreement>
  ): Observable<AdvanceLoanInterestAgreement> {
    return this.http
      .put<AdvanceLoanInterestAgreement>(
        `${this.baseUrl}/interestAgreements/${id}`,
        data
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Failed to update interest agreement', id, error);
          throw error;
        })
      );
  }
}
