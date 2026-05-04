import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../ui/sharedComponent/service/environments/environment';
import { 
  AccountDTO, 
  AccountMappingDTO, 
  AccountingEventDTO, 
  AccountingTransactionDTO, 
  JournalEntryDTO, 
  JournalEntryStatus,
  TransactionReviewStatus,
  UserDTO,
  PaginationResult 
} from '../ui/domain/accounting.dto';
import { concatMap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AccountingService {
  private readonly baseUrl = `${environment.apiBaseUrl}/x/api/v2/accounting`;
  private readonly tenantId = 'optimax';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Tenant-ID': this.tenantId
    });
  }

  // ── Charts of Accounts ────────────────────────────────
  getAccounts(page: number = 0, size: number = 10): Observable<PaginationResult<AccountDTO>> {
    const params = new HttpParams().set('page', (page + 1).toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountDTO>>(`${this.baseUrl}/accounts`, { headers: this.getHeaders(), params });
  }

  getAccountById(id: number): Observable<AccountDTO> {
    return this.http.get<AccountDTO>(`${this.baseUrl}/accounts/${id}`, { headers: this.getHeaders() });
  }

  createAccount(account: Partial<AccountDTO>): Observable<AccountDTO> {
    return this.http.post<AccountDTO>(`${this.baseUrl}/accounts`, account, { headers: this.getHeaders() });
  }

  updateAccount(id: number, account: Partial<AccountDTO>): Observable<AccountDTO> {
    return this.http.put<AccountDTO>(`${this.baseUrl}/accounts/${id}`, account, { headers: this.getHeaders() });
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/accounts/${id}`, { headers: this.getHeaders() });
  }

  // ── Account Mappings ─────────────────────────────────
  getAccountMappings(page: number = 0, size: number = 10): Observable<PaginationResult<AccountMappingDTO>> {
    const params = new HttpParams().set('page', (page + 1).toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountMappingDTO>>(`${this.baseUrl}/account-mappings`, { headers: this.getHeaders(), params });
  }

  getMappingById(id: number): Observable<AccountMappingDTO> {
    return this.http.get<AccountMappingDTO>(`${this.baseUrl}/account-mappings/${id}`, { headers: this.getHeaders() });
  }

  createAccountMapping(mapping: Partial<AccountMappingDTO>): Observable<AccountMappingDTO> {
    return this.http.post<AccountMappingDTO>(`${this.baseUrl}/account-mappings`, mapping, { headers: this.getHeaders() });
  }

  updateAccountMapping(id: number, mapping: Partial<AccountMappingDTO>): Observable<AccountMappingDTO> {
    return this.http.put<AccountMappingDTO>(`${this.baseUrl}/account-mappings/${id}`, mapping, { headers: this.getHeaders() });
  }

  deleteAccountMapping(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/account-mappings/${id}`, { headers: this.getHeaders() });
  }

  approveMapping(mappingId: number): Observable<AccountMappingDTO> {
    return this.http.post<AccountMappingDTO>(
      `${this.baseUrl}/account-mappings/${mappingId}/approve`,
      {},
      { headers: this.getHeaders() }
    );
  }

  rejectMapping(mappingId: number): Observable<AccountMappingDTO> {
    return this.http.post<AccountMappingDTO>(
      `${this.baseUrl}/account-mappings/${mappingId}/reject`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // ── Accounting Events ────────────────────────────────
  getEvents(page: number = 0, size: number = 10): Observable<PaginationResult<AccountingEventDTO>> {
    const params = new HttpParams().set('page', (page + 1).toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountingEventDTO>>(`${this.baseUrl}/events`, { headers: this.getHeaders(), params });
  }

  getEventsBySource(source: string, page: number = 0, size: number = 10): Observable<PaginationResult<AccountingEventDTO>> {
    const params = new HttpParams().set('sourceModule', source).set('page', (page + 1).toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountingEventDTO>>(`${this.baseUrl}/events/bySourceModule`, { headers: this.getHeaders(), params });
  }

  createEvent(event: Partial<AccountingEventDTO>): Observable<AccountingEventDTO> {
    return this.http.post<AccountingEventDTO>(`${this.baseUrl}/events`, event, { headers: this.getHeaders() });
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${id}`, { headers: this.getHeaders() });
  }

  // ── Transactions ─────────────────────────────────────
  getTransactions(page: number = 0, size: number = 10): Observable<PaginationResult<AccountingTransactionDTO>> {
    const params = new HttpParams().set('page', (page + 1).toString()).set('size', size.toString());
    return this.http.get<PaginationResult<AccountingTransactionDTO>>(`${this.baseUrl}/transactions`, { headers: this.getHeaders(), params });
  }

  createTransaction(tx: Partial<AccountingTransactionDTO>): Observable<AccountingTransactionDTO> {
    return this.http.post<AccountingTransactionDTO>(`${this.baseUrl}/transactions`, tx, { headers: this.getHeaders() });
  }

  approveTransaction(tx: AccountingTransactionDTO): Observable<AccountingTransactionDTO> {
    return this.http.put<AccountingTransactionDTO>(
      `${this.baseUrl}/transactions/${tx.id}`, 
      { ...tx, status: TransactionReviewStatus.APPROVED }, 
      { headers: this.getHeaders() }
    );
  }

  // ── Journal Entries ──────────────────────────────────
  getJournalEntries(page: number = 0, size: number = 10): Observable<PaginationResult<JournalEntryDTO>> {
    const params = new HttpParams().set('page', (page + 1).toString()).set('size', size.toString());
    return this.http.get<PaginationResult<JournalEntryDTO>>(`${this.baseUrl}/journal-entries`, { headers: this.getHeaders(), params });
  }

  createJournalEntry(entry: Partial<JournalEntryDTO>): Observable<JournalEntryDTO> {
    return this.http.post<JournalEntryDTO>(`${this.baseUrl}/journal-entries`, entry, { headers: this.getHeaders() });
  }

  // ── Journal Entry Lines ───────────────────────────────
  getJournalLines(page: number = 0, size: number = 10, journalId?: number): Observable<PaginationResult<any>> {
    let params = new HttpParams().set('page', (page + 1).toString()).set('size', size.toString());
    if (journalId) params = params.set('journalEntryId', journalId.toString());
    return this.http.get<PaginationResult<any>>(`${this.baseUrl}/journal-entry-lines`, { headers: this.getHeaders(), params });
  }

  createJournalLine(line: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/journal-entry-lines`, line, { headers: this.getHeaders() });
  }

  // ── Ledger Entries ───────────────────────────────────
  getLedgerEntries(page: number = 0, size: number = 10, accountId?: number): Observable<PaginationResult<any>> {
    let params = new HttpParams().set('page', (page + 1).toString()).set('size', size.toString());
    if (accountId) params = params.set('accountId', accountId.toString());
    return this.http.get<PaginationResult<any>>(`${this.baseUrl}/ledger-entries`, { headers: this.getHeaders(), params });
  }

  createLedgerEntry(entry: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ledger-entries`, entry, { headers: this.getHeaders() });
  }

  // ── MASTER FLOW ORCHESTRATOR 🧠 ──────────────────────────────────────────────
  // Implements the full automation pipeline:
  // Event → Transaction → Journal Entry → Journal Lines → Ledger Entries
  orchestrateEventExecution(event: AccountingEventDTO, mapping: AccountMappingDTO, createdBy: UserDTO): Observable<any> {
    const transactionDate = new Date().toISOString();
    const createdById = createdBy?.id ?? createdBy?.userId ?? null;

    // ── Extract rich metadata for meaningful descriptions ──
    const meta = event.metadata || {};
    const memberName     = meta.memberName || meta.accountName || meta.employeeName || meta.reference || event.reference;
    const purpose        = meta.purpose     ? `[${meta.purpose}]` : '';
    const paymentMethod  = meta.modeOfPayment || meta.paymentMethod || '';
    const groupName      = meta.groupName   ? ` | Group: ${meta.groupName}` : '';
    const instructionRef = meta.instructionReference || event.reference;

    const txDescription = [
      event.description || event.eventType.replace(/_/g, ' '),
      memberName ? `— ${memberName}` : '',
      purpose,
      paymentMethod ? `(${paymentMethod})` : '',
      groupName
    ].filter(Boolean).join(' ').trim();

    const debitDescription  = `DR: ${txDescription}`;
    const creditDescription = `CR: ${txDescription}`;

    const debitAccountId  = mapping.debitAccountId  ?? mapping.debitAccount?.id;
    const creditAccountId = mapping.creditAccountId ?? mapping.creditAccount?.id;

    // ── Execute Pipeline ─────────────────────
    return this.createTransaction({
      transactionReference: instructionRef,
      sourceModule:         event.sourceModule,
      amount:               event.amount,
      currency:             event.currency || 'NGN',
      status:               TransactionReviewStatus.APPROVED,
      accountId:            debitAccountId,
      description:          txDescription,
      transactionDate:      transactionDate,
      createdBy:            createdById,
      metadata:             event.metadata
    }).pipe(
      concatMap(tx => {
        return this.createJournalEntry({
          transactionId: tx.id,
          entryDate:     transactionDate,
          description:   `Journal Entry: ${txDescription}`,
          status:        JournalEntryStatus.POSTED
        }).pipe(map(journal => ({ tx, journal })));
      }),
      concatMap(({ tx, journal }) => {
        const debitLine = {
          journalEntryId: journal.id,
          accountId:      debitAccountId,
          debitAmount:    event.amount,
          creditAmount:   0,
          description:    debitDescription,
          createdBy:      createdById
        };
        const creditLine = {
          journalEntryId: journal.id,
          accountId:      creditAccountId,
          debitAmount:    0,
          creditAmount:   event.amount,
          description:    creditDescription,
          createdBy:      createdById
        };

        return this.createJournalLine(debitLine).pipe(
          concatMap(dl => this.createJournalLine(creditLine).pipe(map(cl => ({ debitLine: dl, creditLine: cl })))),
          map(({ debitLine, creditLine }) => ({ tx, journal, debitLine, creditLine }))
        );
      }),
      concatMap(({ tx, journal, debitLine, creditLine }) => {
        // ── Posting to Ledger ─────────────────────
        // We MUST link journalEntryLineId for the backend to derive descriptions/modules
        const debitLedger = {
          accountId:            debitAccountId,
          journalEntryLineId:   debitLine.id, // CRITICAL LINK
          debit:                event.amount,
          credit:               0,
          description:          debitDescription,
          entryDate:            transactionDate,
          sourceModule:         event.sourceModule,
          transactionReference: instructionRef
        };
        const creditLedger = {
          accountId:            creditAccountId,
          journalEntryLineId:   creditLine.id, // CRITICAL LINK
          debit:                0,
          credit:               event.amount,
          description:          creditDescription,
          entryDate:            transactionDate,
          sourceModule:         event.sourceModule,
          transactionReference: instructionRef
        };

        return this.createLedgerEntry(debitLedger).pipe(
          concatMap(() => this.createLedgerEntry(creditLedger)),
          map(() => ({ success: true, transaction: tx, journal: journal }))
        );
      })
    );
  }
}
