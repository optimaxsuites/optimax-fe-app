
import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../shared-component/service/environments/environment.prod';

export interface CooperativeLoanApiEmployeeRef {
  id: number;
  firstName?: string;
  lastName?: string;
  dob?: string;
  email?: string;
  workEmail?: string;
  phone?: string;
  address?: string;
  jobTitle?: string;
  supervisor?: string;
  bankName?: string;
  accountNumber?: string;
  nin?: string;
  bvn?: string;
  employeeStatus?: string;
  employementStartDate?: string;
  employmentEndDate?: string;
  onProbation?: boolean;
  probationStartDate?: string;
  probationEndDate?: string;
  appraisalDueDate?: string;
  userId?: number;
  jobType?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
  };
  gender?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
  };
  relationship?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
  };
  religion?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
  };
  maritalStatus?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
  };
  department?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
  };
  employeeMedia?: {
    id: number;
    name?: string;
    url?: string;
    mediaNo?: string;
  };
  level?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
  };
}

export interface CooperativeLoanApiContributionHistory {
  id?: number;
  member?: string;
  amount?: number;
  date?: string;
}

export interface CooperativeLoanApiGuarantorRef {
  id?: number;
  memberId?: number | string;
  fullName?: string;
  status?: string;
  guaranteedAmount?: number;
  requestedAt?: string;
  decidedAt?: string;
  note?: string;
  employee?: CooperativeLoanApiEmployeeRef;
}

export interface CooperativeLoanApiGroupRef {
  id: number;
  code?: string;
  name?: string;
  monthlyAmount?: number;
  members?: CooperativeLoanApiEmployeeRef[];
  memberLimit?: number;
  withdrawCap?: number;
  interestRate?: number;
  currentBalance?: number;
  contributionHistory?: CooperativeLoanApiContributionHistory[];
  loanHistory?: CooperativeLoanApiResponse[];
  status?: string;
  description?: string;
  patronageRate?: number;
  patronageAmount?: number;
}

export interface CooperativeLoanApiMemberRef {
  id: number;
  employeeId?: number;
  status?: string;
  employee?: CooperativeLoanApiEmployeeRef;
  cooperativeGroup?: CooperativeLoanApiGroupRef[];
  contributionHistory?: CooperativeLoanApiContributionHistory[];
  loanHistory?: CooperativeLoanApiResponse[];
}

export interface CooperativeLoanApiMemberPayload {
  id: number;
  employeeId: number;
  status: string;
  cooperativeGroup: CooperativeLoanApiGroupRef[];
  contributionHistory: CooperativeLoanApiContributionHistory[];
  loanHistory: CooperativeLoanApiResponse[];
}

export interface CooperativeLoanApiStatusHistory {
  id?: number;
  status?: string;
  changedAt?: string;
  changedBy?: any;
  notes?: string;
  overrideOpen?: boolean;
  overrideBy?: any;
  overrideReason?: string;
  statusBeforeOverride?: string;
}

export interface CooperativeLoanApiPaymentHistory {
  id?: number;
  installmentNo?: number;
  paidAt?: string;
  amount?: number;
  paymentMethod?: string;
  modeofPayment?: string;
  referenceNumber?: string;
  interest?: number;
  remainingBalance?: number;
  status?: string;
  lateFeeAmount?: number;
  totalPayment?: number;
  notes?: string;
  receiptNumber?: string;
}

export interface CooperativeLoanApiResponse {
  id: number;
  loanCode?: string;
  cooperativeMemberId?: CooperativeLoanApiMemberRef | number | string;
  cooperativeGroupId?: CooperativeLoanApiGroupRef | number | string;
  amount?: number;
  purpose?: string;
  repaymentAmount?: number;
  repaymentTime?: number;
  modeOfPayment?: string;
  requestDate?: string;
  approvedDate?: string;
  disbursedDate?: string;
  completedDate?: string;
  rejectedDate?: string;
  status?: string;
  adminComment?: string;
  applicationStage?: string;
  guarantors?: CooperativeLoanApiGuarantorRef | CooperativeLoanApiGuarantorRef[] | null;
  guarantorApproval?: boolean;
  totalPaid?: number;
  totalPrincipalPaid?: number;
  totalInterestPaid?: number;
  outstandingPrincipal?: number;
  paymentHistory?: CooperativeLoanApiPaymentHistory[];
  statusHistory?: CooperativeLoanApiStatusHistory[];
}

export interface CooperativeLoanApiUpdatePayload {
  id: number;
  loanCode?: string;
  cooperativeMemberId: number;
  cooperativeGroupId: number;
  amount: number;
  purpose: string;
  repaymentAmount: number;
  repaymentTime: number;
  modeOfPayment: string;
  requestDate?: string;
  approvedDate?: string;
  disbursedDate?: string;
  completedDate?: string;
  rejectedDate?: string;
  status: string;
  adminComment?: string;
  applicationStage?: string;
  guarantorsId?: number;
  guarantorApproval?: boolean;
  totalPaid?: number;
  totalPrincipalPaid?: number;
  totalInterestPaid?: number;
  outstandingPrincipal?: number;
  paymentHistory?: CooperativeLoanApiPaymentHistory[];
  statusHistory?: CooperativeLoanApiStatusHistory[];
}

export interface CooperativeLoanApiCreatePayload extends Omit<CooperativeLoanApiUpdatePayload, 'cooperativeMemberId' | 'cooperativeGroupId'> {
  cooperativeMemberId: { id: number };
  cooperativeGroupId: { id: number };
}

export interface CooperativeLoanStatsResponse {
  totalRecord?: number;
  totalPending?: number;
  totalApproved?: number;
  totalRejected?: number;
  totalActive?: number;
  totalCompleted?: number;
  totalDefaulted?: number;
  totalOverdueInstallments?: number;
  totalCreditReported?: number;
  totalOverride?: number;
  totalLoanAmount?: number;
  totalOutstanding?: number;
  totalPaid?: number;
  avgInterestRate?: number;
  cooperativeLoans?: CooperativeLoanApiResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class CooperativeLoanApiService {
  private readonly baseUrl = `${this.getBaseApiUrl()}/x/api/v2/hr/cooperativeLoans`;
  private readonly memberUrl = `${this.getBaseApiUrl()}/x/api/v2/hr/cooperativeMembers`;

  constructor(private http: HttpClient) {}

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  getAllLoans(): Observable<CooperativeLoanApiResponse[]> {
    return this.http.get<CooperativeLoanApiResponse[]>(`${this.baseUrl}`);
  }

  getAllMembers(): Observable<CooperativeLoanApiMemberRef[]> {
    return this.http.get<CooperativeLoanApiMemberRef[]>(`${this.memberUrl}`);
  }

  getMemberById(id: number): Observable<CooperativeLoanApiMemberRef> {
    return this.http.get<CooperativeLoanApiMemberRef>(`${this.memberUrl}/${id}`);
  }

  createMember(payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    return this.http.post<CooperativeLoanApiMemberRef>(`${this.memberUrl}`, payload);
  }

  updateMember(id: number, payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    return this.http.put<CooperativeLoanApiMemberRef>(`${this.memberUrl}/${id}`, payload);
  }

  getLoanById(id: number): Observable<CooperativeLoanApiResponse> {
    return this.http.get<CooperativeLoanApiResponse>(`${this.baseUrl}/${id}`);
  }

  createLoan(payload: CooperativeLoanApiCreatePayload): Observable<CooperativeLoanApiResponse> {
    return this.http.post<CooperativeLoanApiResponse>(`${this.baseUrl}`, payload);
  }

  updateLoan(id: number, payload: CooperativeLoanApiUpdatePayload): Observable<CooperativeLoanApiResponse> {
    return this.http.put<CooperativeLoanApiResponse>(`${this.baseUrl}/${id}`, payload);
  }

  getLoanStats(payload: Record<string, unknown> = {}): Observable<CooperativeLoanStatsResponse> {
    return this.http.post<CooperativeLoanStatsResponse>(`${this.baseUrl}/stats`, payload);
  }
}
