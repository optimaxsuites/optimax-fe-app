// employee-loan.service.ts - NO LOCAL STORAGE
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../shared-component/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeLoanService {
        /**
         * Update a loan (approval, interest acceptance, etc.)
         * Endpoint: PUT /x/api/v2/hr/advanceLoans/{id}
         */
        updateLoan(id: number, source: any): Observable<any> {
          const token = sessionStorage.getItem('token');
          const tenantId = 'optimax';
          const payload = this.buildLoanUpdatePayload(source);
          // Debug: log the payload before sending
          console.log('Loan update payload:', JSON.stringify(payload, null, 2));
          return this.http.put<any>(`${this.baseUrl}/x/api/v2/hr/advanceLoans/${id}`, payload, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Tenant-ID': tenantId,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
        }
      /**
       * Build a payload for updating a loan (PUT) matching the new backend requirements.
       * All *_By fields must be numbers, not objects.
       */
      buildLoanUpdatePayload(source: any): any {
        const fields = [
          'id', 'loanCode', 'employeeId', 'monthlySalary', 'amount', 'approvedAmount', 'purpose',
          'repaymentAmount', 'repaymentTime', 'repaymentPeriodMonths', 'repaymentStartDate', 'repaymentDay',
          'modeOfPayment', 'interestRate', 'interestAgreement', 'totalRepayable', 'requestDate', 'approvedDate',
          'approvedBy', 'disbursedDate', 'disbursedBy', 'disbursementInitiatedAt', 'disbursementInitiatedBy',
          'disbursementInstructionReference', 'disbursementConfirmedAt', 'disbursementConfirmedBy',
          'disbursementReference', 'disbursedAmount', 'completedDate', 'rejectedDate', 'rejectedBy', 'status',
          'adminComment', 'currentBalance', 'totalPaid', 'totalPrincipalPaid', 'totalInterestPaid',
          'totalLateFeesAccrued', 'totalLateFeesPaid', 'outstandingPrincipal', 'outstandingInterest',
          'outstandingBalance', 'lastPaymentReceived', 'lastPaymentAmount', 'nextPaymentDueDate',
          'skippedPaymentsCount', 'overduePaymentsCount', 'employeeBankName', 'employeeAccountNumber',
          'statusBeforeOverride', 'gracePeriodRequests', 'repaymentSchedule', 'paymentHistory', 'statusHistory'
        ];
        const payload: any = {};
        function extractId(val: any): number {
          if (typeof val === 'number') return val;
          if (val && typeof val === 'object' && val.id) return val.id;
          if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val, 10);
          return 0;
        }
        fields.forEach((field) => {
          // *_By fields must be numbers
          if ([
            'approvedBy', 'disbursedBy', 'disbursementInitiatedBy', 'disbursementConfirmedBy', 'rejectedBy'
          ].includes(field)) {
            payload[field] = extractId(source[field]);
          } else {
            payload[field] = source[field];
          }
        });
        // Ensure nested arrays are passed as-is
        if (Array.isArray(source.gracePeriodRequests)) payload.gracePeriodRequests = source.gracePeriodRequests;
        if (Array.isArray(source.repaymentSchedule)) payload.repaymentSchedule = source.repaymentSchedule;
        if (Array.isArray(source.paymentHistory)) payload.paymentHistory = source.paymentHistory;
        // Deep sanitize statusHistory: ensure id, changedBy, overrideBy are correct
        if (Array.isArray(source.statusHistory)) {
          let nextId = 1;
          payload.statusHistory = source.statusHistory.map((item: any) => {
            const newItem: any = { ...item };
            // Always assign/generate id
            if (typeof item.id !== 'undefined' && item.id !== null) {
              newItem.id = item.id;
            } else {
              newItem.id = nextId++;
            }
            // Always convert changedBy/overrideBy to numbers
            if ('changedBy' in newItem) {
              newItem.changedBy = extractId(newItem.changedBy);
            }
            if ('overrideBy' in newItem) {
              newItem.overrideBy = extractId(newItem.overrideBy);
            }
            // Remove changedBy/overrideBy if undefined
            if (typeof newItem.changedBy === 'undefined') delete newItem.changedBy;
            if (typeof newItem.overrideBy === 'undefined') delete newItem.overrideBy;
            return newItem;
          });
        }
        // Extra debug log for verification
        console.log('[DEBUG] Final loan update payload:', JSON.stringify(payload, null, 2));
        return payload;
      }
    /**
     * Retrieve all loans from the backend (GET /x/api/v2/hr/advanceLoans)
     */
    getAllLoans(): Observable<any[]> {
      const token = sessionStorage.getItem('token');
      const tenantId = 'optimax';
      return this.http.get<any[]>(`${this.baseUrl}/x/api/v2/hr/advanceLoans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
          'Accept': 'application/json'
        }
      });
    }

    /**
     * Retrieve a single loan by ID from the backend (GET /x/api/v2/hr/advanceLoans/{id})
     */
    getLoanById(id: number): Observable<any> {
      const token = sessionStorage.getItem('token');
      const tenantId = 'optimax';
      return this.http.get<any>(`${this.baseUrl}/x/api/v2/hr/advanceLoans/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
          'Accept': 'application/json'
        }
      });
    }
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getSalaryByEmployeeId(employeeId: number): Observable<any> {
    const token = sessionStorage.getItem('token');
    const tenantId = 'optimax';
    
    console.log('GET salary:', `${this.baseUrl}/x/api/v2/hr/salaries/${employeeId}`);
    
    return this.http.get<any>(`${this.baseUrl}/x/api/v2/hr/salaries/${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Accept': 'application/json'
      }
    });
  }

  getEmployeeById(employeeId: number): Observable<any> {
    const token = sessionStorage.getItem('token');
    const tenantId = 'optimax';
    
    return this.http.get<any>(`${this.baseUrl}/x/api/v2/hr/employees/${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Accept': 'application/json'
      }
    });
  }

    /**
   * Retrieve all employee levels from the backend (GET /x/api/v2/hr/levels)
   */
  getAllLevels(): Observable<any[]> {
    const token = sessionStorage.getItem('token');
    const tenantId = 'optimax';
    return this.http.get<any[]>(`${this.baseUrl}/x/api/v2/hr/levels`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Accept': 'application/json'
      }
    });
  }
  
}