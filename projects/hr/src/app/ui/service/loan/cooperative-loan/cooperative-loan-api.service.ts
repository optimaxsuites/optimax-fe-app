import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../shared-component/service/environments/environment.prod';
import { getTokenFromStorage } from './token-util';

export interface CooperativeLoanApiAuditUser {
  id: number;
  fullname: string;
  userId: number;
  email: string;
  phoneNumber: string;
  username: string;
  clientType: string;
  gender: string;
  accountId: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface CooperativeLoanApiMemberRef {
  id: number;
  fullName?: string;
  fullname?: string;
  name?: string;
  memberId?: number;
  employeeId?: number;
  monthlySalary?: number;
  status?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
  cooperativeGroup?: unknown[];
  contributionHistory?: unknown[];
  loanHistory?: unknown[];
  employee?: {
    id?: number;
    firstName?: string;
    firstname?: string;
    lastName?: string;
    lastname?: string;
    fullName?: string;
    fullname?: string;
    name?: string;
    email?: string;
    workEmail?: string;
    phone?: string;
    address?: string;
    userId?: number;
  };
}

export interface CooperativeGroupApiContributionHistory {
  id?: number;
  member?: unknown;
  amount?: number;
  date?: string;
}

export interface CooperativeGroupApiResponse {
  id: number;
  groupId?: number;
  code?: string;
  name?: string;
  monthlyAmount?: number;
  memberIds?: number[];
  memberLimit?: number;
  withdrawCap?: number;
  interestRate?: number;
  currentBalance?: number;
  contributionHistory?: CooperativeGroupApiContributionHistory[];
  loanHistory?: unknown[];
  status?: string;
  description?: string;
  patronageRate?: number;
  patronageAmount?: number;
  requiresGuarantors?: boolean;
  minimumGuarantors?: number;
  minMemberTenureMonths?: number;
  contributionsBankName?: string;
  contributionsAccount?: string;
  principalBankName?: string;
  principalCollectionAccount?: string;
  interestBankName?: string;
  interestCollectionAccount?: string;
  lateFeePercentage?: number;
  lateFeeGraceDays?: number;
  lateFeeBankName?: string;
  lateFeeCollectionAccount?: string;
  accountingEmail?: string;
  accountingWebhookUrl?: string;
}

export interface CooperativeLoanApiResponse {
  id: number;
  loanCode?: string;
  cooperativeMemberId?: CooperativeLoanApiMemberRef | number | string;
  cooperativeGroupId?: CooperativeGroupApiResponse | number | string;
  membershipId?: number;
  amount?: number;
  purpose?: string;
  approvedAmount?: number;
  repaymentAmount?: number;
  repaymentTime?: number;
  lateFeePercentage?: number;
  lateFeeGraceDays?: number;
  repaymentStartDate?: string;
  repaymentDay?: number;
  modeOfPayment?: string;
  requestDate?: string;
  approvedDate?: string;
  approvedBy?: number | CooperativeLoanApiAuditUser;
  disbursedDate?: string;
  disbursementInitiatedAt?: string;
  disbursementInitiatedBy?: number | CooperativeLoanApiAuditUser;
  disbursementInstructionLoanReference?: string;
  disbursementConfirmedAt?: string;
  disbursementConfirmedBy?: number | CooperativeLoanApiAuditUser;
  disbursementReference?: string;
  disbursedAmount?: number;
  completedDate?: string;
  rejectedDate?: string;
  rejectedBy?: number | CooperativeLoanApiAuditUser;
  status?: string;
  adminComment?: string;
  applicationStage?: string;
  guarantorsId?: number;
  guarantors?: unknown[] | unknown;
  guarantorApproval?: boolean;
  guarantorApprovalStatus?: string;
  interestRate?: number;
  totalRepayable?: number;
  totalRepayment?: number;
  totalPaid?: number;
  totalPrincipalPaid?: number;
  totalInterestPaid?: number;
  totalLateFeesAccrued?: number;
  totalLateFeesPaid?: number;
  outstandingPrincipal?: number;
  outstandingInterest?: number;
  outstandingBalance?: number;
  lastPaymentReceived?: string;
  lastPaymentAmount?: number;
  nextPaymentDueDate?: string;
  skippedPaymentsCount?: number;
  overduePaymentsCount?: number;
  memberBankName?: string;
  memberAccountNumber?: string;
  principalBankName?: string;
  principalCollectionAccount?: string;
  interestBankName?: string;
  interestCollectionAccount?: string;
  lateFeeBankName?: string;
  lateFeeCollectionAccount?: string;
  accountingEmail?: string;
  accountingWebhookUrl?: string;
  gracePeriodRequests?: unknown[];
  paymentHistory?: unknown[];
  statusHistory?: unknown[];
  supportingDocuments?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  adminRequestNote?: string;
  rejectionReason?: string;
  infoRequestedDate?: string;
  defaultedDate?: string;
  fundsReserved?: boolean;
  [key: string]: unknown;
}

export interface CooperativeLoanApiCreatePayload {
  [key: string]: unknown;
}

export interface CooperativeLoanApiUpdatePayload {
  [key: string]: unknown;
}

export interface CooperativeLoanApiMemberPayload {
  [key: string]: unknown;
}

export interface CooperativeContributionHistoryApiResponse {
  id: number;
  membershipId: number;
  memberId: number;
  paymentRecordId?: number;
  groupId: number;
  contributionAmount: number;
  paymentMethod: string;
  contributionMonth: string;
  postedAt: string;
  postedBy?: CooperativeLoanApiAuditUser;
}

export interface CooperativeContributionHistoryApiPayload {
  id?: number;
  membershipId: number;
  memberId: number;
  paymentRecordId?: number;
  groupId: number;
  contributionAmount: number;
  paymentMethod: string;
  contributionMonth: string;
  postedAt: string;
  postedBy?: CooperativeLoanApiAuditUser;
}

export interface CooperativeContributionHistoryApiUpdatePayload extends Omit<CooperativeContributionHistoryApiPayload, 'postedBy'> {
  postedBy?: number;
}

export interface CooperativeGracePeriodRequestApiResponse {
  id: number;
  loanId: number;
  memberId: number;
  installmentNumber: number;
  paymentSubtype: string;
  amountPaid: number;
  remainingBalance: number;
  requestedAt: string;
  requestedDays: number;
  reason: string;
  status: string;
  reviewedAt?: string;
  reviewedBy?: CooperativeLoanApiAuditUser;
  reviewNote?: string;
  rejectionReason?: string;
  approvedGraceDays?: number;
  newDueDate?: string;
  paymentCompletedAt?: string;
}

export interface CooperativeGracePeriodRequestApiPayload {
  id?: number;
  loanId: number;
  memberId: number;
  installmentNumber: number;
  paymentSubtype: string;
  amountPaid: number;
  remainingBalance: number;
  requestedAt: string;
  requestedDays: number;
  reason: string;
  status: string;
  reviewedAt?: string;
  reviewedBy?: CooperativeLoanApiAuditUser;
  reviewNote?: string;
  rejectionReason?: string;
  approvedGraceDays?: number;
  newDueDate?: string;
  paymentCompletedAt?: string;
}

export interface CooperativeGracePeriodRequestApiUpdatePayload extends Omit<CooperativeGracePeriodRequestApiPayload, 'reviewedBy'> {
  reviewedBy?: number;
}

export interface CooperativeGroupMembershipHistoryApiResponse {
  id: number;
  membershipId: number;
  groupId: number;
  status: string;
  changedAt: string;
  changedBy?: CooperativeLoanApiAuditUser;
  notes?: string;
}

export interface CooperativeGroupMembershipHistoryApiPayload {
  id?: number;
  membershipId: number;
  groupId: number;
  status: string;
  changedAt: string;
  changedBy?: number;
  notes?: string;
}

export interface CooperativeGroupMembershipHistoryApiUpdatePayload extends Omit<CooperativeGroupMembershipHistoryApiPayload, 'changedBy'> {
  changedBy?: number;
}

export interface CooperativeGroupMembershipApiResponse {
  id: number;
  memberId: number;
  groupId: number;
  membershipId?: number;
  status: string;
  requestedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
  rejectedAt?: string;
  inactiveAt?: string;
  reviewedBy?: CooperativeLoanApiAuditUser;
  reviewNote?: string;
  rejectionReason?: string;
  totalContributed?: number;
  lastContributionAmount?: number;
  lastContributionDate?: string;
  expectedContributionDay?: number;
  membershipHistory?: CooperativeGroupMembershipHistoryApiResponse[];
}

export interface CooperativeGroupMembershipApiPayload {
  id?: number;
  memberId: number;
  groupId: number;
  membershipId?: number;
  status: string;
  requestedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
  rejectedAt?: string;
  inactiveAt?: string;
  reviewedBy?: CooperativeLoanApiAuditUser;
  reviewNote?: string;
  rejectionReason?: string;
  totalContributed?: number;
  lastContributionAmount?: number;
  lastContributionDate?: string;
  expectedContributionDay?: number;
  membershipHistory?: CooperativeGroupMembershipHistoryApiPayload[];
}

export interface CooperativeGroupMembershipApiUpdatePayload extends Omit<CooperativeGroupMembershipApiPayload, 'reviewedBy' | 'membershipHistory'> {
  reviewedBy?: number;
  membershipHistory?: CooperativeGroupMembershipHistoryApiUpdatePayload[];
}

export interface CooperativeGroupMembershipsByMemberApiResponse {
  memberships: CooperativeGroupMembershipApiResponse[];
  activeGroups: CooperativeGroupApiResponse[];
  pendingGroups: CooperativeGroupApiResponse[];
}

export interface CooperativeLoanPurposeApiResponse {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  maxLoanAmount?: number | null;
  minLoanAmount?: number | null;
  defaultInterestRate?: number | null;
  requiresDocumentation?: boolean;
  documentationTypes?: string[];
}

export interface CooperativeLoanGuarantorApiResponse {
  id: number;
  loanId?: number;
  guarantorMemberId?: number;
  guaranteedAmount?: number;
  status?: string;
  requestedAt?: string;
  respondedAt?: string;
  responseNote?: string;
}

export interface CooperativeLoanGuarantorApiPayload {
  id?: number;
  loanId: number;
  guarantorMemberId: number;
  guaranteedAmount: number;
  status: string;
  requestedAt: string;
  respondedAt?: string;
  responseNote?: string;
}

export interface CooperativeLoanDisbursementConfirmationApiResponse {
  id: number;
  loanId: number;
  disbursedAmount: number;
  memberId?: number;
  groupMembershipId?: number;
  groupName?: string;
  disbursementConfirmedAt?: string;
  disbursementConfirmedBy?: number | CooperativeLoanApiAuditUser;
  disbursementInstructionReference: string;
  disbursementReference: string;
  paymentMethod: string;
  notes?: string;
}

export interface CooperativeLoanDisbursementConfirmationApiPayload {
  id?: number;
  loanId: number;
  disbursedAmount: number;
  memberId?: number;
  groupMembershipId?: number;
  groupName?: string;
  disbursementConfirmedAt?: string;
  disbursementConfirmedBy?: number;
  disbursementInstructionReference: string;
  disbursementReference: string;
  paymentMethod: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CooperativeLoanApiService {
  private readonly apiBaseUrl = environment.apiBaseUrl || 'https://be.optimaxsuites.com';
  private readonly loansBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeLoans`;
  private readonly membersBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeMembers`;
  private readonly groupsBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeGroups`;
  private readonly contributionHistoriesBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeContributionHistories`;
  private readonly gracePeriodRequestsBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeGracePeriodRequests`;
  private readonly membershipHistoriesBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeGroupMembershipHistories`;
  private readonly groupMembershipsBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeGroupMemberships`;
  private readonly loanPurposesBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeLoanPurposes`;
  private readonly loanGuarantorsBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeLoanGuarantors`;
  private readonly disbursementConfirmationsBaseUrl = `${this.apiBaseUrl}/x/api/v2/hr/cooperativeLoanDisbursementConfirmations`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
  const token = getTokenFromStorage();
  const tenantId = this.getTenantId();
  
  console.log('[CooperativeLoanApi] Building auth headers, token exists:', !!token);
  
  let headers: Record<string, string> = {
    'X-Tenant-ID': tenantId,
    'Content-Type': 'application/json'
  };
  
  if (token) {
    // Make sure token doesn't have any prefixes already
    let cleanToken = token;
    if (cleanToken.startsWith('Bearer ')) {
      cleanToken = cleanToken.slice(7);
    }
    headers['Authorization'] = `Bearer ${cleanToken}`;
  } else {
    console.warn('[CooperativeLoanApi] No token available for request');
  }
  
  // Log headers for debugging (without exposing full token)
  console.log('[CooperativeLoanApi] Headers:', {
    'X-Tenant-ID': headers['X-Tenant-ID'],
    'Authorization': headers['Authorization'] ? 'Bearer [REDACTED]' : 'MISSING'
  });
  
  return new HttpHeaders(headers);
}

  private getTenantId(): string {
    const tenant = sessionStorage.getItem('tenantId')
      || sessionStorage.getItem('tenant')
      || localStorage.getItem('tenantId')
      || localStorage.getItem('tenant')
      || 'optimax';
    return tenant && tenant !== 'undefined' && tenant !== 'null' ? tenant : 'optimax';
  }

  private logRequest(method: string, url: string): void {
    console.log(`[CooperativeLoanApi] ${method} ${url}`);
  }

  private mapCollectionResponse<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }

    const paginatedResponse = response as {
      content?: T[];
      data?: T[] | { content?: T[]; data?: T[]; items?: T[]; results?: T[]; payload?: T[]; records?: T[]; list?: T[] };
      items?: T[];
      results?: T[];
      payload?: T[];
      records?: T[];
      list?: T[];
    } | null;
    if (paginatedResponse?.content && Array.isArray(paginatedResponse.content)) {
      return paginatedResponse.content;
    }

    if (paginatedResponse?.data && Array.isArray(paginatedResponse.data)) {
      return paginatedResponse.data;
    }

    if (paginatedResponse?.data && typeof paginatedResponse.data === 'object') {
      const nestedData = paginatedResponse.data as { content?: T[]; data?: T[] };
      if (nestedData.content && Array.isArray(nestedData.content)) {
        return nestedData.content;
      }
      if (nestedData.data && Array.isArray(nestedData.data)) {
        return nestedData.data;
      }
    }

    if (paginatedResponse?.items && Array.isArray(paginatedResponse.items)) {
      return paginatedResponse.items;
    }

    if (paginatedResponse?.results && Array.isArray(paginatedResponse.results)) {
      return paginatedResponse.results;
    }

    if (paginatedResponse?.payload && Array.isArray(paginatedResponse.payload)) {
      return paginatedResponse.payload;
    }

    if (paginatedResponse?.records && Array.isArray(paginatedResponse.records)) {
      return paginatedResponse.records;
    }

    if (paginatedResponse?.list && Array.isArray(paginatedResponse.list)) {
      return paginatedResponse.list;
    }

    if (paginatedResponse?.data && typeof paginatedResponse.data === 'object') {
      const nestedData = paginatedResponse.data as {
        content?: T[];
        data?: T[];
        items?: T[];
        results?: T[];
        payload?: T[];
        records?: T[];
        list?: T[];
      };
      if (nestedData.items && Array.isArray(nestedData.items)) {
        return nestedData.items;
      }
      if (nestedData.results && Array.isArray(nestedData.results)) {
        return nestedData.results;
      }
      if (nestedData.payload && Array.isArray(nestedData.payload)) {
        return nestedData.payload;
      }
      if (nestedData.records && Array.isArray(nestedData.records)) {
        return nestedData.records;
      }
      if (nestedData.list && Array.isArray(nestedData.list)) {
        return nestedData.list;
      }
    }

    return [];
  }

  private safeParseResponse(response: unknown): unknown {
    if (!response) {
      return response;
    }

    if (typeof response === 'object') {
      return response;
    }

    if (typeof response === 'string') {
      let cleanResponse = response.trim();
      if (!cleanResponse) {
        return [];
      }
      if (cleanResponse.charCodeAt(0) === 0xfeff) {
        cleanResponse = cleanResponse.substring(1);
      }

      try {
        return JSON.parse(cleanResponse);
      } catch (error) {
        const salvagedResponse = this.trySalvageCollectionResponse(cleanResponse);
        if (salvagedResponse) {
          console.warn('[CooperativeLoanApi] Recovered records from malformed collection response.');
          return salvagedResponse;
        }
        const parseError = error as Error;
        throw new Error(`Invalid JSON response from server: ${parseError.message}`);
      }
    }

    return response;
  }

  private trySalvageCollectionResponse(response: string): unknown[] | null {
    const arrayStart = this.findCollectionArrayStart(response);
    if (arrayStart < 0) {
      return null;
    }

    const parsedItems: unknown[] = [];
    let braceDepth = 0;
    let objectStart = -1;
    let insideString = false;
    let escaped = false;

    for (let index = arrayStart; index < response.length; index += 1) {
      const char = response[index];

      if (insideString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          insideString = false;
        }
        continue;
      }

      if (char === '"') {
        insideString = true;
        continue;
      }

      if (char === '{') {
        if (braceDepth === 0) {
          objectStart = index;
        }
        braceDepth += 1;
        continue;
      }

      if (char === '}') {
        if (braceDepth === 0) {
          continue;
        }

        braceDepth -= 1;
        if (braceDepth === 0 && objectStart >= 0) {
          const objectText = response.slice(objectStart, index + 1);
          try {
            parsedItems.push(JSON.parse(objectText));
          } catch {
            break;
          }
          objectStart = -1;
        }
      }
    }

    return parsedItems.length > 0 ? parsedItems : null;
  }

  private findCollectionArrayStart(response: string): number {
    const markers = ['"content"', '"data"', '"items"', '"results"', '"payload"', '"records"', '"list"'];

    for (const marker of markers) {
      const markerIndex = response.indexOf(marker);
      if (markerIndex < 0) {
        continue;
      }

      const bracketIndex = response.indexOf('[', markerIndex);
      if (bracketIndex >= 0) {
        return bracketIndex;
      }
    }

    return response.indexOf('[');
  }

  private handleError(error: HttpErrorResponse, context: string) {
    console.error(`[CooperativeLoanApi] Error in ${context}:`, error);
    if (error.status === 401) {
      console.warn('Authentication failed. Token may be invalid or expired.');
    }
    return throwError(() => error);
  }

  private shouldRetryCollectionFallback(error: HttpErrorResponse, requestUrl: string, fallbackUrl: string): boolean {
    if (requestUrl === fallbackUrl) {
      return false;
    }

    if (error.status >= 500) {
      return true;
    }

    // Angular reports malformed JSON responses as HttpErrorResponse with status 200 and ok=false.
    return error.status === 200 && error.ok === false;
  }

  private getWithCollectionFallback<T>(paginatedUrl: string, fallbackUrl: string, context: string): Observable<T[]> {
    const headers = this.getAuthHeaders();
    this.logRequest('GET', paginatedUrl);
    return this.http.get(paginatedUrl, { headers, responseType: 'text' }).pipe(
      map((response) => this.safeParseResponse(response)),
      map((response) => this.mapCollectionResponse<T>(response)),
      catchError((error: HttpErrorResponse) => {
        if (this.shouldRetryCollectionFallback(error, paginatedUrl, fallbackUrl)) {
          this.logRequest('GET', fallbackUrl);
          return this.http.get(fallbackUrl, { headers, responseType: 'text' }).pipe(
            map((response) => this.safeParseResponse(response)),
            map((response) => this.mapCollectionResponse<T>(response)),
            catchError((fallbackError: HttpErrorResponse) => this.handleError(fallbackError, `${context}:fallback`))
          );
        }

        return this.handleError(error, context);
      })
    );
  }

  // ==================== MEMBER ENDPOINTS ====================
  getAllMembers(): Observable<CooperativeLoanApiMemberRef[]> {
    const paginatedUrl = `${this.membersBaseUrl}?page=1&size=100`;
    return this.getWithCollectionFallback<CooperativeLoanApiMemberRef>(paginatedUrl, this.membersBaseUrl, 'getAllMembers').pipe(
      map((members) => {
        console.log(`[CooperativeLoanApi] Members received: ${members.length}`);
        return members;
      })
    );
  }

  createMember(payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    const url = `${this.membersBaseUrl}`;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeLoanApiMemberRef>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createMember'))
    );
  }

  updateMember(id: number, payload: CooperativeLoanApiMemberPayload): Observable<CooperativeLoanApiMemberRef> {
    const url = `${this.membersBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeLoanApiMemberRef>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateMember'))
    );
  }

  getMemberById(id: number): Observable<CooperativeLoanApiMemberRef> {
    const url = `${this.membersBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeLoanApiMemberRef>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (this.shouldRetryCollectionFallback(error, url, this.membersBaseUrl)) {
          return this.getAllMembers().pipe(
            map((members) => {
              const matchedMember = members.find((member) =>
                Number(member.id || 0) === id
                || Number(member.memberId || 0) === id
                || Number(member.employeeId || 0) === id
              );

              if (!matchedMember) {
                throw error;
              }

              return matchedMember;
            }),
            catchError((fallbackError: HttpErrorResponse | Error) => {
              if (fallbackError instanceof HttpErrorResponse) {
                return this.handleError(fallbackError, 'getMemberById:fallback');
              }
              return throwError(() => fallbackError);
            })
          );
        }

        return this.handleError(error, 'getMemberById');
      })
    );
  }

  // ==================== LOAN ENDPOINTS ====================
  getAllLoans(): Observable<CooperativeLoanApiResponse[]> {
    const paginatedUrl = `${this.loansBaseUrl}?page=1&size=100`;
    return this.getWithCollectionFallback<CooperativeLoanApiResponse>(paginatedUrl, this.loansBaseUrl, 'getAllLoans');
  }

  createLoan(payload: CooperativeLoanApiCreatePayload): Observable<CooperativeLoanApiResponse> {
    const url = `${this.loansBaseUrl}`;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeLoanApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createLoan'))
    );
  }

  updateLoan(id: number, payload: CooperativeLoanApiUpdatePayload): Observable<CooperativeLoanApiResponse> {
    const url = `${this.loansBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeLoanApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateLoan'))
    );
  }

  getLoanById(id: number): Observable<CooperativeLoanApiResponse> {
    const url = `${this.loansBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeLoanApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getLoanById'))
    );
  }

  // ==================== GROUP ENDPOINTS ====================
  getAllCooperativeGroups(): Observable<CooperativeGroupApiResponse[]> {
    const url = `${this.groupsBaseUrl}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<unknown>(url, { headers }).pipe(
      map((groups) => {
        const records = this.mapCollectionResponse<CooperativeGroupApiResponse>(groups);
        console.log(`[CooperativeLoanApi] Groups received: ${records.length}`);
        return records;
      }),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllCooperativeGroups'))
    );
  }

  getCooperativeGroupById(id: number): Observable<CooperativeGroupApiResponse> {
    const url = `${this.groupsBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeGroupApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getCooperativeGroupById'))
    );
  }

  // ==================== CONTRIBUTION HISTORY ENDPOINTS ====================
  getAllContributionHistories(): Observable<CooperativeContributionHistoryApiResponse[]> {
    const url = this.contributionHistoriesBaseUrl;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<unknown>(url, { headers }).pipe(
      map((response) => this.mapCollectionResponse<CooperativeContributionHistoryApiResponse>(response)),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllContributionHistories'))
    );
  }

  getContributionHistoryById(id: number): Observable<CooperativeContributionHistoryApiResponse> {
    const url = `${this.contributionHistoriesBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeContributionHistoryApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getContributionHistoryById'))
    );
  }

  createContributionHistory(payload: CooperativeContributionHistoryApiPayload): Observable<CooperativeContributionHistoryApiResponse> {
    const url = this.contributionHistoriesBaseUrl;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeContributionHistoryApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createContributionHistory'))
    );
  }

  updateContributionHistory(id: number, payload: CooperativeContributionHistoryApiUpdatePayload): Observable<CooperativeContributionHistoryApiResponse> {
    const url = `${this.contributionHistoriesBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeContributionHistoryApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateContributionHistory'))
    );
  }

  // ==================== GRACE PERIOD REQUEST ENDPOINTS ====================
  getAllGracePeriodRequests(): Observable<CooperativeGracePeriodRequestApiResponse[]> {
    const url = this.gracePeriodRequestsBaseUrl;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<unknown>(url, { headers }).pipe(
      map((response) => this.mapCollectionResponse<CooperativeGracePeriodRequestApiResponse>(response)),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllGracePeriodRequests'))
    );
  }

  getGracePeriodRequestById(id: number): Observable<CooperativeGracePeriodRequestApiResponse> {
    const url = `${this.gracePeriodRequestsBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeGracePeriodRequestApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getGracePeriodRequestById'))
    );
  }

  createGracePeriodRequest(payload: CooperativeGracePeriodRequestApiPayload): Observable<CooperativeGracePeriodRequestApiResponse> {
    const url = this.gracePeriodRequestsBaseUrl;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeGracePeriodRequestApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createGracePeriodRequest'))
    );
  }

  updateGracePeriodRequest(id: number, payload: CooperativeGracePeriodRequestApiUpdatePayload): Observable<CooperativeGracePeriodRequestApiResponse> {
    const url = `${this.gracePeriodRequestsBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeGracePeriodRequestApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateGracePeriodRequest'))
    );
  }

  // ==================== MEMBERSHIP HISTORY ENDPOINTS ====================
  getAllGroupMembershipHistories(): Observable<CooperativeGroupMembershipHistoryApiResponse[]> {
    const url = this.membershipHistoriesBaseUrl;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<unknown>(url, { headers }).pipe(
      map((response) => this.mapCollectionResponse<CooperativeGroupMembershipHistoryApiResponse>(response)),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllGroupMembershipHistories'))
    );
  }

  getGroupMembershipHistoryById(id: number): Observable<CooperativeGroupMembershipHistoryApiResponse> {
    const url = `${this.membershipHistoriesBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeGroupMembershipHistoryApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getGroupMembershipHistoryById'))
    );
  }

  createGroupMembershipHistory(payload: CooperativeGroupMembershipHistoryApiPayload): Observable<CooperativeGroupMembershipHistoryApiResponse> {
    const url = this.membershipHistoriesBaseUrl;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeGroupMembershipHistoryApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createGroupMembershipHistory'))
    );
  }

  updateGroupMembershipHistory(id: number, payload: CooperativeGroupMembershipHistoryApiUpdatePayload): Observable<CooperativeGroupMembershipHistoryApiResponse> {
    const url = `${this.membershipHistoriesBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeGroupMembershipHistoryApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateGroupMembershipHistory'))
    );
  }

  // ==================== GROUP MEMBERSHIP ENDPOINTS ====================
  getAllGroupMemberships(): Observable<CooperativeGroupMembershipApiResponse[]> {
    const url = this.groupMembershipsBaseUrl;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<unknown>(url, { headers }).pipe(
      map((response) => this.mapCollectionResponse<CooperativeGroupMembershipApiResponse>(response)),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllGroupMemberships'))
    );
  }

  getGroupMembershipById(id: number): Observable<CooperativeGroupMembershipApiResponse> {
    const url = `${this.groupMembershipsBaseUrl}/${id}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeGroupMembershipApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getGroupMembershipById'))
    );
  }

  createGroupMembership(payload: CooperativeGroupMembershipApiPayload): Observable<CooperativeGroupMembershipApiResponse> {
    const url = this.groupMembershipsBaseUrl;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeGroupMembershipApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createGroupMembership'))
    );
  }

  updateGroupMembership(id: number, payload: CooperativeGroupMembershipApiUpdatePayload): Observable<CooperativeGroupMembershipApiResponse> {
    const url = `${this.groupMembershipsBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeGroupMembershipApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateGroupMembership'))
    );
  }

  getGroupMembershipsByMember(memberId: number): Observable<CooperativeGroupMembershipsByMemberApiResponse> {
    const url = `${this.groupMembershipsBaseUrl}/member/${memberId}`;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<CooperativeGroupMembershipsByMemberApiResponse>(url, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getGroupMembershipsByMember'))
    );
  }

  // ==================== LOAN PURPOSE ENDPOINTS ====================
  getAllLoanPurposes(): Observable<CooperativeLoanPurposeApiResponse[]> {
    const url = this.loanPurposesBaseUrl;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    return this.http.get<unknown>(url, { headers }).pipe(
      map((response) => this.mapCollectionResponse<CooperativeLoanPurposeApiResponse>(response)),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getAllLoanPurposes'))
    );
  }

  // ==================== LOAN GUARANTOR ENDPOINTS ====================
  createLoanGuarantor(payload: CooperativeLoanGuarantorApiPayload): Observable<CooperativeLoanGuarantorApiResponse> {
    const url = this.loanGuarantorsBaseUrl;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeLoanGuarantorApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createLoanGuarantor'))
    );
  }

  updateLoanGuarantor(id: number, payload: CooperativeLoanGuarantorApiPayload): Observable<CooperativeLoanGuarantorApiResponse> {
    const url = `${this.loanGuarantorsBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeLoanGuarantorApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateLoanGuarantor'))
    );
  }

  // ==================== DISBURSEMENT CONFIRMATION ENDPOINTS ====================
  createDisbursementConfirmation(payload: CooperativeLoanDisbursementConfirmationApiPayload): Observable<CooperativeLoanDisbursementConfirmationApiResponse> {
    const url = this.disbursementConfirmationsBaseUrl;
    this.logRequest('POST', url);
    const headers = this.getAuthHeaders();
    return this.http.post<CooperativeLoanDisbursementConfirmationApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'createDisbursementConfirmation'))
    );
  }

  getDisbursementConfirmations(params?: { page?: number; size?: number; loanId?: number }): Observable<CooperativeLoanDisbursementConfirmationApiResponse[]> {
    const url = this.disbursementConfirmationsBaseUrl;
    this.logRequest('GET', url);
    const headers = this.getAuthHeaders();
    let httpParams = new HttpParams();
    if (params?.page !== undefined) httpParams = httpParams.set('page', String(params.page));
    if (params?.size !== undefined) httpParams = httpParams.set('size', String(params.size));
    if (params?.loanId !== undefined) httpParams = httpParams.set('loanId', String(params.loanId));

    return this.http.get<unknown>(url, { headers, params: httpParams }).pipe(
      map((response) => this.mapCollectionResponse<CooperativeLoanDisbursementConfirmationApiResponse>(response)),
      catchError((error: HttpErrorResponse) => this.handleError(error, 'getDisbursementConfirmations'))
    );
  }

  updateDisbursementConfirmation(id: number, payload: Partial<CooperativeLoanDisbursementConfirmationApiPayload>): Observable<CooperativeLoanDisbursementConfirmationApiResponse> {
    const url = `${this.disbursementConfirmationsBaseUrl}/${id}`;
    this.logRequest('PUT', url);
    const headers = this.getAuthHeaders();
    return this.http.put<CooperativeLoanDisbursementConfirmationApiResponse>(url, payload, { headers }).pipe(
      catchError((error: HttpErrorResponse) => this.handleError(error, 'updateDisbursementConfirmation'))
    );
  }
}